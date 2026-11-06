// 관리자가 최근에 열어 본 게임, 유저. 명령 팔레트, 목록의 시계 버튼(components/admin/RecentViewed.tsx),
// 표의 "방금 보고 온 줄" 표시(lib/admin/useLastViewed.ts)가 쓴다.
//
// 이 브라우저에만 저장한다. 새 탭으로 연 상세도 함께 쌓이게 탭마다 따로인 sessionStorage 대신 localStorage 를 쓴다.
// 닉네임이 들어 있어 로그아웃할 때 지운다(AuthProvider).

export type RecentKind = "game" | "history" | "user";
/** 시계 버튼 하나가 묶어 보여 주는 단위. 게임 메뉴는 열린 방과 지난 게임을 함께 다룬다. */
export type RecentGroup = "game" | "user";

export type RecentItem = {
  kind: RecentKind;
  id: string;
  title: string;
  detail: string;
  at: number;
};

const KEY = "admin-recent-viewed";
// 시계 버튼은 앞의 10개, 명령 창은 5개를 보여 준다. 묶음 안에서 열린 방과 지난 게임이 섞여도 종류마다 마지막 하나가 남게 조금 넉넉히 둔다.
// 닉네임이 들어 있어 필요 이상 쌓지 않는다(예전에는 이미 본 줄을 모두 가리느라 300개였다)
const MAX_PER_GROUP = 30;

export const groupOf = (kind: RecentKind): RecentGroup => (kind === "user" ? "user" : "game");

// 주소는 저장하지 않고 종류와 번호로 만든다. 저장된 값이 어긋나도 엉뚱한 곳으로 가지 않는다
export function recentHref({ kind, id }: Pick<RecentItem, "kind" | "id">) {
  const path = { game: "games", history: "games/history", user: "users" }[kind];
  return `/admin/${path}/${encodeURIComponent(id)}`;
}

/** 맨 앞에 넣는다. 다시 본 것은 앞으로 옮기고, 묶음마다 오래된 것부터 버린다. */
export function addRecent(list: RecentItem[], item: RecentItem): RecentItem[] {
  const rest = list.filter((r) => !(r.kind === item.kind && r.id === item.id));
  const next = [item, ...rest];
  const group = groupOf(item.kind);
  let kept = 0;
  return next.filter((r) => groupOf(r.kind) !== group || ++kept <= MAX_PER_GROUP);
}

/** 저장된 값은 믿지 않는다. 다른 버전이 쓴 값이나 고장 난 값이 화면을 깨면 안 된다. */
export function parseRecent(raw: string | null): RecentItem[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (r): r is RecentItem =>
        ["game", "history", "user"].includes(r?.kind) &&
        typeof r.id === "string" &&
        typeof r.title === "string" &&
        typeof r.detail === "string" &&
        typeof r.at === "number"
    );
  } catch {
    return [];
  }
}

/** 언제 봤는지. 오래 묵은 항목이 섞여도 하루 단위로 읽히면 충분하다. */
export function formatAgo(at: number, now: number) {
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

// 저장소가 막힌 창에서도 상세 화면은 그대로 열려야 한다. 잃는 건 기록뿐이다
export function readRecentRaw() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function readRecent(): RecentItem[] {
  return parseRecent(readRecentRaw());
}

function write(list: RecentItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}

export function recordRecent(item: Omit<RecentItem, "at">) {
  write(addRecent(readRecent(), { ...item, at: Date.now() }));
}

/** 방이 사라졌거나 탈퇴한 유저처럼 더는 열 수 없는 항목을 뺀다. */
export function forgetRecent(kind: RecentKind, id: string) {
  write(readRecent().filter((r) => !(r.kind === kind && r.id === id)));
}

export function clearRecent() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
