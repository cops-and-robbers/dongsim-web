/**
 * 게임 서버 숫자 (#163, #165). 가입, 끝난 판, 판 참가 인원을 날짜별로 센다. 지표 화면과 챗봇이 같이 쓴다.
 *
 * 요청한 어드민의 토큰으로 백엔드를 읽는다. 날짜별 합계와 판 단위 요약(시각, 구역 가운데, 인원)만 내보내고,
 * 닉네임이나 사용자 id 같은 개인 단위 기록은 이 파일 밖으로 나가지 않는다.
 *
 * 운영진 걸러 내기 (#165)
 * - 운영진은 백엔드 ADMIN 권한 계정과 metrics_staff_accounts 에 넣은 계정(권한 없는 팀원, 테스트 계정)이다
 * - 판은 참가자로 가른다. 운영진만 한 판은 판 수에서 빼고, 섞인 판(행사 부스처럼 운영진이 방장인 판)은 센다
 * - 사람 수(참가 인원, 가입, 새 플레이어)에서는 운영진을 늘 뺀다
 * - 참가자 기록은 2026-08-17 배포부터 쌓여 그 전 판은 누가 했는지 모른다. 그 판은 그대로 센다
 *
 * 참가 인원은 시작 명단(중간에 나간 사람 포함)으로 센다. 판 요약의 경찰, 도둑 수는 끝까지 남은 사람만 세서
 * 행사 판이 크게 줄어 보였다(9/19 서대페 판 하나가 명단 24명인데 6명으로 잡혔다). 명단이 없는 판만 그 수를 쓴다
 *
 * 가입은 계정을 최신순으로 넘기며 직접 센다. adminUsers 의 날짜 필터가 어떤 기준인지 확인하지 못해서다.
 * 마케팅의 끝("가입한 사람이 실제로 게임을 했나")을 보려고 둘을 더 센다(2026-10-10)
 * - newPlayers: 그날 첫 판을 한 새 가입자. 가입이 참가자 기록 시작(2026-08-17) 이후인 사람만 센다.
 *   그 전에 가입한 사람은 첫 판이 기록 전에 있었을 수 있어, 기록 뒤 첫 판을 "처음"으로 세면 부풀기 때문이다
 * - activation: 가입하고 7일 안에 한 판이라도 한 비율. 같은 이유로 2026-08-17 이후 가입자만, 7일이 다 지난 가입자만 센다
 */

import { addDays, ymdRange } from "./dates.ts";
import { seoulClock } from "./events.ts";
import type { Week } from "./weekly/numbers.ts";

const PAGE = 100;
const MAX_PAGES = 40;
export const PARTICIPANTS_SINCE = "2026-08-17";

type Row = { games: number; players: number; signups: number; newPlayers: number };
export type Ratio = { num: number; den: number };
/** 가입하고 7일 안에 첫 판을 했나 볼 수 있는 기간 */
export const ACTIVATION_DAYS = 7;
export type ServerNumbers = {
  current: Row;
  previous: Row;
  /** 가입 후 7일 안 첫 판 비율. 2026-08-17 이후 가입, 7일이 다 지난 가입자만 */
  activation: { current: Ratio; previous: Ratio };
  /** 날짜별 (한국 날짜) */
  daily: Map<string, Row>;
  /** 이 기간 판 중 운영진만 해서 뺀 수 */
  staffGamesExcluded: number;
  error: string | null;
};

/** 판의 성격. unknown 은 참가자 기록 전(2026-08-17 전) 판 */
export type GameKind = "staff" | "mixed" | "users" | "unknown";

/** 판 하나의 요약. 사람을 알아볼 id 는 담지 않는다. 행사 성적표와 행사 게임 고르기가 쓴다 */
export type GameRow = {
  /** 게임 기록(라운드) id. 행사 게임으로 고를 때 쓴다(metrics_event_games) */
  id: string;
  startedAt: string;
  center: { lat: number; lng: number } | null;
  kind: GameKind;
  /** 운영진이 아닌 참가자 수. 명단이 없는 판은 끝까지 남은 경찰, 도둑 수 */
  visitors: number;
  /** 운영진 참가자 수. 명단이 없는 판은 0 */
  staff: number;
  minutes: number;
};

const seoulDay = (iso: string) => seoulClock(iso).day;

async function gql<T>(apiBase: string, token: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${apiBase}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await res.json().catch(() => ({}))) as { data?: T; errors?: { message?: string }[] };
  if (!res.ok || body.errors?.length || !body.data) throw new Error(`게임 서버 ${res.status} ${body.errors?.[0]?.message ?? ""}`.trim());
  return body.data;
}

