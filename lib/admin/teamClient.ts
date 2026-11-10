// 어드민 화면에서 운영진과 역할을 부른다. 토큰이 만료됐으면 한 번 재발급하고 다시 묻는다(reviewsClient 와 같은 방식).
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import type { Member, Role, RoleInput, Team } from "@/lib/admin/team";

const API = "/api/admin/team";

async function send(url: string, init: RequestInit = {}): Promise<Response> {
  const go = () => fetch(url, { ...init, headers: { Authorization: `Bearer ${getAccessToken() ?? ""}`, ...(init.body ? { "Content-Type": "application/json" } : {}) }, cache: "no-store" });
  const res = await go();
  if (res.status === 401 && (await reissue())) return go();
  return res;
}

async function json<T>(res: Response, fallback: string): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? fallback);
  return body;
}

const SAVE_FAIL = "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.";

export async function fetchTeam(): Promise<Team> {
  return json<Team>(await send(API), "운영진을 불러오지 못했어요.");
}

export async function saveRoles(member: Pick<Member, "userId" | "updatedAt">, roleKeys: string[], onboard = false): Promise<Member> {
  return (await json<{ member: Member }>(await send(API, { method: "PUT", body: JSON.stringify({ userId: member.userId, updatedAt: member.updatedAt, roleKeys, onboard }) }), SAVE_FAIL)).member;
}

export async function createRole(input: RoleInput): Promise<Role> {
  return (await json<{ role: Role }>(await send(`${API}/roles`, { method: "POST", body: JSON.stringify(input) }), SAVE_FAIL)).role;
}

export async function updateRole(role: Pick<Role, "key" | "updatedAt">, input: RoleInput): Promise<Role> {
  return (await json<{ role: Role }>(await send(`${API}/roles`, { method: "PUT", body: JSON.stringify({ key: role.key, updatedAt: role.updatedAt, ...input }) }), SAVE_FAIL)).role;
}

export async function archiveRole(role: Pick<Role, "key" | "updatedAt">): Promise<void> {
  await json(await send(`${API}/roles`, { method: "PUT", body: JSON.stringify({ key: role.key, updatedAt: role.updatedAt, archive: true }) }), SAVE_FAIL);
}
