/**
 * 신규 사용자 퍼널 (#157). 처음 연 날(GA4 firstSessionDate)이 같은 사람끼리 묶어, 7일 안에 어디까지 갔는지 센다.
 *
 * 하루 합(ga4_daily 의 event)으로는 단계를 비율로 잇지 못한다. 단계마다 횟수, 사람, 날짜 기준이 달라서다.
 * 그래서 같은 사람 묶음을 단계마다 사람 수(totalUsers)로 따로 묻는다(ga4/cohorts.ts fetchFunnel).
 *
 * 저장(ga4_daily, breakdown "funnel"): day 는 처음 연 날, key 는 "단계|플랫폼|나라(countryId)", metric 은 "users".
 * - 7일이 다 지난 날만 넣는다. 그래서 줄이 있는 날은 숫자가 다 찬 날이다. 아직 늘어나는 날은 섞지 않는다
 * - 나라별로 둔다. 화면은 모든 나라를 먼저 보여 주고, 여러 나라를 골라 합쳐 볼 수 있다.
 *   구글 플레이 자동 테스트 기기는 수집 때 뺀다(testDevices.ts)
 * - replay(둘째 주에도 플레이)는 둘째 주(8~14일째)까지 다 지난 날만 넣는다. 그날 줄이 하나도 없으면
 *   "아무도 안 했다"가 아니라 "아직 모른다"가 되지 않게, 다 지난 날엔 표시 줄(replay|-|-, 0)을 남긴다
 *
 * 단계 정의는 화면 툴팁과 문서가 같이 쓴다(아래 FUNNEL_STEPS).
 */

import { addDays } from "./dates.ts";

export type StepKey = "open" | "login" | "room" | "play";

/** 단계와 그 단계로 치는 앱 이벤트. 여러 이벤트면 그중 하나라도 남긴 사람이다 */
export const FUNNEL_STEPS: readonly { key: StepKey; label: string; events: readonly string[]; means: string }[] = [
  { key: "open", label: "앱 첫 실행", events: ["first_open"], means: "앱을 처음 연 사람" },
  { key: "login", label: "로그인", events: ["login"], means: "구글이나 애플로 로그인한 사람" },
  { key: "room", label: "방 입장", events: ["game_create", "game_join"], means: "방을 만들거나 코드, 링크로 들어간 사람" },
  // game_start 는 이벤트 게임에서 빠진다(cops-and-robbers-FE#627). 끝 기록으로도 센다
  { key: "play", label: "게임 플레이", events: ["game_start", "game_over"], means: "게임을 시작했거나 끝까지 한 사람" },
];

/** 둘째 주에도 플레이: 처음 연 날부터 8~14일째에 게임을 한 사람 */
export const REPLAY = { label: "다음 주에도 플레이", events: ["game_start", "game_over"], start: 7, end: 13 } as const;

/** 처음 연 날부터 며칠 안의 기록을 보나 */
export const FUNNEL_WINDOW = 7;

/** login 이벤트가 처음 찍힌 날. 그 전에 처음 연 사람은 로그인 단계를 셀 수 없어 퍼널에 넣지 않는다 */
export const FUNNEL_FROM = "2026-06-17";

/** 다 지난 날에 남기는 표시 줄의 자리(플랫폼, 나라). 숫자에는 안 섞인다 */
export const MARK = "-";

export type FunnelPlatform = "all" | "iOS" | "Android";

type Row = { property: string; day: string; breakdown: string; key: string; metric: string; value: number };
type Range = { start: string; end: string };

export type Funnel = {
  /** 퍼널에 넣은 처음 연 날(7일이 다 지난 날). 이 기간에 그런 날이 없으면 null */
  cohorts: Range | null;
  /** 이 기간 중 아직 7일이 안 지나 넣지 못한 날 */
  waiting: Range | null;
  steps: { key: StepKey; users: number }[];
  /** 첫 주에 게임한 사람(of) 중 둘째 주에도 게임한 사람(users). 둘째 주까지 지난 날(days)만. 그런 날이 없으면 null */
  replay: { users: number; of: number; days: Range } | null;
};

const later = (a: string, b: string) => (a > b ? a : b);
const earlier = (a: string, b: string) => (a < b ? a : b);
const span = (from: string, to: string): Range | null => (from <= to ? { start: from, end: to } : null);

/** 저장한 key("단계|플랫폼|나라")를 나눈다 */
export function splitFunnelKey(key: string): { step: string; platform: string; country: string } {
  const [step = "", platform = "", country = ""] = key.split("|");
  return { step, platform, country };
}

/** 고를 나라: "all" 은 모든 나라(첫 실행, 활성화율과 같은 기준), 아니면 countryId 여럿 */
export type CountryPick = "all" | readonly string[];

/** 고른 나라에 드나. 표시 줄(MARK)은 어느 나라에도 안 든다 */
export function countryMatches(country: string, countries: CountryPick): boolean {
  return country !== MARK && (countries === "all" || countries.includes(country));
}

