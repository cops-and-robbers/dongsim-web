// 게임 서버 집계 시험 (#165). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { activationOf, headcount, kindOf, serverNumbers, staffOf, tallyServer } from "./gameServer.ts";

const admins = new Set(["1", "2"]);
const users = [
  { id: "1", role: "ADMIN", createdAt: "2026-04-01T01:00:00Z" },
  { id: "10", role: "USER", createdAt: "2026-09-19T03:00:00Z" },
  { id: "11", role: "USER", createdAt: "2026-09-19T16:30:00Z" }, // 한국 9/20 01:30
  { id: "11", role: "USER", createdAt: "2026-09-19T16:30:00Z" }, // 쪽 경계에서 두 번 읽힘
];
const g = (id, at, parts, police = 2, robber = 3) => ({ id, startedAt: at, createdAt: at, totalPoliceCount: police, totalRobberCount: robber, participants: parts.map((userId) => ({ userId })) });
const histories = [
  g("a", "2026-09-19T05:00:00Z", ["10", "11", "1"]),
  g("b", "2026-09-19T06:00:00Z", ["1", "2"]), // 관리자만: 시험 판
  g("c", "2026-08-01T05:00:00Z", []), // 참가자 기록 전: 가릴 수 없어 센다
  g("a", "2026-09-19T05:00:00Z", ["10", "11", "1"]), // 중복
];

test("판 가르기: 운영진만, 섞임, 사용자만, 참가자 기록 전", () => {
  assert.equal(kindOf(histories[1], admins), "staff");
  assert.equal(kindOf(histories[0], admins), "mixed");
  assert.equal(kindOf(g("u", "2026-09-19T05:00:00Z", ["10", "11"]), admins), "users");
  assert.equal(kindOf(histories[2], admins), "unknown");
});

test("운영진은 ADMIN 권한과 따로 넣은 계정, 인원은 시작 명단에서 운영진을 뺀 수", () => {
  const staff = staffOf(users, ["10"]);
  assert.deepEqual([...staff].sort(), ["1", "10"]);
  // 명단 3명 중 운영진 1명. 끝까지 남은 수(2+3)가 아니라 명단으로 센다
  assert.deepEqual(headcount(histories[0], admins), { visitors: 2, staff: 1 });
  // 명단이 없으면 끝까지 남은 경찰, 도둑 수
  assert.deepEqual(headcount(histories[2], admins), { visitors: 5, staff: 0 });
});

test("날짜별로 세고, 운영진 가입과 운영진만 한 판은 빼고, 중복은 한 번만", () => {
  const { daily, staffGames, joiners, games } = tallyServer(users, histories, admins);
  assert.deepEqual(daily.get("2026-09-19"), { games: 1, players: 2, signups: 1, newPlayers: 2 });
  assert.deepEqual(daily.get("2026-09-20"), { games: 0, players: 0, signups: 1, newPlayers: 0 });
  assert.deepEqual(daily.get("2026-08-01"), { games: 1, players: 5, signups: 0, newPlayers: 0 });
  assert.equal(staffGames.get("2026-09-19"), 1);
  assert.equal(daily.has("2026-04-01"), false);
  // 판 요약은 중복 없이 시각순, 운영진만 한 판도 담는다(행사 성적표가 운영진 판을 따로 센다)
  assert.deepEqual(games.map((x) => [x.kind, x.visitors, x.staff]), [["unknown", 5, 0], ["mixed", 2, 1], ["staff", 0, 2]]);
  const s = serverNumbers({ daily, staffGames, joiners, games, error: null }, { start: "2026-09-14", end: "2026-09-20" }, { start: "2026-09-07", end: "2026-09-13" }, "2026-10-09");
  assert.deepEqual(s.current, { games: 1, players: 2, signups: 2, newPlayers: 2 });
  assert.deepEqual(s.activation.current, { num: 2, den: 2 });
  assert.equal(s.staffGamesExcluded, 1);
});

test("새 가입자 첫 판: 참가자 기록 전 가입자는 세지 않고, 시험 판 참가는 첫 판이 아니다", () => {
  const us = [
    { id: "1", role: "ADMIN", createdAt: "2026-04-01T01:00:00Z" },
    { id: "20", role: "USER", createdAt: "2026-07-01T03:00:00Z" }, // 기록 전 가입
    { id: "21", role: "USER", createdAt: "2026-09-01T03:00:00Z" },
  ];
  const hs = [
    g("t", "2026-09-02T05:00:00Z", ["1", "21"].slice(0, 1)), // 관리자만: 시험 판
    g("x", "2026-09-05T05:00:00Z", ["20", "21"]),
    g("y", "2026-09-03T05:00:00Z", ["21"]),
  ];
  const { daily, joiners } = tallyServer(us, hs, admins);
  assert.deepEqual(joiners, [{ signupDay: "2026-09-01", firstGameDay: "2026-09-03" }]);
  assert.equal(daily.get("2026-09-03").newPlayers, 1);
  assert.equal(daily.get("2026-09-05").newPlayers, 0);
});

test("가입 후 7일 안 첫 판 비율: 7일이 다 지난 가입자만 분모에", () => {
  const js = [
    { signupDay: "2026-09-01", firstGameDay: "2026-09-07" }, // 7일째(가입일 포함) 첫 판: 셈
    { signupDay: "2026-09-01", firstGameDay: "2026-09-08" }, // 8일째: 안 셈
    { signupDay: "2026-09-02", firstGameDay: null },
    { signupDay: "2026-09-30", firstGameDay: "2026-09-30" }, // 10/6 기준 아직 7일이 안 지남
  ];
  const w = { start: "2026-09-01", end: "2026-09-30" };
  assert.deepEqual(activationOf(js, w, "2026-10-06"), { num: 1, den: 3 });
  assert.deepEqual(activationOf(js, w, "2026-10-07"), { num: 2, den: 4 });
});
