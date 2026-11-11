import { NextResponse } from "next/server";
import { actorName } from "@/lib/admin/server/remoteConfig";
import { isTeamWritable, listRoleNames, readManager, readTeam, saveMemberRoles, TeamConflict, userIdOf } from "@/lib/admin/server/team";
import { db } from "@/lib/metrics/db";
import { recordChange } from "@/lib/changes/server";
import { diffList } from "@/lib/changes/model";
import { guard, noStore } from "@/lib/event/adminApi";

/**
 * 어드민 운영진 (docs/admin-ui.md "운영진").
 *
 * GET                                          Team. 읽으면서 들어온 사람을 구성원에 남긴다
 * PUT  { userId, updatedAt, roleKeys, onboard? } { member }. 자기 역할은 누구나, 남의 역할은 운영 역할만
 */
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function GET(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  const id = userIdOf(checked.token);
  return NextResponse.json(await readTeam({ id, nickname: await actorName(checked.token) }), noStore);
}

export async function PUT(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (!isTeamWritable()) return NextResponse.json({ error: "역할은 운영 어드민에서만 저장돼요." }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const { userId, updatedAt, roleKeys, onboard } = body;
  if (typeof userId !== "string" || typeof updatedAt !== "string" || !Array.isArray(roleKeys) || !roleKeys.every((k) => typeof k === "string")) return bad("누구의 역할인지 알 수 없어요.");
  const me = userIdOf(checked.token);
  try {
    if (userId !== me && !(await readManager(me))) return NextResponse.json({ error: "다른 분의 역할은 운영 역할을 맡은 분이 고칠 수 있어요." }, { status: 403 });
    const actor = await actorName(checked.token);
    const { data: prev } = await db().from("admin_members").select("role_keys").eq("user_id", userId).maybeSingle();
    const member = await saveMemberRoles(userId, updatedAt, roleKeys as string[], onboard === true && userId === me, actor);
    // 변경 기록(#313). 맡은 역할을 이름으로 더하고 뺀 것만 남긴다
    const names = new Map((await listRoleNames().catch(() => [])).map((r) => [r.key, r.name]));
    const named = (keys: string[]) => keys.map((k) => names.get(k) ?? k);
    const field = diffList("맡은 일", named((prev?.role_keys as string[] | undefined) ?? []), named(member.roleKeys));
    if (field) await recordChange({ actor, area: "team", target: `${member.nickname} 님의 역할`, action: "edit", fields: [field], href: "/admin/team" });
    return NextResponse.json({ member }, noStore);
  } catch (e) {
    if (e instanceof TeamConflict) return NextResponse.json({ error: "다른 분이 먼저 고쳤어요. 새로 불러온 뒤 다시 골라 주세요." }, { status: 409 });
    console.error("[team] 저장", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "역할을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}
