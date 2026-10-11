/**
 * 지표 화면의 실제 판 수 (#145, #165). 백엔드 게임 기록을 행사 성적표와 같은 함수(gameServer.ts)로 센다.
 *
 * 앱 이벤트(game_start, game_over)는 참가자 폰마다 찍혀서 판 수가 아니다(5명이 한 판 하면 5).
 * 진짜 판 수와 판당 인원은 백엔드에만 있고, 그 API 는 어드민 토큰으로만 열린다.
 * 그래서 수집기(크론)가 아니라 어드민 화면을 여는 순간 라우트가 그 사람의 토큰으로 읽는다.
 *
 * 기록 하나는 끝난 판(라운드) 하나다. 다시하기로 이어진 판도 따로 센다. 판의 날짜는 시작한 한국 날짜다.
 * 운영진만 한 판은 빼고, 참가 인원에서 운영진도 뺀다(gameServer.ts). 뺀 판 수는 화면에 같이 적는다
 */

import { ymdRange } from "../dates.ts";
import { sumRange, type ServerDaily } from "../gameServer.ts";
import type { Week } from "../weekly/numbers.ts";
import type { GamesBlock } from "./data.ts";

export function gamesBlock(all: ServerDaily, range: Week, previous: Week): GamesBlock {
  const pick = (w: Week) => {
    const s = sumRange(all.daily, w);
    return { games: s.games, players: s.players };
  };
  const staff = (w: Week) => ymdRange(w.start, w.end).reduce((a, d) => a + (all.staffGames.get(d) ?? 0), 0);
  const daily = (w: Week) => ymdRange(w.start, w.end).map((d) => all.daily.get(d)?.games ?? 0);
  return {
    current: pick(range),
    previous: pick(previous),
    daily: daily(range),
    previousDaily: daily(previous),
    staffGames: { current: staff(range), previous: staff(previous) },
    error: all.error ? `게임 기록을 못 읽었어요 (${all.error})` : null,
  };
}
