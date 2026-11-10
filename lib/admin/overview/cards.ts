/**
 * 개요 카드 목록과 배치 규칙 (docs/admin-ui.md "개요 카드"). 순수 함수만 둔다.
 * 역할은 카드 키만 들고 있고(admin_roles.cards), 카드가 무엇을 어디서 읽는지는 여기가 정본이다.
 */

export type CardKey = "newu" | "ig" | "views" | "ad" | "site" | "fun" | "ret" | "d7" | "post" | "week" | "win" | "end" | "games" | "crash" | "anr" | "rel" | "bug" | "rep" | "rv" | "chk" | "ev" | "frame" | "draft";
export type CardGroup = "성장" | "게임" | "안정성" | "운영" | "준비";
/** server 는 개요 요약 API 가 계산하고, live 는 화면이 백엔드에서 바로 읽는다 */
export type CardSource = "server" | "live";

export type CardDef = {
  title: string;
  group: CardGroup;
  /** 차지하는 칸. 목록이나 막대가 들어가는 카드는 두 칸이다 */
  size: 1 | 2;
  source: CardSource;
  /** 어느 때까지의 값인지. 지표는 하루 두 번 쌓여 어제까지다 */
  fresh: string;
  /** 누르면 가는 화면 */
  href: string;
  /** 처리할 일이 쌓이는 카드 */
  todo?: boolean;
};

export const CARDS: Record<CardKey, CardDef> = {
  newu: { title: "새 사용자", group: "성장", size: 1, source: "server", fresh: "어제까지 7일", href: "/admin/metrics" },
  ig: { title: "인스타 조회", group: "성장", size: 1, source: "server", fresh: "어제까지 7일", href: "/admin/metrics" },
  views: { title: "App Store 페이지 조회", group: "성장", size: 1, source: "server", fresh: "며칠 늦어요", href: "/admin/metrics" },
  ad: { title: "광고 수익", group: "성장", size: 1, source: "server", fresh: "어제까지 7일", href: "/admin/metrics" },
  site: { title: "사이트에서 스토어로", group: "성장", size: 1, source: "server", fresh: "최근 4주", href: "/admin/metrics" },
  post: { title: "최근 게시물 반응률", group: "성장", size: 1, source: "server", fresh: "매일 아침", href: "/admin/metrics" },
  fun: { title: "첫 실행 후 게임까지", group: "게임", size: 1, source: "server", fresh: "7일 지난 사람", href: "/admin/metrics" },
  ret: { title: "다음 날 재방문", group: "게임", size: 1, source: "server", fresh: "최근 4주", href: "/admin/metrics" },
  d7: { title: "7일 뒤 재방문", group: "게임", size: 1, source: "server", fresh: "최근 4주", href: "/admin/metrics" },
  week: { title: "이번 주 게임", group: "게임", size: 1, source: "live", fresh: "실시간", href: "/admin/games" },
  win: { title: "팀별 승률", group: "게임", size: 1, source: "live", fresh: "실시간", href: "/admin/games/history" },
  end: { title: "게임 종료 사유", group: "게임", size: 2, source: "live", fresh: "실시간", href: "/admin/games/history" },
  games: { title: "최근 게임", group: "게임", size: 2, source: "live", fresh: "실시간", href: "/admin/games" },
  crash: { title: "Android 비정상 종료율", group: "안정성", size: 1, source: "server", fresh: "최근 28일", href: "/admin/store-check" },
  anr: { title: "응답 없음 비율", group: "안정성", size: 1, source: "server", fresh: "최근 28일", href: "/admin/store-check" },
  rel: { title: "출시 단계", group: "안정성", size: 1, source: "server", fresh: "실시간", href: "/admin/release", todo: true },
  bug: { title: "미처리 버그", group: "안정성", size: 1, source: "live", fresh: "실시간", href: "/admin/bugs?status=PENDING", todo: true },
  rep: { title: "미처리 신고", group: "운영", size: 1, source: "live", fresh: "실시간", href: "/admin/reports?status=PENDING", todo: true },
  rv: { title: "답글 대기 리뷰", group: "운영", size: 1, source: "live", fresh: "실시간", href: "/admin/reviews", todo: true },
  chk: { title: "스토어 점검 기한", group: "운영", size: 1, source: "server", fresh: "실시간", href: "/admin/store-check", todo: true },
  ev: { title: "다음 행사 준비", group: "준비", size: 1, source: "server", fresh: "실시간", href: "/admin/events", todo: true },
  frame: { title: "다음 행사 프레임", group: "준비", size: 1, source: "server", fresh: "실시간", href: "/admin/events", todo: true },
  draft: { title: "보내지 않은 스토어 초안", group: "준비", size: 1, source: "server", fresh: "실시간", href: "/admin/store-page", todo: true },
};

export const CARD_KEYS = Object.keys(CARDS) as CardKey[];
export const isCardKey = (k: string): k is CardKey => k in CARDS;

/** 개요 한 줄은 네 칸, 두 줄까지 */
export const MAX_CELLS = 8;
/** 역할을 고르지 않았거나 고른 역할에 카드가 없을 때 */
export const TEAM_CARDS: CardKey[] = ["newu", "bug", "rep", "ev"];

export const cellsOf = (keys: CardKey[]) => keys.reduce((n, k) => n + CARDS[k].size, 0);

