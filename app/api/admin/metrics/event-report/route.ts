import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/server/checkAdmin";
import { DATA_FROM } from "@/lib/metrics/chat/periods";
import { loadDashboard, type DailyPoint } from "@/lib/metrics/dashboard/data";
import type { Source } from "@/lib/metrics/dashboard/sources";
import { addDays, todayIn } from "@/lib/metrics/dates";
import { db } from "@/lib/metrics/db";
import { baselineDays, buildEventReport, type MetricSource } from "@/lib/metrics/eventReport";
import { loadServerDaily } from "@/lib/metrics/gameServer";
import { loadEvents, loadStaffAccounts } from "@/lib/metrics/staff";

/**
 * 행사 성적표 (#165). GET ?id=12 (행사 일정 id)
 *
 * 그 행사의 게임(일정의 시간과 장소로 찾은 판)과, 그날 숫자를 앞선 같은 요일 평소(다른 행사 날 제외)와 나란히 준다.
 * 계산은 lib/metrics/eventReport.ts. 게임 기록은 어드민 토큰으로만 읽혀 지표 라우트처럼 그 사람의 토큰으로 읽는다
 */

export async function GET(req: Request): Promise<NextResponse> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const admin = await checkAdmin(token);
  if (admin === "expired") return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (admin === "denied") return NextResponse.json({ error: "어드민만 볼 수 있어요." }, { status: 403 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "행사를 다시 골라 주세요." }, { status: 400 });
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBase) return NextResponse.json({ error: "백엔드 주소가 없어 게임 기록을 못 읽어요." }, { status: 500 });

  try {
    const client = db();
    const events = await loadEvents(client);
    const event = events?.find((e) => e.id === id);
    if (!event || event.category !== "event") return NextResponse.json({ error: "행사 일정을 찾지 못했어요." }, { status: 404 });
    // 오늘 숫자는 아직 다 안 들어왔다. 어제까지 끝난 행사만 본다
    const yesterday = addDays(todayIn("Asia/Seoul"), -1);
    if (event.day > yesterday) return NextResponse.json({ status: "upcoming", event }, { headers: { "Cache-Control": "no-store" } });

    const eventDays = new Set((events ?? []).filter((e) => e.category === "event").map((e) => e.day));
    const baseline = baselineDays(event.day, eventDays, DATA_FROM);
    const from = baseline.at(-1) ?? event.day;
    const [d, staff] = await Promise.all([loadDashboard(client, { start: from, end: event.day }), loadStaffAccounts(client)]);
    const server = await loadServerDaily(apiBase, token, staff.map((a) => a.userId));

    const byDay = new Map(d.daily.map((p) => [p.day, p]));
    const has = (s: Source, day: string) => !!d.since[s] && !!d.freshness[s] && day >= d.since[s]! && day <= d.freshness[s]!;
    const col = (s: Source, pick: (p: DailyPoint) => number) => (day: string) => {
      const p = byDay.get(day);
      return p && has(s, day) ? pick(p) : null;
    };
    const srv = (pick: (r: { games: number; signups: number; newPlayers: number }) => number) => (day: string) =>
      server.error ? null : pick(server.daily.get(day) ?? { games: 0, signups: 0, newPlayers: 0 });
    const sources: MetricSource[] = [
      {
        key: "store_new",
        label: "스토어 최초 설치",
        unit: "명",
        // App Store 는 다음 날, Google Play 는 3~7일 늦게 들어온다. Play 가 아직이면 App Store 만 더하고 덜 들어왔다고 적는다
        of: (day) => {
          const a = col("appstore", (p) => p.appStoreNew)(day);
          const p = col("play", (x) => x.playInstalls)(day);
          return a === null && p === null ? null : (a ?? 0) + (p ?? 0);
        },
        pending: (day) => !d.freshness.play || day > d.freshness.play,
      },
      { key: "first_open", label: "앱 첫 실행", unit: "회", of: col("ga4app", (p) => p.firstOpenAndroid + p.firstOpenIos) },
      { key: "link", label: "QR, 다운로드 링크로 스토어 이동", unit: "회", of: col("ga4web", (p) => p.downloadLinkClicks) },
      { key: "signups", label: "가입", unit: "명", of: srv((r) => r.signups) },
      { key: "new_players", label: "첫 게임을 한 새 가입자", unit: "명", of: srv((r) => r.newPlayers) },
      { key: "games", label: "그날 진행된 게임(운영진끼리 한 판 제외)", unit: "판", of: srv((r) => r.games) },
    ];
    const report = buildEventReport(event, server.games, sources, baseline);
    return NextResponse.json({ status: "ok", report, gamesError: server.error }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