type User = { id: string; role: string; createdAt: string };
type Area = { playgroundCenterLat: number | null; playgroundCenterLng: number | null; playgroundPolygon: { latitude: number; longitude: number }[] | null } | null;
type History = {
  id: string;
  startedAt: string | null;
  createdAt: string;
  durationSeconds?: number;
  totalPoliceCount: number;
  totalRobberCount: number;
  area?: Area;
  participants: { userId: string }[];
};

/** 운영진: ADMIN 권한 계정과 따로 넣은 계정 */
export function staffOf(users: Pick<User, "id" | "role">[], extra: Iterable<string>): Set<string> {
  return new Set([...users.filter((u) => u.role === "ADMIN").map((u) => String(u.id)), ...[...extra].map(String)]);
}

const idsOf = (h: Pick<History, "participants">) => [...new Set(h.participants.map((p) => String(p.userId)))];

/** 참가자로 판을 가른다 */
export function kindOf(h: Pick<History, "participants">, staff: Set<string>): GameKind {
  const ids = idsOf(h);
  if (!ids.length) return "unknown";
  const n = ids.filter((id) => staff.has(id)).length;
  return n === ids.length ? "staff" : n > 0 ? "mixed" : "users";
}

/** 운영진이 아닌 참가자 수와 운영진 수. 명단이 없으면 끝까지 남은 인원 */
export function headcount(h: Pick<History, "participants" | "totalPoliceCount" | "totalRobberCount">, staff: Set<string>): { visitors: number; staff: number } {
  const ids = idsOf(h);
  if (!ids.length) return { visitors: h.totalPoliceCount + h.totalRobberCount, staff: 0 };
  const s = ids.filter((id) => staff.has(id)).length;
  return { visitors: ids.length - s, staff: s };
}

function centerOf(a: Area | undefined): { lat: number; lng: number } | null {
  if (!a) return null;
  if (a.playgroundCenterLat != null && a.playgroundCenterLng != null) return { lat: a.playgroundCenterLat, lng: a.playgroundCenterLng };
  const p = a.playgroundPolygon;
  if (!p?.length) return null;
  return { lat: p.reduce((s, x) => s + x.latitude, 0) / p.length, lng: p.reduce((s, x) => s + x.longitude, 0) / p.length };
}

/** 새 가입자 한 사람의 가입일과 첫 판 날. 사람을 알아볼 id 는 담지 않는다 */
export type Joiner = { signupDay: string; firstGameDay: string | null };

/** 날짜별로 센다. 같은 기록이 쪽 경계에서 두 번 읽혀도 id 로 한 번만 센다 */
export function tallyServer(
  users: User[],
  histories: History[],
  staff: Set<string>,
): { daily: Map<string, Row>; staffGames: Map<string, number>; joiners: Joiner[]; games: GameRow[] } {
  const daily = new Map<string, Row>();
  const staffGames = new Map<string, number>();
  const games: GameRow[] = [];
  const at = (day: string) => daily.get(day) ?? daily.set(day, { games: 0, players: 0, signups: 0, newPlayers: 0 }).get(day)!;
  const seenU = new Set<string>();
  const signupDay = new Map<string, string>();
  for (const u of users) {
    const id = String(u.id);
    if (seenU.has(id) || staff.has(id)) continue;
    seenU.add(id);
    const day = seoulDay(u.createdAt);
    at(day).signups++;
    if (day >= PARTICIPANTS_SINCE) signupDay.set(id, day);
  }
  const firstGame = new Map<string, string>();
  const seenH = new Set<string>();
  for (const h of histories) {
    if (seenH.has(h.id)) continue;
    seenH.add(h.id);
    const startedAt = h.startedAt ?? h.createdAt;
    const day = seoulDay(startedAt);
    const kind = kindOf(h, staff);
    const people = headcount(h, staff);
    games.push({ id: String(h.id), startedAt, center: centerOf(h.area), kind, ...people, minutes: Math.round((h.durationSeconds ?? 0) / 60) });
    if (kind === "staff") {
      staffGames.set(day, (staffGames.get(day) ?? 0) + 1);
      continue;
    }
    const r = at(day);
    r.games++;
    r.players += people.visitors;
    for (const p of h.participants) {
      const id = String(p.userId);
      if (!signupDay.has(id)) continue;
      const prev = firstGame.get(id);
      if (!prev || day < prev) firstGame.set(id, day);
    }
  }
  const joiners: Joiner[] = [...signupDay].map(([id, day]) => ({ signupDay: day, firstGameDay: firstGame.get(id) ?? null }));
  for (const j of joiners) if (j.firstGameDay) at(j.firstGameDay).newPlayers++;
  games.sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1));
  return { daily, staffGames, joiners, games };
}