/**
 * 기간 r 의 퍼널 줄을 단계, 플랫폼, 나라별 합으로 줄인 것. 서버가 만들어 내려주고, 화면은 고른 플랫폼과 나라로
 * pickFunnel 을 불러 바로 바꿔 본다(날짜별 줄을 다 내려보내지 않는다)
 */
export type FunnelData = {
  /** 퍼널에 넣은 처음 연 날(7일이 다 지난 날). 이 기간에 그런 날이 없으면 null */
  cohorts: Range | null;
  /** 이 기간 중 아직 7일이 안 지나 넣지 못한 날 */
  waiting: Range | null;
  /** 둘째 주까지 다 지난 날(다음 주에도 플레이를 셀 수 있는 날) */
  replayDays: Range | null;
  /** onReplayDays 는 그중 둘째 주까지 지난 날의 몫(다음 주에도 플레이의 분모를 고를 때 쓴다) */
  cells: { step: string; platform: string; country: string; users: number; onReplayDays: number }[];
};

/**
 * lastDay 는 GA4 앱 숫자가 들어온 마지막 날이다. 그날로 "아직 7일이 안 지난 날"을 가른다
 * (숫자 자체는 줄이 있는 날만 더한다. 줄은 7일이 다 지난 날만 있다)
 */
export function funnelData(rows: Row[], r: Range, lastDay: string | null): FunnelData {
  const inRange = rows.filter((x) => x.property === "app" && x.breakdown === "funnel" && x.day >= r.start && x.day <= r.end);
  const ripe = lastDay ? addDays(lastDay, -(FUNNEL_WINDOW - 1)) : null;
  // 둘째 주까지 다 지난 날: 표시 줄이 있는 날
  const replaySet = new Set(inRange.filter((x) => splitFunnelKey(x.key).step === "replay").map((x) => x.day));
  const replaySorted = [...replaySet].sort();
  const cells = new Map<string, FunnelData["cells"][number]>();
  for (const x of inRange) {
    const k = splitFunnelKey(x.key);
    if (k.country === MARK) continue;
    const cur = cells.get(x.key) ?? { ...k, users: 0, onReplayDays: 0 };
    cur.users += x.value;
    if (replaySet.has(x.day)) cur.onReplayDays += x.value;
    cells.set(x.key, cur);
  }
  return {
    cohorts: ripe ? span(later(r.start, FUNNEL_FROM), earlier(r.end, ripe)) : null,
    waiting: ripe ? span(later(r.start, addDays(ripe, 1)), r.end) : span(r.start, r.end),
    replayDays: replaySorted.length ? { start: replaySorted[0], end: replaySorted[replaySorted.length - 1] } : null,
    cells: [...cells.values()],
  };
}

/** 고른 플랫폼과 나라(여럿)의 퍼널 */
export function pickFunnel(data: FunnelData, pick: { platform: FunnelPlatform; countries: CountryPick }): Funnel {
  const mine = data.cells.filter((x) => (pick.platform === "all" || x.platform === pick.platform) && countryMatches(x.country, pick.countries));
  const total = (step: string, onReplay = false) => mine.filter((x) => x.step === step).reduce((a, x) => a + (onReplay ? x.onReplayDays : x.users), 0);
  return {
    cohorts: data.cohorts,
    waiting: data.waiting,
    steps: FUNNEL_STEPS.map((s) => ({ key: s.key, users: total(s.key) })),
    replay: data.replayDays ? { users: total("replay"), of: total("play", true), days: data.replayDays } : null,
  };
}

/** 나라별 단계 합(첫 실행이 많은 순). 화면의 나라별 표와 나라 고르기가 쓴다 */
export function funnelByCountry(data: FunnelData, platform: FunnelPlatform): { country: string; steps: Record<StepKey, number> }[] {
  const by = new Map<string, Record<StepKey, number>>();
  for (const x of data.cells) {
    if (platform !== "all" && x.platform !== platform) continue;
    if (!FUNNEL_STEPS.some((s) => s.key === x.step)) continue;
    const cur = by.get(x.country) ?? { open: 0, login: 0, room: 0, play: 0 };
    cur[x.step as StepKey] += x.users;
    by.set(x.country, cur);
  }
  return [...by.entries()]
    .map(([country, steps]) => ({ country, steps }))
    .filter((x) => x.steps.open > 0)
    .sort((a, b) => b.steps.open - a.steps.open || a.country.localeCompare(b.country));
}

/**
 * 가장 많이 빠지는 단계: 앞 단계 대비 비율이 가장 낮은 단계(로그인, 방 입장, 게임 플레이 중).
 * 앞 단계 사람이 minBase 보다 적으면 비율이 크게 흔들려 짚지 않는다
 */
export function weakestStep(steps: Funnel["steps"], minBase: number): StepKey | null {
  let worst: { key: StepKey; rate: number } | null = null;
  for (let i = 1; i < steps.length; i++) {
    const base = steps[i - 1].users;
    if (base < minBase) return null;
    const rate = steps[i].users / base;
    if (!worst || rate < worst.rate) worst = { key: steps[i].key, rate };
  }
  return worst?.key ?? null;
}
