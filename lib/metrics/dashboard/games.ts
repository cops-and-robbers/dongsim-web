/**
 * 실제 판 수 (#145). 백엔드 게임 기록(adminGameHistories)을 기간만큼 읽어 날짜별로 센다.
 *
 * 앱 이벤트(game_start, game_over)는 참가자 폰마다 찍혀서 판 수가 아니다(5명이 한 판 하면 5).
 * 진짜 판 수와 판당 인원은 백엔드에만 있고, 그 API 는 어드민 토큰으로만 열린다.
 * 그래서 수집기(크론)가 아니라 어드민 화면을 여는 순간 라우트가 그 사람의 토큰으로 읽는다.
 *
 * 기록 하나는 끝난 판(라운드) 하나다. 다시하기로 이어진 판도 따로 센다.
 * 최신순 100개씩 넘기다 기간 첫날보다 앞선 기록이 나오면 멈춘다. 너무 많으면 MAX_PAGES 에서 끊고 알린다.
 */

import { ymdRange } from "../dates.ts";
import type { Week } from "../weekly/numbers.ts";
import type { GamesBlock } from "./data.ts";

const PAGE_SIZE = 100; // 백엔드 최대(@Max(100))
const MAX_PAGES = 40;

const QUERY = `query MetricsGames($page: Int!) {
  adminGameHistories(page: $page, size: ${PAGE_SIZE}, sortDirection: DESC) {
    content { id startedAt createdAt totalPoliceCount totalRobberCount }
    totalPages
  }
}`;

type History = { id?: string; startedAt: string | null; createdAt: string; totalPoliceCount: number; totalRobberCount: number };

const seoulDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso));

/** 기록 하나가 어느 날 판인가. 시작 시각(없으면 기록 시각)의 한국 날짜 */
export const dayOf = (h: History) => seoulDay(h.startedAt ?? h.createdAt);

/** 날짜별 판 수와 참가 인원 합 */
export function tally(histories: History[]): Map<string, { games: number; players: number }> {
  const by = new Map<string, { games: number; players: number }>();
  // 쪽을 넘기는 사이 새 판이 끝나면 쪽 경계가 한 칸 밀려 같은 기록을 두 번 읽는다. id 로 한 번만 센다
  const seen = new Set<string>();
  for (const h of histories) {
    if (h.id) {
      if (seen.has(h.id)) continue;
      seen.add(h.id);
    }
    const day = dayOf(h);
    const cur = by.get(day) ?? { games: 0, players: 0 };
    cur.games += 1;
    cur.players += h.totalPoliceCount + h.totalRobberCount;
    by.set(day, cur);
  }
  return by;
}

/** 날짜별 숫자를 이번 기간과 이전 기간으로 나눈다 */
export function summarize(by: Map<string, { games: number; players: number }>, range: Week, previous: Week, error: string | null): GamesBlock {
  const total = (w: Week) =>
    ymdRange(w.start, w.end).reduce(
      (a, d) => ({ games: a.games + (by.get(d)?.games ?? 0), players: a.players + (by.get(d)?.players ?? 0) }),
      { games: 0, players: 0 },
    );
  return {
    current: total(range),
    previous: total(previous),
    daily: ymdRange(range.start, range.end).map((d) => by.get(d)?.games ?? 0),
    previousDaily: ymdRange(previous.start, previous.end).map((d) => by.get(d)?.games ?? 0),
    error,
  };
}

export async function loadGames(apiBase: string, token: string, range: Week, previous: Week): Promise<GamesBlock> {
  const all: History[] = [];
  let error: string | null = null;
  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await fetch(`${apiBase}/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: QUERY, variables: { page }, operationName: "MetricsGames" }),
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
      const body = (await res.json().catch(() => ({}))) as {
        data?: { adminGameHistories?: { content: History[]; totalPages: number } };
        errors?: { message?: string }[];
      };
      const data = body.data?.adminGameHistories;
      if (!res.ok || !data) throw new Error(body.errors?.[0]?.message ?? `HTTP ${res.status}`);
      all.push(...data.content);
      const oldest = data.content.at(-1);
      // 기록 시각 최신순이라, 한 쪽의 마지막이 이전 기간 첫날보다 앞서면 더 볼 필요가 없다
      if (!oldest || seoulDay(oldest.createdAt) < previous.start || page + 1 >= data.totalPages) break;
      if (page + 1 === MAX_PAGES) error = `기록이 많아 최근 ${MAX_PAGES * PAGE_SIZE}판까지만 셌어요`;
    }
  } catch (e) {
    error = `게임 기록을 못 읽었어요 (${e instanceof Error ? e.message : String(e)})`;
  }
  return summarize(tally(all), range, previous, error);
}
