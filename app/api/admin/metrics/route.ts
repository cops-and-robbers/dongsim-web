import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/server/checkAdmin";
import { loadDashboard } from "@/lib/metrics/dashboard/data";
import { compareError, compareRange, parseCompare } from "@/lib/metrics/dashboard/calendar";
import { loadGames } from "@/lib/metrics/dashboard/games";
import { addDays, todayIn, ymdRange } from "@/lib/metrics/dates";
import { db } from "@/lib/metrics/db";

/**
 * 어드민 지표 화면의 데이터 (#145).
 *
 * 지표 테이블은 service role 로만 읽히고, 그 키를 브라우저에 내려보낼 수 없다.
 * 이 라우트가 어드민 토큰을 백엔드에 물어 확인한 뒤 대신 읽어 내려준다
 * (/api/admin/blog-sync 와 같은 확인 방식).
 *
 * ?days=7|28|91 - 어제(한국 날짜)까지 그만큼. 그 앞 같은 길이와 비교한다.
 * 28, 91 은 4주, 13주라 기간마다 요일 수가 같다. 주말에 몰리는 숫자를 이전 기간과 공평하게 비교한다.
 * ?from=YYYY-MM-DD&to=YYYY-MM-DD - 직접 고른 기간(화면의 달력). 어제까지, 최대 366일.
 * &cmp=dow|off|YYYY-MM-DD - 비교 기간(#152). 없으면 바로 앞 같은 길이, dow 는 요일 맞춤, 날짜는 그날부터 같은 길이
 */

const DAYS = new Set([7, 28, 91]);
const MAX_DAYS = 366;
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (s: string | null): s is string => !!s && YMD.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);

export async function GET(req: Request): Promise<NextResponse> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const admin = await checkAdmin(token);
  // 만료는 401 로 돌려줘야 화면이 재발급하고 다시 묻는다
  if (admin === "expired") return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (admin === "denied") return NextResponse.json({ error: "어드민만 볼 수 있어요." }, { status: 403 });

  const q = new URL(req.url).searchParams;
  // 오늘은 아직 숫자가 다 안 들어왔다. 어제까지 본다
  const yesterday = addDays(todayIn("Asia/Seoul"), -1);
  let range: { start: string; end: string };
  if (q.has("from") || q.has("to")) {
    const from = q.get("from");
    const to = q.get("to");
    if (!isDay(from) || !isDay(to)) return NextResponse.json({ error: "날짜는 2026-09-23 처럼 적어요." }, { status: 400 });
    if (from > to) return NextResponse.json({ error: "시작일이 종료일보다 늦어요." }, { status: 400 });
    if (to > yesterday) return NextResponse.json({ error: "오늘 숫자는 아직 다 안 들어와서 어제까지만 볼 수 있어요." }, { status: 400 });
    if (ymdRange(from, to).length > MAX_DAYS) return NextResponse.json({ error: "한 번에 1년(366일)까지 볼 수 있어요." }, { status: 400 });
    range = { start: from, end: to };
  } else {
    const days = Number(q.get("days") ?? 28);
    if (!DAYS.has(days)) return NextResponse.json({ error: "기간은 7일, 4주, 13주 중에 골라요." }, { status: 400 });
    range = { start: addDays(yesterday, -(days - 1)), end: yesterday };
  }
  const cmp = parseCompare(q.get("cmp"));
  const cmpError = compareError({ from: range.start, to: range.end }, cmp, "2026-04-01");
  if (cmpError) return NextResponse.json({ error: cmpError }, { status: 400 });
  const c = compareRange({ from: range.start, to: range.end }, cmp);
  const previous = { start: c.from, end: c.to };
  try {
    // 실제 판 수는 백엔드 게임 기록에만 있고 어드민 토큰으로만 읽힌다(games.ts). 지표와 동시에 읽는다
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    const [data, games] = await Promise.all([
      loadDashboard(db(), range, previous),
      apiBase ? loadGames(apiBase, token, range, previous) : Promise.resolve(null),
    ]);
    return NextResponse.json({ ...data, games }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
