import { NextResponse } from "next/server";
import { actorName } from "@/lib/admin/server/remoteConfig";
import { createRole, isTeamWritable, listRoleNames, readManager, TeamConflict, updateRole, userIdOf } from "@/lib/admin/server/team";
import { db } from "@/lib/metrics/db";
import { CARDS, isCardKey } from "@/lib/admin/overview/cards";
import { recordChange } from "@/lib/changes/server";
import { actionOf, diffList, diffValues } from "@/lib/changes/model";

// ── 변경 기록(#313) ──
type RoleRow = { name: string; description: string; cards: string[] };
const readRoleRow = async (key: string): Promise<RoleRow | null> => {
  const { data } = await db().from("admin_roles").select("name, description, cards").eq("key", key).maybeSingle();
  return (data as RoleRow | null) ?? null;
};
const cardNames = (keys: string[]) => keys.map((k) => (isCardKey(k) ? CARDS[k].title : k));
async function recordRole(actor: string, before: RoleRow | null, after: RoleRow | null): Promise<void> {
  const r = after ?? before;
  if (!r) return;
  const text = (x: RoleRow | null) => x && { name: x.name, description: x.description };
  const fields = diffValues(text(before), text(after), { name: "이름", description: "설명" });
  const cards = diffList("개요 기본 카드", cardNames(before?.cards ?? []), cardNames(after?.cards ?? []));
  if (cards && before && after) fields.push(cards);
  await recordChange({ actor, area: "team", target: `역할 ${r.name}`, action: actionOf(before, after), fields, href: "/admin/team" });
}

import { cardsProblem } from "@/lib/admin/overview/cards";
import { isBuiltin, newRoleKey, roleProblem, type RoleInput } from "@/lib/admin/team";
import { guard, noStore } from "@/lib/event/adminApi";

/**
 * 어드민 역할 목록 (docs/admin-ui.md "운영진"). 운영 역할을 맡은 분만 고친다.
 *
 * POST { name, description, icon, cards }                { role }
 * PUT  { key, updatedAt, name, description, icon, cards } { role }. cards 는 개요 기본 카드 키, 8칸까지
 * PUT  { key, updatedAt, archive: true }                  { ok: true }. 처음부터 있던 역할은 지울 수 없다
 */
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });
const failed = (e: unknown) => {
  if (e instanceof TeamConflict) return NextResponse.json({ error: "다른 분이 먼저 고쳤어요. 새로 불러온 뒤 다시 고쳐 주세요." }, { status: 409 });
  console.error("[team-roles]", e instanceof Error ? e.message : e);
  return NextResponse.json({ error: "역할을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
};

const inputOf = (b: Record<string, unknown>): RoleInput | null =>
  typeof b.name === "string" && typeof b.description === "string" && typeof b.icon === "string" && Array.isArray(b.cards) && b.cards.every((c) => typeof c === "string")
    ? { name: b.name, description: b.description, icon: b.icon, cards: b.cards as string[] }
    : null;

async function allowed(req: Request): Promise<{ token: string; body: Record<string, unknown> } | NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (!isTeamWritable()) return NextResponse.json({ error: "역할은 운영 어드민에서만 저장돼요." }, { status: 403 });
  if (!(await readManager(userIdOf(checked.token)).catch(() => false))) return NextResponse.json({ error: "역할 목록은 운영 역할을 맡은 분이 고칠 수 있어요." }, { status: 403 });
  return { token: checked.token, body: (await req.json().catch(() => ({}))) as Record<string, unknown> };
}

export async function POST(req: Request): Promise<NextResponse> {
  const ok = await allowed(req);
  if (ok instanceof NextResponse) return ok;
  const input = inputOf(ok.body);
  if (!input) return bad("역할 내용을 읽지 못했어요.");
  try {
    const problem = roleProblem(input, await listRoleNames(), false) ?? cardsProblem(input.cards);
    if (problem) return bad(problem);
    const actor = await actorName(ok.token);
    const role = await createRole(newRoleKey(Date.now()), input, actor);
    await recordRole(actor, null, role);
    return NextResponse.json({ role }, noStore);
  } catch (e) {
    return failed(e);
  }
}

export async function PUT(req: Request): Promise<NextResponse> {
  const ok = await allowed(req);
  if (ok instanceof NextResponse) return ok;
  const { key, updatedAt, archive } = ok.body;
  if (typeof key !== "string" || typeof updatedAt !== "string") return bad("어느 역할인지 알 수 없어요.");
  try {
    if (archive === true) {
      if (isBuiltin(key)) return bad("처음부터 있던 역할은 지울 수 없어요.");
      const actor = await actorName(ok.token);
      const before = await readRoleRow(key);
      await updateRole(key, updatedAt, null, actor);
      await recordRole(actor, before, null);
      return NextResponse.json({ ok: true }, noStore);
    }
    const input = inputOf(ok.body);
    if (!input) return bad("역할 내용을 읽지 못했어요.");
    const problem = roleProblem(input, (await listRoleNames()).filter((r) => r.key !== key), isBuiltin(key)) ?? cardsProblem(input.cards);
    if (problem) return bad(problem);
    // 처음부터 있던 역할은 그림이 정해져 있어 아이콘을 바꾸지 않는다
    const actor = await actorName(ok.token);
    const before = await readRoleRow(key);
    const role = await updateRole(key, updatedAt, isBuiltin(key) ? { ...input, icon: key } : input, actor);
    if (role) await recordRole(actor, before, role);
    return NextResponse.json({ role }, noStore);
  } catch (e) {
    return failed(e);
  }
}
