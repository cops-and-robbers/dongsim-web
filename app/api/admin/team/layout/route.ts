import { NextResponse } from "next/server";
import { cardsProblem } from "@/lib/admin/overview/cards";
import { isTeamWritable, LayoutMissing, saveLayout, userIdOf } from "@/lib/admin/server/team";
import { guard, noStore } from "@/lib/event/adminApi";

/**
 * 내 개요 구성 (docs/admin-ui.md "내 개요 구성"). 자기 것만 고친다.
 *
 * PUT { cards: string[] | null, roleKeys: string[] }   { member }. cards 가 null 이면 역할 기본값으로 돌아간다
 */
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function PUT(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (!isTeamWritable()) return NextResponse.json({ error: "개요 구성은 운영 어드민에서만 저장돼요." }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const { cards, roleKeys } = body;
  const list = cards === null ? null : Array.isArray(cards) && cards.every((c) => typeof c === "string") ? (cards as string[]) : undefined;
  if (list === undefined || !Array.isArray(roleKeys) || !roleKeys.every((k) => typeof k === "string")) return bad("구성을 읽지 못했어요.");
  const problem = list && cardsProblem(list);
  if (problem) return bad(problem);
  try {
    return NextResponse.json({ member: await saveLayout(userIdOf(checked.token), list, roleKeys as string[]) }, noStore);
  } catch (e) {
    if (e instanceof LayoutMissing) return NextResponse.json({ error: "개요 구성 칸이 아직 없어요. 0025 SQL 을 실행해 주세요." }, { status: 503 });
    console.error("[team-layout]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "구성을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}
