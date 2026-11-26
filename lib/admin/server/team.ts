/**
 * 어드민 운영진과 역할의 읽기와 저장 (docs/admin-ui.md "운영진"). 서버 전용이다.
 */
import { db } from "@/lib/metrics/db";
import { canManage, cleanKeys, type Member, type Role, type RoleInput, type Team } from "@/lib/admin/team";
import { parseListView, type ListView } from "@/lib/admin/listView";

const ROLES = "admin_roles";
const MEMBERS = "admin_members";
const ROLE_COLUMNS = "key,name,description,icon,cards,position,updated_by,updated_at";
const MEMBER_COLUMNS = "user_id,nickname,role_keys,onboarded_at,last_seen_at,updated_at";
const LAYOUT_COLUMNS = `${MEMBER_COLUMNS},overview_cards,overview_roles`;
/** 0025 SQL 을 실행하기 전이면 구성 칸이 없다. 그때도 운영진 화면은 그대로 보여 준다 */
const noLayout = (message: string) => /overview_(cards|roles)/.test(message);

type RoleRow = { key: string; name: string; description: string; icon: string; cards: string[]; position: number; updated_by: string; updated_at: string };
type MemberRow = { user_id: string; nickname: string; role_keys: string[]; onboarded_at: string | null; last_seen_at: string; updated_at: string; overview_cards?: string[] | null; overview_roles?: string[] | null };

const toRole = (r: RoleRow): Role => ({ key: r.key, name: r.name, description: r.description, icon: r.icon, cards: r.cards ?? [], position: r.position, updatedBy: r.updated_by, updatedAt: r.updated_at });
const toMember = (r: MemberRow, roles: Role[]): Member => ({ userId: r.user_id, nickname: r.nickname, roleKeys: cleanKeys(r.role_keys ?? [], roles), onboardedAt: r.onboarded_at, lastSeenAt: r.last_seen_at, updatedAt: r.updated_at, overviewCards: r.overview_cards ?? null, overviewRoles: r.overview_roles ?? null });

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
    const read = (columns: string) => db().from(MEMBERS).select(columns).order("last_seen_at", { ascending: false });
    let layoutReady = true;
    let res = await read(LAYOUT_COLUMNS);
    if (res.error && noLayout(res.error.message)) {
      layoutReady = false;
      res = await read(MEMBER_COLUMNS);
    }
    if (res.error) throw new Error(res.error.message);
    const members = ((res.data ?? []) as unknown as MemberRow[]).map((r) => toMember(r, roles));
    const mine = members.find((m) => m.userId === me.id) ?? { userId: me.id, nickname: me.nickname, roleKeys: [], onboardedAt: null, lastSeenAt: new Date().toISOString(), updatedAt: "", overviewCards: null, overviewRoles: null };
    return { me: mine, members, roles, writable, canManage: canManage(mine.roleKeys, members), layoutReady, readOnlyReason: writable ? undefined : "역할은 운영 어드민에서만 저장돼요." };
  } catch (e) {
    console.error("[team] 읽기", e instanceof Error ? e.message : e);
    const empty: Member = { userId: me.id, nickname: me.nickname, roleKeys: [], onboardedAt: null, lastSeenAt: "", updatedAt: "", overviewCards: null, overviewRoles: null };
    return { me: empty, members: [], roles: [], writable: false, canManage: false, layoutReady: false, readOnlyReason: "운영진 표가 아직 없어요. 0024 SQL 을 실행해 주세요." };
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
  return withLayout(toMember(data as MemberRow, roles));
}

/** 역할을 바꾼 뒤 돌려줄 때 구성 칸도 같이 채운다. 칸이 없으면 비운 채로 둔다 */
async function withLayout(m: Member): Promise<Member> {
  const { data, error } = await db().from(MEMBERS).select("overview_cards,overview_roles").eq("user_id", m.userId).maybeSingle();
  if (error || !data) return m;
  const r = data as Pick<MemberRow, "overview_cards" | "overview_roles">;
  return { ...m, overviewCards: r.overview_cards ?? null, overviewRoles: r.overview_roles ?? null };
}

export class LayoutMissing extends Error {}

/** 내 개요 구성. 나만 고치므로 다른 사람과 부딪히지 않는다. cards 가 null 이면 역할 기본값으로 돌아간다 */
export async function saveLayout(userId: string, cards: string[] | null, roleKeys: string[]): Promise<Member> {
  const roles = await readRoles();
  const { data, error } = await db()
    .from(MEMBERS)
    .update({ overview_cards: cards, overview_roles: cards ? cleanKeys(roleKeys, roles) : null })
    .eq("user_id", userId)
    .select(LAYOUT_COLUMNS)
    .maybeSingle();
  if (error) throw noLayout(error.message) ? new LayoutMissing() : new Error(error.message);
  if (!data) throw new Error("구성원을 찾지 못했어요.");
  return toMember(data as unknown as MemberRow, roles);
}

export class ListViewMissing extends Error {}
/** 0029 SQL 을 실행하기 전이면 목록 보기 칸이 없다 */
const noListView = (message: string) => /list_view/.test(message);

/** 내가 고른 목록 보기(docs/admin-ui.md "목록 보기 고르기"). 고른 적 없거나 칸이 아직 없으면 null */
export async function readListView(userId: string): Promise<ListView | null> {
  const { data, error } = await db().from(MEMBERS).select("list_view").eq("user_id", userId).maybeSingle();
  if (error) {
    if (noListView(error.message)) return null;
    throw new Error(error.message);
  }
  return parseListView((data as { list_view?: unknown } | null)?.list_view);
}

/** 내 목록 보기. 나만 고치므로 다른 사람과 부딪히지 않는다 */
export async function saveListView(userId: string, view: ListView): Promise<ListView> {
  const { data, error } = await db().from(MEMBERS).update({ list_view: view }).eq("user_id", userId).select("list_view").maybeSingle();
  if (error) throw noListView(error.message) ? new ListViewMissing() : new Error(error.message);
  if (!data) throw new Error("구성원을 찾지 못했어요.");
  return parseListView((data as { list_view?: unknown }).list_view) ?? view;
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
    .insert({ key, name: input.name.trim(), description: input.description.trim(), icon: input.icon, cards: input.cards, position, updated_by: actor })
    .select(ROLE_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toRole(data as RoleRow);
}

export async function updateRole(key: string, updatedAt: string, input: RoleInput | null, actor: string): Promise<Role | null> {
  const now = new Date().toISOString();
  const patch = input ? { name: input.name.trim(), description: input.description.trim(), icon: input.icon, cards: input.cards } : { archived_at: now };
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
