/**
 * 어드민 운영진과 역할의 읽기와 저장 (docs/admin-ui.md "운영진"). 서버 전용이다.
 */
import { db } from "@/lib/metrics/db";
import { canManage, cleanKeys, type Member, type Role, type RoleInput, type Team } from "@/lib/admin/team";

const ROLES = "admin_roles";
const MEMBERS = "admin_members";
const ROLE_COLUMNS = "key,name,description,icon,cards,position,updated_by,updated_at";
const MEMBER_COLUMNS = "user_id,nickname,role_keys,onboarded_at,last_seen_at,updated_at";

type RoleRow = { key: string; name: string; description: string; icon: string; cards: string[]; position: number; updated_by: string; updated_at: string };
type MemberRow = { user_id: string; nickname: string; role_keys: string[]; onboarded_at: string | null; last_seen_at: string; updated_at: string };

const toRole = (r: RoleRow): Role => ({ key: r.key, name: r.name, description: r.description, icon: r.icon, cards: r.cards ?? [], position: r.position, updatedBy: r.updated_by, updatedAt: r.updated_at });
const toMember = (r: MemberRow, roles: Role[]): Member => ({ userId: r.user_id, nickname: r.nickname, roleKeys: cleanKeys(r.role_keys ?? [], roles), onboardedAt: r.onboarded_at, lastSeenAt: r.last_seen_at, updatedAt: r.updated_at });

export class TeamConflict extends Error {}

export const isTeamWritable = () => process.env.VERCEL_ENV === "production";

/** 토큰의 사용자 번호. 화면이 보낸 번호는 믿지 않는다. guard 를 통과한 토큰에만 쓴다 */
export function userIdOf(token: string): string {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()) as { sub?: unknown };
    return String(payload.sub ?? "");
  } catch {
    return "";
  }
}

async function readRoles(): Promise<Role[]> {
  const { data, error } = await db().from(ROLES).select(ROLE_COLUMNS).is("archived_at", null).order("position").order("updated_at");
  if (error) throw new Error(error.message);
  return ((data ?? []) as RoleRow[]).map(toRole);
}

/** 읽으면서 들어온 사람을 구성원에 남긴다. 운영 배포에서만 쓴다 */
export async function readTeam(me: { id: string; nickname: string }): Promise<Team> {
  const writable = isTeamWritable();
  try {
    if (writable && me.id) {
      const { error } = await db().from(MEMBERS).upsert({ user_id: me.id, nickname: me.nickname, last_seen_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
    }
    const roles = await readRoles();
    const { data, error } = await db().from(MEMBERS).select(MEMBER_COLUMNS).order("last_seen_at", { ascending: false });
    if (error) throw new Error(error.message);
    const members = ((data ?? []) as MemberRow[]).map((r) => toMember(r, roles));
    const mine = members.find((m) => m.userId === me.id) ?? { userId: me.id, nickname: me.nickname, roleKeys: [], onboardedAt: null, lastSeenAt: new Date().toISOString(), updatedAt: "" };
    return { me: mine, members, roles, writable, canManage: canManage(mine.roleKeys, members), readOnlyReason: writable ? undefined : "역할은 운영 어드민에서만 저장돼요." };
  } catch (e) {
    console.error("[team] 읽기", e instanceof Error ? e.message : e);
    const empty: Member = { userId: me.id, nickname: me.nickname, roleKeys: [], onboardedAt: null, lastSeenAt: "", updatedAt: "" };
    return { me: empty, members: [], roles: [], writable: false, canManage: false, readOnlyReason: "운영진 표가 아직 없어요. 0024 SQL 을 실행해 주세요." };
  }
}

/** 화면이 읽은 뒤 다른 사람이 고쳤으면 덮어쓰지 않는다 */
export async function saveMemberRoles(userId: string, updatedAt: string, roleKeys: string[], onboard: boolean, actor: string): Promise<Member> {
  const roles = await readRoles();
  const now = new Date().toISOString();
  const { data, error } = await db()
    .from(MEMBERS)
    .update({ role_keys: cleanKeys(roleKeys, roles), updated_by: actor, updated_at: now, ...(onboard ? { onboarded_at: now } : {}) })
    .match({ user_id: userId, updated_at: updatedAt })
    .select(MEMBER_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new TeamConflict();
  return toMember(data as MemberRow, roles);
}

export async function readManager(id: string): Promise<boolean> {
  const { data, error } = await db().from(MEMBERS).select("user_id,role_keys");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Pick<MemberRow, "user_id" | "role_keys">[];
  const mine = rows.find((r) => r.user_id === id)?.role_keys ?? [];
  return canManage(mine, rows.map((r) => ({ roleKeys: r.role_keys ?? [] })));
}

export async function listRoleNames(): Promise<Pick<Role, "key" | "name">[]> {
  return (await readRoles()).map((r) => ({ key: r.key, name: r.name }));
}

export async function createRole(key: string, input: RoleInput, actor: string): Promise<Role> {
  const position = (await readRoles()).length;
  const { data, error } = await db()
    .from(ROLES)
    .insert({ key, name: input.name.trim(), description: input.description.trim(), icon: input.icon, position, updated_by: actor })
    .select(ROLE_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toRole(data as RoleRow);
}

export async function updateRole(key: string, updatedAt: string, input: RoleInput | null, actor: string): Promise<Role | null> {
  const now = new Date().toISOString();
  const patch = input ? { name: input.name.trim(), description: input.description.trim(), icon: input.icon } : { archived_at: now };
  const { data, error } = await db()
    .from(ROLES)
    .update({ ...patch, updated_by: actor, updated_at: now })
    .match({ key, updated_at: updatedAt })
    .is("archived_at", null)
    .select(ROLE_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new TeamConflict();
  return input ? toRole(data as RoleRow) : null;
}
