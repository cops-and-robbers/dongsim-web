// 유저 상세 "끝난 게임" 규칙 테스트 (BE #227). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FIRST_SHOWN,
  MAX_LIMIT,
  finishedGamesReducer as reduce,
  gameOutcome,
  initialFinishedGames as initial,
  limitFor,
  recordCounted,
  shownGames,
} from "./userGames.ts";

const games = (n) => Array.from({ length: n }, (_, i) => i);

test("처음엔 더 있는지 알려고 한 줄 더 묻고, 펼치면 백엔드 최댓값까지 묻는다", () => {
  assert.equal(limitFor(false), 21);
  assert.equal(limitFor(true), 100);
  assert.ok(limitFor(false) <= MAX_LIMIT);
});

test("딱 20판이면 더 보기가 없고 개수를 그대로 적는다", () => {
  const view = shownGames(games(FIRST_SHOWN), false);
  assert.equal(view.rows.length, 20);
  assert.equal(view.hasMore, false);
  assert.equal(view.countLabel, "20판");
});

test("21판이 오면 20판만 보여 주고 더 보기를 연다", () => {
  const view = shownGames(games(21), false);
  assert.equal(view.rows.length, 20);
  assert.equal(view.hasMore, true);
  assert.equal(view.countLabel, "최근 20판");
});

test("펼쳤을 때 100판보다 적으면 그게 전부다", () => {
  const view = shownGames(games(45), true);
  assert.equal(view.rows.length, 45);
  assert.equal(view.hasMore, false);
  assert.equal(view.capped, false);
  assert.equal(view.countLabel, "45판");
});

test("펼쳐서 100판을 채우면 그 뒤를 알 수 없어 최근이라고 적는다", () => {
  const view = shownGames(games(100), true);
  assert.equal(view.capped, true);
  assert.equal(view.countLabel, "최근 100판");
});

test("빈 목록은 0판이고 더 볼 것이 없다", () => {
  const view = shownGames([], false);
  assert.deepEqual(view.rows, []);
  assert.equal(view.hasMore, false);
  assert.equal(view.countLabel, "0판");
});

test("끝까지 있었으면 내 팀과 승리 팀으로 승패를 가른다", () => {
  assert.equal(gameOutcome({ team: "POLICE", winnerTeam: "POLICE", leftAt: null }), "win");
  assert.equal(gameOutcome({ team: "ROBBER", winnerTeam: "POLICE", leftAt: null }), "lose");
});

test("중도 퇴장은 팀이 이겼어도 승리로 적지 않는다", () => {
  assert.equal(gameOutcome({ team: "POLICE", winnerTeam: "POLICE", leftAt: "2026-10-01T10:00:00+09:00" }), "left");
});

test("승리 팀이 비어 있으면 승패를 지어내지 않는다", () => {
  assert.equal(gameOutcome({ team: "POLICE", winnerTeam: null, leftAt: null }), null);
});

test("v3.9.0 전에 끝난 판의 체포, 잡힘 횟수는 믿지 않는다", () => {
  assert.equal(recordCounted("2026-09-16T23:00:00+09:00"), false);
  assert.equal(recordCounted("2026-09-17T03:00:00+09:00"), true);
  assert.equal(recordCounted("2026-10-01T10:00:00+09:00"), true);
  assert.equal(recordCounted(null), false);
  assert.equal(recordCounted("이상한 값"), false);
});

const loadedFirst = reduce(initial, { type: "loaded", games: games(21), expanded: false });
const failed = (notDeployed, expanded) => ({ type: "failed", notDeployed, expanded });

test("첫 읽기에 실패하면 다시 시도할 수 있게 실패로 둔다", () => {
  assert.equal(reduce(initial, failed(false, false)).failure, "other");
});

test("다시 시도하면 실패를 지우고 다시 읽게 한다", () => {
  const next = reduce(reduce(initial, failed(false, false)), { type: "retry" });
  assert.equal(next.failure, null);
  assert.equal(next.attempt, 1);
});

test("배포 전이면 줄이 있어도 안내로 바꾼다", () => {
  assert.equal(reduce(initial, failed(true, false)).failure, "not-deployed");
  assert.equal(reduce(loadedFirst, failed(true, false)).failure, "not-deployed");
});

test("배포되어 읽기에 성공하면 안내가 사라지고 표가 나온다", () => {
  const next = reduce(reduce(initial, failed(true, false)), { type: "loaded", games: games(3), expanded: false });
  assert.equal(next.failure, null);
  assert.equal(next.loaded.games.length, 3);
});

test("펼치기에 실패하면 접고, 있던 줄과 실패 안내를 남긴다", () => {
  const expanding = reduce(loadedFirst, { type: "expand" });
  assert.equal(expanding.expanded, true);
  const next = reduce(expanding, failed(false, true));
  assert.equal(next.expanded, false);
  assert.equal(next.failure, "more");
  assert.equal(next.loaded.games.length, 21);
});

test("접으면서 다시 읽어도 더 보기 실패 안내는 남고, 다시 누르면 사라진다", () => {
  const failedMore = reduce(reduce(loadedFirst, { type: "expand" }), failed(false, true));
  const reread = reduce(failedMore, { type: "loaded", games: games(21), expanded: false });
  assert.equal(reread.failure, "more");
  assert.equal(reduce(reread, { type: "expand" }).failure, null);
});

test("펼친 뒤 다시 받다 실패하면 접지 않고 줄을 그대로 둔다", () => {
  const shown = reduce(reduce(loadedFirst, { type: "expand" }), { type: "loaded", games: games(45), expanded: true });
  const next = reduce(shown, failed(false, true));
  assert.equal(next, shown);
});

test("처음 크기로 다시 받다 실패해도 줄을 그대로 둔다", () => {
  assert.equal(reduce(loadedFirst, failed(false, false)), loadedFirst);
});
