/**
 * 어드민 운영진과 역할의 값과 규칙 (docs/admin-ui.md "운영진"). 순수 함수만 둔다.
 */

/** 처음부터 있는 역할. 그림이 따로 있고 지울 수 없다 */
export const BUILTIN_ROLES = ["dev", "des", "mkt", "ops"] as const;
/** 이 역할을 맡은 사람이 다른 사람의 역할과 역할 목록을 고친다 */
export const MANAGER_ROLE = "ops";
/** 새로 만드는 역할에 고를 수 있는 아이콘 */
export const ROLE_ICONS = ["headphones", "camera", "users", "gamepad", "shield", "sparkles", "flag", "pen", "pin", "message", "heart", "briefcase"] as const;

export const NAME_MAX = 10;
export const DESC_MAX = 24;

export type Role = { key: string; name: string; description: string; icon: string; cards: string[]; position: number; updatedBy: string; updatedAt: string };
export type Member = { userId: string; nickname: string; roleKeys: string[]; onboardedAt: string | null; lastSeenAt: string; updatedAt: string };
export type Team = { me: Member; members: Member[]; roles: Role[]; writable: boolean; canManage: boolean; readOnlyReason?: string };
export type RoleInput = { name: string; description: string; icon: string };

const length = (s: string) => [...s.trim()].length;

export const isBuiltin = (key: string) => (BUILTIN_ROLES as readonly string[]).includes(key);

/** 운영 역할을 맡은 사람이 아직 없으면 누구나 고친다. 그래야 처음 맡을 사람을 정할 수 있다 */
export function canManage(myKeys: string[], members: Pick<Member, "roleKeys">[]): boolean {
  return myKeys.includes(MANAGER_ROLE) || !members.some((m) => m.roleKeys.includes(MANAGER_ROLE));
}

/** 없는 역할은 빼고 겹친 것은 하나로, 역할 목록 순서대로 */
export function cleanKeys(keys: string[], roles: Pick<Role, "key">[]): string[] {
  return roles.map((r) => r.key).filter((k) => keys.includes(k));
}

export function roleProblem(input: RoleInput, others: Pick<Role, "name">[], builtin: boolean): string | null {
  const name = input.name.trim();
  if (!name) return "역할 이름을 적어 주세요.";
  if (length(name) > NAME_MAX) return `역할 이름은 ${NAME_MAX}자까지 쓸 수 있어요.`;
  if (others.some((r) => r.name.trim() === name)) return "같은 이름의 역할이 있어요.";
  if (length(input.description) > DESC_MAX) return `설명은 ${DESC_MAX}자까지 쓸 수 있어요.`;
  if (!builtin && !(ROLE_ICONS as readonly string[]).includes(input.icon)) return "아이콘을 골라 주세요.";
  return null;
}

/** 새 역할의 키. 이름은 바뀔 수 있어서 키로 쓰지 않는다 */
export const newRoleKey = (now: number) => `r_${now.toString(36)}`;

const DAY = 86_400_000;
const kstDay = (t: number) => Math.floor((t + 9 * 3_600_000) / DAY);

/** 마지막으로 어드민에 들어온 때 */
export function seenLabel(iso: string, now: number): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  if (now - t < 10 * 60_000) return "지금 접속 중";
  const days = kstDay(now) - kstDay(t);
  if (days <= 0) return "오늘 접속";
  if (days === 1) return "어제 접속";
  if (days < 30) return `${days}일 전 접속`;
  return "한 달 넘게 접속하지 않았어요";
}

/** 첫 화면에서 고른 역할을 한 줄로 */
export function pickedNote(keys: string[], roles: Pick<Role, "key" | "name">[]): string {
  const names = roles.filter((r) => keys.includes(r.key)).map((r) => r.name);
  return names.length ? `${names.join(", ")} 역할로 시작해요.` : "고르지 않아도 모든 화면을 볼 수 있어요.";
}
