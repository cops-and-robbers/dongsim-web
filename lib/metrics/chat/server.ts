/**
 * 챗봇이 쓰는 게임 서버 숫자 (#163). 가입, 끝난 판, 판 참가 인원을 날짜별로 센다.
 *
 * 화면(games.ts)처럼 요청한 어드민의 토큰으로 백엔드를 읽는다. 모델에게는 날짜별 합계만 넘기고,
 * 닉네임이나 사용자 id 같은 개인 단위 기록은 이 파일 밖으로 나가지 않는다.
 *
 * 화면과 다른 점 둘
 * - 관리자 계정만 참가한 판(시험 판)을 뺀다. 참가자 기록은 2026-08-17 배포부터 쌓여 그 전 판은 가릴 수 없다
 * - 가입은 계정을 최신순으로 넘기며 직접 센다. adminUsers 의 날짜 필터가 어떤 기준인지 확인하지 못해서다
 *
 * 마케팅의 끝("가입한 사람이 실제로 게임을 했나")을 보려고 둘을 더 센다(2026-10-10)
 * - newPlayers: 그날 첫 판을 한 새 가입자. 가입이 참가자 기록 시작(2026-08-17) 이후인 사람만 센다.
 *   그 전에 가입한 사람은 첫 판이 기록 전에 있었을 수 있어, 기록 뒤 첫 판을 "처음"으로 세면 부풀기 때문이다
 * - activation: 가입하고 7일 안에 한 판이라도 한 비율. 같은 이유로 2026-08-17 이후 가입자만, 7일이 다 지난 가입자만 센다
 */

import { addDays, ymdRange } from "../dates.ts";
import type { Week } from "../weekly/numbers.ts";

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
  /** 이 기간 판 중 시험 판으로 보고 뺀 수 */
  testGamesExcluded: number;
  error: string | null;
};

const seoulDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso));

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
type History = { id: string; startedAt: string | null; createdAt: string; totalPoliceCount: number; totalRobberCount: number; participants: { userId: string }[] };

/** 판 하나가 시험 판인가: 참가자 기록이 있고, 그 전원이 관리자 */
export function isTestGame(h: Pick<History, "participants">, admins: Set<string>): boolean {
  return h.participants.length > 0 && h.participants.every((p) => admins.has(String(p.userId)));
}

/** 새 가입자 한 사람의 가입일과 첫 판 날. 사람을 알아볼 id 는 담지 않는다 */
export type Joiner = { signupDay: string; firstGameDay: string | null };

/** 날짜별로 센다. 같은 기록이 쪽 경계에서 두 번 읽혀도 id 로 한 번만 센다 */
export function tallyServer(users: User[], histories: History[], admins: Set<string>): { daily: Map<string, Row>; testGames: Map<string, number>; joiners: Joiner[] } {
  const daily = new Map<string, Row>();
  const testGames = new Map<string, number>();
  const at = (day: string) => daily.get(day) ?? daily.set(day, { games: 0, players: 0, signups: 0, newPlayers: 0 }).get(day)!;
  const seenU = new Set<string>();
  const signupDay = new Map<string, string>();
  for (const u of users) {
    if (seenU.has(u.id) || u.role === "ADMIN") continue;
    seenU.add(u.id);
    const day = seoulDay(u.createdAt);
    at(day).signups++;
    if (day >= PARTICIPANTS_SINCE) signupDay.set(String(u.id), day);
  }
  const firstGame = new Map<string, string>();
  const seenH = new Set<string>();
  for (const h of histories) {
    if (seenH.has(h.id)) continue;
    seenH.add(h.id);
    const day = seoulDay(h.startedAt ?? h.createdAt);
    if (isTestGame(h, admins)) {
      testGames.set(day, (testGames.get(day) ?? 0) + 1);
      continue;
    }
    const r = at(day);
    r.games++;
    r.players += h.totalPoliceCount + h.totalRobberCount;
    for (const p of h.participants) {
      const id = String(p.userId);
      if (!signupDay.has(id)) continue;
      const prev = firstGame.get(id);
      if (!prev || day < prev) firstGame.set(id, day);
    }
  }
  const joiners: Joiner[] = [...signupDay].map(([id, day]) => ({ signupDay: day, firstGameDay: firstGame.get(id) ?? null }));
  for (const j of joiners) if (j.firstGameDay) at(j.firstGameDay).newPlayers++;
  return { daily, testGames, joiners };
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

const sumRange = (daily: Map<string, Row>, w: Week): Row =>
  ymdRange(w.start, w.end).reduce(
    (a, d) => {
      const r = daily.get(d);
      return r ? { games: a.games + r.games, players: a.players + r.players, signups: a.signups + r.signups, newPlayers: a.newPlayers + r.newPlayers } : a;
    },
    { games: 0, players: 0, signups: 0, newPlayers: 0 },
  );

export type ServerDaily = { daily: Map<string, Row>; testGames: Map<string, number>; joiners: Joiner[]; error: string | null };

/**
 * 계정과 끝난 판을 전부 읽어 날짜별로 센다. 한 질문 안에서 도구를 여러 번 불러도 이건 한 번만 읽는다(tools.ts 가 기억해 둔다).
 * 판은 수백 개 규모라 다 읽어도 몇 쪽이다. 너무 많으면 MAX_PAGES 에서 끊고 error 로 알린다
 */
export async function loadServerDaily(apiBase: string, token: string): Promise<ServerDaily> {
  try {
    const users: User[] = [];
    for (let page = 0; ; page++) {
      if (page >= MAX_PAGES) throw new Error("계정이 너무 많아 끝까지 읽지 못했어요");
      const d = await gql<{ adminUsers: { content: User[]; totalPages: number } }>(
        apiBase,
        token,
        `query ChatUsers($page: Int!) { adminUsers(page: $page, size: ${PAGE}, sortDirection: DESC) { content { id role createdAt } totalPages } }`,
        { page },
      );
      users.push(...d.adminUsers.content);
      if (page + 1 >= d.adminUsers.totalPages) break;
    }
    const admins = new Set(users.filter((u) => u.role === "ADMIN").map((u) => String(u.id)));
    const histories: History[] = [];
    for (let page = 0; ; page++) {
      if (page >= MAX_PAGES) throw new Error("게임 기록이 너무 많아 끝까지 읽지 못했어요");
      const d = await gql<{ adminGameHistories: { content: History[]; totalPages: number } }>(
        apiBase,
        token,
        `query ChatGames($page: Int!) { adminGameHistories(page: $page, size: ${PAGE}, sortDirection: DESC) { content { id startedAt createdAt totalPoliceCount totalRobberCount participants { userId } } totalPages } }`,
        { page },
      );
      histories.push(...d.adminGameHistories.content);
      if (page + 1 >= d.adminGameHistories.totalPages) break;
    }
    return { ...tallyServer(users, histories, admins), error: null };
  } catch (e) {
    return { daily: new Map(), testGames: new Map(), joiners: [], error: e instanceof Error ? e.message : String(e) };
  }
}

/** 날짜별 숫자를 두 기간 합계로 */
export function serverNumbers(all: ServerDaily, range: Week, previous: Week, today: string): ServerNumbers {
  const testGamesExcluded = ymdRange(range.start, range.end).reduce((a, d) => a + (all.testGames.get(d) ?? 0), 0);
  return {
    current: sumRange(all.daily, range),
    previous: sumRange(all.daily, previous),
    activation: { current: activationOf(all.joiners, range, today), previous: activationOf(all.joiners, previous, today) },
    daily: all.daily,
    testGamesExcluded,
    error: all.error,
  };
}
