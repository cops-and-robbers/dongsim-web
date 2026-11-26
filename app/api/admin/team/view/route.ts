import { NextResponse } from "next/server";
import { parseListView } from "@/lib/admin/listView";
import { isTeamWritable, ListViewMissing, readListView, saveListView, userIdOf } from "@/lib/admin/server/team";
import { guard, noStore } from "@/lib/event/adminApi";

/**
 * 내 목록 보기 (docs/admin-ui.md "목록 보기 고르기"). 자기 것만 읽고 고친다.
 *
 * GET               { view: "split" | "table" | null, saved }. saved 는 이 어드민에서 저장할 수 있는지(운영 어드민만)
 * PUT { view }      { view }
 */
export async function GET(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (!isTeamWritable()) return NextResponse.json({ view: null, saved: false }, noStore);
  try {
    return NextResponse.json({ view: await readListView(userIdOf(checked.token)), saved: true }, noStore);
  } catch (e) {
    console.error("[team-view] 읽기", e instanceof Error ? e.message : e);
    return NextResponse.json({ view: null, saved: false }, noStore);
  }
}

export async function PUT(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (!isTeamWritable()) return NextResponse.json({ error: "목록 보기는 운영 어드민에서만 저장돼요." }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const view = parseListView(body.view);
  if (!view) return NextResponse.json({ error: "목록 보기를 읽지 못했어요." }, { status: 400 });
  try {
    return NextResponse.json({ view: await saveListView(userIdOf(checked.token), view) }, noStore);
  } catch (e) {
    if (e instanceof ListViewMissing) return NextResponse.json({ error: "목록 보기 칸이 아직 없어요. 0029 SQL 을 실행해 주세요." }, { status: 503 });
    console.error("[team-view] 저장", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "목록 보기를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}
