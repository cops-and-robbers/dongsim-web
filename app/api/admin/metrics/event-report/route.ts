import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/server/checkAdmin";
import { addDays, todayIn } from "@/lib/metrics/dates";
import { db } from "@/lib/metrics/db";
import { loadEventReport } from "@/lib/metrics/eventReportData";
import { loadServerDaily } from "@/lib/metrics/gameServer";
import { loadEvents, loadStaffAccounts } from "@/lib/metrics/staff";

/**
 * 행사 성적표 (#165).
 *
 * GET ?id=12  행사 일정 하나. 고른 행사 게임(달력에서 고른다, /api/admin/metrics/event-games)으로 만든 성적표와
 *             그날 숫자, 앞선 같은 요일 평소(다른 행사 날 제외)
 *
 * 계산은 lib/metrics/eventReport.ts, 숫자 모으기는 eventReportData.ts(챗봇도 같이 쓴다). 게임 기록은 어드민 토큰으로만 읽혀 지표 라우트처럼 그 사람의 토큰으로 읽는다
 */

async function guard(req: Request): Promise<{ token: string } | NextResponse> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const admin = await checkAdmin(token);
  if (admin === "expired") return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (admin === "denied") return NextResponse.json({ error: "어드민만 볼 수 있어요." }, { status: 403 });
  return { token };
}

const idOf = (req: Request) => {
  const id = Number(new URL(req.url).searchParams.get("id"));
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function GET(req: Request): Promise<NextResponse> {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;
  const id = idOf(req);
  if (!id) return NextResponse.json({ error: "행사를 다시 골라 주세요." }, { status: 400 });
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

    const staff = await loadStaffAccounts(client);
    const server = await loadServerDaily(apiBase, g.token, staff.map((a) => a.userId));
    const r = await loadEventReport(client, event, events ?? [], server);
    return NextResponse.json(
      { status: "ok", ...r },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
