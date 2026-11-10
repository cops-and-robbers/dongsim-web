/**
 * 어드민 운영진과 역할의 값과 규칙 (docs/admin-ui.md "운영진"). 순수 함수만 둔다.
 */

/** 처음부터 있는 역할. 그림이 따로 있고 지울 수 없다 */
export const BUILTIN_ROLES = ["dev", "des", "mkt", "ops"] as const;
/** 이 역할을 맡은 사람이 다른 사람의 역할과 역할 목록을 고친다 */
export const MANAGER_ROLE = "ops";
/** 새로 만드는 역할에 고를 수 있는 아이콘. 어떤 일을 맡든 고를 수 있게 하는 일의 종류로 묶었다. 모양은 components/admin/team/roleIcons.tsx */
export const ICON_GROUPS: { label: string; icons: { key: string; label: string }[] }[] = [
  { label: "소통", icons: [{ key: "message", label: "말풍선" }, { key: "mail", label: "메일" }, { key: "phone", label: "전화" }, { key: "megaphone", label: "확성기" }, { key: "languages", label: "번역" }, { key: "newspaper", label: "신문" }, { key: "at", label: "골뱅이" }] },
  { label: "사람", icons: [{ key: "users", label: "사람들" }, { key: "user", label: "사람" }, { key: "handshake", label: "악수" }, { key: "heart", label: "하트" }, { key: "smile", label: "웃는 얼굴" }, { key: "gift", label: "선물" }] },
  { label: "만들기", icons: [{ key: "pen", label: "펜" }, { key: "palette", label: "팔레트" }, { key: "brush", label: "붓" }, { key: "image", label: "그림" }, { key: "camera", label: "카메라" }, { key: "video", label: "영상" }, { key: "film", label: "촬영" }, { key: "music", label: "음악" }, { key: "mic", label: "마이크" }, { key: "headphones", label: "헤드폰" }] },
  { label: "개발", icons: [{ key: "code", label: "코드" }, { key: "terminal", label: "터미널" }, { key: "bug", label: "버그" }, { key: "database", label: "데이터베이스" }, { key: "server", label: "서버" }, { key: "cpu", label: "칩" }, { key: "smartphone", label: "휴대폰" }, { key: "monitor", label: "모니터" }, { key: "wrench", label: "렌치" }] },
  { label: "숫자와 돈", icons: [{ key: "chart", label: "꺾은선 그래프" }, { key: "pie", label: "원 그래프" }, { key: "calculator", label: "계산기" }, { key: "wallet", label: "지갑" }, { key: "receipt", label: "영수증" }, { key: "store", label: "가게" }, { key: "bag", label: "쇼핑백" }, { key: "briefcase", label: "가방" }] },
  { label: "운영과 행사", icons: [{ key: "calendar", label: "달력" }, { key: "clipboard", label: "체크리스트" }, { key: "ticket", label: "티켓" }, { key: "pin", label: "위치" }, { key: "truck", label: "트럭" }, { key: "package", label: "상자" }, { key: "flag", label: "깃발" }, { key: "trophy", label: "트로피" }, { key: "siren", label: "사이렌" }] },
  { label: "안전과 문서", icons: [{ key: "shield", label: "방패" }, { key: "lock", label: "자물쇠" }, { key: "scale", label: "저울" }, { key: "file", label: "문서" }, { key: "book", label: "책" }, { key: "search", label: "돋보기" }] },
  { label: "그 밖에", icons: [{ key: "sparkles", label: "반짝임" }, { key: "star", label: "별" }, { key: "rocket", label: "로켓" }, { key: "globe", label: "지구본" }, { key: "target", label: "과녁" }, { key: "lightbulb", label: "전구" }, { key: "graduation", label: "학사모" }, { key: "coffee", label: "커피" }, { key: "gamepad", label: "게임패드" }] },
];
export const ROLE_ICONS: string[] = ICON_GROUPS.flatMap((g) => g.icons.map((i) => i.key));
export const ICON_LABEL: Record<string, string> = Object.fromEntries(ICON_GROUPS.flatMap((g) => g.icons.map((i) => [i.key, i.label])));

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
  if (!builtin && !ROLE_ICONS.includes(input.icon)) return "아이콘을 골라 주세요.";
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