/**
 * 맡은 역할들의 기본 카드를 합친다. 역할마다 한 장씩 번갈아 넣어 8칸 안에 모든 역할이 보이게 한다.
 * 겹친 것은 하나로, 모르는 키는 빼고, 8칸까지
 */
export function presetCards(lists: string[][]): CardKey[] {
  const out: CardKey[] = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      const k = list[i];
      if (k === undefined || !isCardKey(k) || out.includes(k)) continue;
      if (cellsOf([...out, k]) <= MAX_CELLS) out.push(k);
    }
  }
  return out.length ? out : TEAM_CARDS;
}

/** 역할 기본 카드로 저장할 수 없는 이유. 없으면 null */
export function cardsProblem(keys: string[]): string | null {
  if (keys.some((k) => !isCardKey(k))) return "모르는 카드가 있어요.";
  if (new Set(keys).size !== keys.length) return "같은 카드가 두 번 들어 있어요.";
  if (cellsOf(keys as CardKey[]) > MAX_CELLS) return `카드는 ${MAX_CELLS}칸까지 놓을 수 있어요.`;
  return null;
}

export type Placed = { key: CardKey; span: number };

/**
 * 카드를 줄에 빈틈없이 놓는다. 네 칸 두 줄이면 두 줄의 카드 수가 비슷하게 나누고,
 * 남는 칸은 가장 작은 카드부터 넓혀 채운다(넓어지면 숫자 옆에 추세가 더 보인다)
 */
export function pack(keys: CardKey[], cols: number): Placed[] {
  const q: Placed[] = keys.map((key) => ({ key, span: Math.min(CARDS[key].size, cols) }));
  const sum = (a: Placed[]) => a.reduce((n, x) => n + x.span, 0);
  let rows: Placed[][] = [];
  const total = sum(q);
  if (cols === 4 && total > 4 && total <= 8) {
    let best = -1;
    let gap = Infinity;
    for (let k = 1; k < q.length; k++) {
      const a = q.slice(0, k);
      const b = q.slice(k);
      const d = Math.abs(a.length - b.length);
      if (sum(a) <= 4 && sum(b) <= 4 && d < gap) {
        gap = d;
        best = k;
      }
    }
    if (best > 0) rows = [q.slice(0, best), q.slice(best)];
  }
  if (!rows.length) {
    const rest = [...q];
    while (rest.length) {
      const row: Placed[] = [];
      let used = 0;
      for (let i = 0; i < rest.length; ) {
        if (used + rest[i].span <= cols) {
          used += rest[i].span;
          row.push(rest.splice(i, 1)[0]);
        } else i++;
      }
      rows.push(row);
    }
  }
  for (const row of rows) {
    let free = cols - sum(row);
    while (free-- > 0) [...row].sort((a, b) => a.span - b.span)[0].span++;
  }
  return rows.flat();
}

/** 화면이 백엔드에서 바로 읽는 카드 값 */
export type LiveValues = {
  weeklyGames: number;
  win: { police: number; robber: number };
  ends: { endReason: string; count: number }[];
  games: { id: string; inviteCode: string; status: string; participantCount: number; maxParticipants: number }[];
  pending: { reports: number; bugs: number; reviews: number } | null;
};

// 개요 요약 API 가 돌려주는 카드 값. 카드 하나를 못 읽어도 나머지는 보인다

/** 7일 합과 그 앞 7일. 날마다의 값은 추세선에 쓴다 */
export type TrendData = { kind: "trend"; total: number; previous: number | null; daily: number[]; previousDaily: number[]; until: string; unit: "count" | "usd" };
/** 비율. 분모가 적으면 화면이 흐리게 둔다 */
export type RatioData = { kind: "ratio"; num: number; den: number; previous: { num: number; den: number } | null; unit: "visits" | "people" };
export type LimitData = { kind: "limit"; rate: number | null; limit: number };
export type PostData = { kind: "post"; rate: number | null; reach: number | null; postedAt: string; permalink: string; small: boolean };
/** next 는 우리 차례이거나 막혔을 때 할 일. 그 밖에는 null 이다 */
export type StageData = { kind: "stage"; tracks: { platform: "ios" | "android"; label: string; tone: string; live: string | null }[]; next: { title: string; reason?: string; tone: string } | null };
export type DueData = { kind: "due"; title: string | null; due: string | null; daysLeft: number | null; open: number };
export type EventData = { kind: "event"; label: string | null; day: string | null; done: number; total: number; next: string | null; frames: number; builtinFrame: boolean };
export type CountData = { kind: "count"; count: number; detail: string | null };

export type CardData = TrendData | RatioData | LimitData | PostData | StageData | DueData | EventData | CountData;
export type CardResult = CardData | { kind: "error"; message: string };
export type OverviewData = { cards: Partial<Record<CardKey, CardResult>>; readAt: string };

/** 분모가 이보다 적으면 비율을 참고로만 본다 (lib/metrics/chat/catalog.ts LOW_RATIO_DEN 과 같다) */
export const LOW_DEN = 30;

export function ratioOf(r: { num: number; den: number } | null): number | null {
  return r && r.den > 0 ? r.num / r.den : null;
}

/** 지난 기간보다 몇 % 늘었나. 앞 기간이 0 이면 비교하지 않는다 */
export function changeOf(now: number, before: number | null): number | null {
  return before === null || before <= 0 ? null : (now - before) / before;
}
