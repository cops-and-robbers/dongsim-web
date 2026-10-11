import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/server/checkAdmin";
import { todayIn } from "@/lib/metrics/dates";
import { db } from "@/lib/metrics/db";
import { dayGames } from "@/lib/metrics/eventReport";
import { loadServerDaily } from "@/lib/metrics/gameServer";
import { loadEventGames, loadEvents, loadStaffAccounts, saveEventGames } from "@/lib/metrics/staff";

/**
 * 행사 게임 고르기 (#165). 일정 달력에서 행사 날을 누르면 그날 게임 중 우리 행사 게임을 고른다.
 *
 * GET ?id=12  그날 게임(시작 시각, 인원, 장소 글자)과 장소(지도 핀), 고른 게임.
 *             아직 고르지 않았으면 행사 시간 안에 시작한 게임이 suggested 로 온다(화면이 미리 체크)
 * PUT ?id=12 { gameIds: ["301", ...] }  통째로 바꾼다
 *
 * 게임 기록은 어드민 토큰으로만 읽혀 그 사람의 토큰으로 읽는다. 사람을 알아볼 id 는 내려보내지 않는다
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
    const event = (await loadEvents(client))?.find((e) => e.id === id);
    if (!event || event.category !== "event") return NextResponse.json({ error: "행사 일정을 찾지 못했어요." }, { status: 404 });
    if (event.day > todayIn("Asia/Seoul")) return NextResponse.json({ status: "upcoming" }, { headers: { "Cache-Control": "no-store" } });
    const [staff, picked] = await Promise.all([loadStaffAccounts(client), loadEventGames(client, id)]);
    const server = await loadServerDaily(apiBase, g.token, staff.map((a) => a.userId));
    if (server.error) return NextResponse.json({ error: `게임 기록을 못 읽었어요 (${server.error})` }, { status: 502 });
    const { places, games } = dayGames(event, server.games);
    return NextResponse.json(
      // picked 가 null 이면 0008 마이그레이션 전이라 고른 게임을 저장할 곳이 없다
      { status: "ok", places, games, picked: picked ? [...picked] : null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request): Promise<NextResponse> {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;
  const id = idOf(req);
  if (!id) return NextResponse.json({ error: "행사를 다시 골라 주세요." }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as { gameIds?: unknown };
  const ids = Array.isArray(body.gameIds) ? body.gameIds.map(String) : null;
  if (!ids || ids.length > 200 || ids.some((x) => !/^\d{1,19}$/.test(x))) return NextResponse.json({ error: "고른 게임을 다시 확인해 주세요." }, { status: 400 });
  try {
    const client = db();
    const event = (await loadEvents(client))?.find((e) => e.id === id);
    if (!event || event.category !== "event") return NextResponse.json({ error: "행사 일정을 찾지 못했어요." }, { status: 404 });
    await saveEventGames(client, id, [...new Set(ids)]);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const missing = /metrics_event_games|does not exist|schema cache/i.test(message);
    return NextResponse.json({ error: missing ? "행사 게임 표가 아직 없어요. 0008 마이그레이션을 실행해 주세요." : message }, { status: missing ? 503 : 500 });
  }
}
