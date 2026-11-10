// 로컬에서 운영진과 역할을 보는 가짜 값. Supabase 에 닿지 않는다.
// 새로고침해도 고른 역할이 남도록 브라우저에 둔다. 지우면 첫 로그인 화면을 다시 볼 수 있다.
import { cardsProblem } from "@/lib/admin/overview/cards";
import { canManage, cleanKeys, isBuiltin, newRoleKey, type Member, type Role, type RoleInput, type Team } from "@/lib/admin/team";

const KEY = "mock_admin_team";
const ME = "1";
const at = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();
const role = (key: string, name: string, description: string, cards: string[], position: number): Role => ({ key, name, description, icon: key, cards, position, updatedBy: "", updatedAt: "2026-11-10T00:00:00.000Z" });
const member = (userId: string, nickname: string, roleKeys: string[], seen: number): Member => ({ userId, nickname, roleKeys, onboardedAt: at(30), lastSeenAt: at(seen), updatedAt: at(30) });

type Store = { roles: Role[]; members: Member[] };

const initial = (): Store => ({
  roles: [role("dev", "개발", "출시, 안정성, 버그", ["crash", "anr", "rel", "bug"], 0), role("des", "디자인", "프레임, 스토어 이미지", ["frame", "draft", "post", "views"], 1), role("mkt", "마케팅", "유입, 스토어, 인스타", ["fun", "newu", "ig", "site"], 2), role("ops", "운영", "행사, 신고, 고객 응대", ["rep", "ev", "ret", "chk"], 3)],
  members: [
    { userId: ME, nickname: "테스터", roleKeys: [], onboardedAt: null, lastSeenAt: at(0), updatedAt: at(40) },
    member("2", "민첩한괴도", ["ops", "dev"], 0.2),
    member("3", "재빠른고양이", ["mkt"], 1),
    member("4", "조용한경찰", ["des"], 6),
    member("5", "새벽순찰", [], 45),
  ],
});

function load(): Store {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Store | null;
    if (saved?.roles && saved.members) return saved;
  } catch {}
  return initial();
}

function save(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

const conflict = () => ({ status: 409, body: { error: "다른 분이 먼저 고쳤어요. 새로 불러온 뒤 다시 골라 주세요." } });

export function mockTeam(): Team {
  const s = load();
  s.members = s.members.map((m) => (m.userId === ME ? { ...m, lastSeenAt: new Date().toISOString() } : m));
  save(s);
  const me = s.members.find((m) => m.userId === ME)!;
  return { me, members: s.members, roles: s.roles, writable: true, canManage: canManage(me.roleKeys, s.members) };
}

export function mockSaveRoles(body: { userId: string; updatedAt: string; roleKeys: string[]; onboard?: boolean }): { status: number; body: Record<string, unknown> } {
  const s = load();
  const target = s.members.find((m) => m.userId === body.userId);
  if (!target || target.updatedAt !== body.updatedAt) return conflict();
  const me = s.members.find((m) => m.userId === ME)!;
  if (body.userId !== ME && !canManage(me.roleKeys, s.members)) return { status: 403, body: { error: "다른 분의 역할은 운영 역할을 맡은 분이 고칠 수 있어요." } };
  const now = new Date().toISOString();
  const next: Member = { ...target, roleKeys: cleanKeys(body.roleKeys, s.roles), updatedAt: now, ...(body.onboard ? { onboardedAt: now } : {}) };
  s.members = s.members.map((m) => (m.userId === body.userId ? next : m));
  save(s);
  return { status: 200, body: { member: next } };
}

export function mockSaveRole(body: RoleInput & { key?: string; updatedAt?: string; archive?: boolean }): { status: number; body: Record<string, unknown> } {
  const s = load();
  const now = new Date().toISOString();
  const bad = !body.archive && cardsProblem(body.cards ?? []);
  if (bad) return { status: 400, body: { error: bad } };
  if (!body.key) {
    const created: Role = { key: newRoleKey(Date.now()), name: body.name.trim(), description: body.description.trim(), icon: body.icon, cards: body.cards ?? [], position: s.roles.length, updatedBy: "로컬 관리자", updatedAt: now };
    s.roles = [...s.roles, created];
    save(s);
    return { status: 200, body: { role: created } };
  }
  const target = s.roles.find((r) => r.key === body.key);
  if (!target || target.updatedAt !== body.updatedAt) return conflict();
  if (body.archive) {
    if (isBuiltin(target.key)) return { status: 400, body: { error: "처음부터 있던 역할은 지울 수 없어요." } };
    s.roles = s.roles.filter((r) => r.key !== target.key);
    s.members = s.members.map((m) => ({ ...m, roleKeys: m.roleKeys.filter((k) => k !== target.key) }));
    save(s);
    return { status: 200, body: { ok: true } };
  }
  const next: Role = { ...target, name: body.name.trim(), description: body.description.trim(), icon: isBuiltin(target.key) ? target.key : body.icon, cards: body.cards ?? target.cards, updatedBy: "로컬 관리자", updatedAt: now };
  s.roles = s.roles.map((r) => (r.key === target.key ? next : r));
  save(s);
  return { status: 200, body: { role: next } };
}