/**
 * 가입 후 7일 안에 첫 판을 한 비율. 기간 안에 가입했고 7일이 어제까지 다 지난 사람만 분모에 넣는다.
 * 9월 30일 가입자는 10월 6일까지 봐야 해서, 오늘이 10월 7일이 되어야 센다
 */
export function activationOf(joiners: Joiner[], w: Week, today: string): Ratio {
  const lastFull = addDays(today, -ACTIVATION_DAYS);
  const pool = joiners.filter((j) => j.signupDay >= w.start && j.signupDay <= w.end && j.signupDay <= lastFull);
  const num = pool.filter((j) => j.firstGameDay !== null && j.firstGameDay <= addDays(j.signupDay, ACTIVATION_DAYS - 1)).length;
  return { num, den: pool.length };
}

export const sumRange = (daily: Map<string, Row>, w: Week): Row =>
  ymdRange(w.start, w.end).reduce(
    (a, d) => {
      const r = daily.get(d);
      return r ? { games: a.games + r.games, players: a.players + r.players, signups: a.signups + r.signups, newPlayers: a.newPlayers + r.newPlayers } : a;
    },
    { games: 0, players: 0, signups: 0, newPlayers: 0 },
  );

export type ServerDaily = { daily: Map<string, Row>; staffGames: Map<string, number>; joiners: Joiner[]; games: GameRow[]; error: string | null };

/** 첫 쪽으로 쪽 수를 알고 나머지 쪽은 한꺼번에 읽는다 */
async function readAll<T>(read: (page: number) => Promise<{ content: T[]; totalPages: number }>, what: string): Promise<T[]> {
  const first = await read(0);
  if (first.totalPages > MAX_PAGES) throw new Error(`${what}이 너무 많아 끝까지 읽지 못했어요`);
  const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) => read(i + 1)));
  return [first, ...rest].flatMap((p) => p.content);
}

const USERS = `query ServerUsers($page: Int!) { adminUsers(page: $page, size: ${PAGE}, sortDirection: DESC) { content { id role createdAt } totalPages } }`;
const GAMES = `query ServerGames($page: Int!) { adminGameHistories(page: $page, size: ${PAGE}, sortDirection: DESC) { content { id startedAt createdAt durationSeconds totalPoliceCount totalRobberCount area { playgroundCenterLat playgroundCenterLng playgroundPolygon { latitude longitude } } participants { userId } } totalPages } }`;

/**
 * 계정과 끝난 판을 전부 읽어 날짜별로 센다. 판은 수백 개 규모라 다 읽어도 몇 쪽이다.
 * 한 질문 안에서 챗봇 도구를 여러 번 불러도 이건 한 번만 읽는다(tools.ts 가 기억해 둔다).
 * extraStaff 는 metrics_staff_accounts 의 계정(staff.ts)
 */
export async function loadServerDaily(apiBase: string, token: string, extraStaff: Iterable<string> = []): Promise<ServerDaily> {
  try {
    const [users, histories] = await Promise.all([
      readAll(async (page) => (await gql<{ adminUsers: { content: User[]; totalPages: number } }>(apiBase, token, USERS, { page })).adminUsers, "계정"),
      readAll(async (page) => (await gql<{ adminGameHistories: { content: History[]; totalPages: number } }>(apiBase, token, GAMES, { page })).adminGameHistories, "게임 기록"),
    ]);
    return { ...tallyServer(users, histories, staffOf(users, extraStaff)), error: null };
  } catch (e) {
    return { daily: new Map(), staffGames: new Map(), joiners: [], games: [], error: e instanceof Error ? e.message : String(e) };
  }
}

/** 날짜별 숫자를 두 기간 합계로 */
export function serverNumbers(all: ServerDaily, range: Week, previous: Week, today: string): ServerNumbers {
  const staffGamesExcluded = ymdRange(range.start, range.end).reduce((a, d) => a + (all.staffGames.get(d) ?? 0), 0);
  return {
    current: sumRange(all.daily, range),
    previous: sumRange(all.daily, previous),
    activation: { current: activationOf(all.joiners, range, today), previous: activationOf(all.joiners, previous, today) },
    daily: all.daily,
    staffGamesExcluded,
    error: all.error,
  };
}
