// 게임 서버 집계와 추천 질문 시험 (#163). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { isTestGame, serverNumbers, tallyServer } from "./server.ts";
import { dataSuggestions } from "./suggest.ts";
import { namedPeriods } from "./periods.ts";

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

test("관리자만 참가한 판이 시험 판, 참가자 기록이 없으면 시험 판이 아니다", () => {
  assert.equal(isTestGame(histories[1], admins), true);
  assert.equal(isTestGame(histories[0], admins), false);
  assert.equal(isTestGame(histories[2], admins), false);
});

test("날짜별로 세고, 관리자 가입과 시험 판은 빼고, 중복은 한 번만", () => {
  const { daily, testGames } = tallyServer(users, histories, admins);
  assert.deepEqual(daily.get("2026-09-19"), { games: 1, players: 5, signups: 1 });
  assert.deepEqual(daily.get("2026-09-20"), { games: 0, players: 0, signups: 1 });
  assert.deepEqual(daily.get("2026-08-01"), { games: 1, players: 5, signups: 0 });
  assert.equal(testGames.get("2026-09-19"), 1);
  assert.equal(daily.has("2026-04-01"), false);
  const s = serverNumbers({ daily, testGames, error: null }, { start: "2026-09-14", end: "2026-09-20" }, { start: "2026-09-07", end: "2026-09-13" });
  assert.deepEqual(s.current, { games: 1, players: 5, signups: 2 });
  assert.equal(s.testGamesExcluded, 1);
});

test("추천 질문: 표본이 충분하고 크게 움직인 지표, 최근 행사", () => {
  const rows = [
    { key: "a", label: "iOS 앱 첫 실행", a: 60, b: 30, changePct: 100 },
    { key: "b", label: "인스타 조회", a: 9, b: 2, changePct: 350 }, // 표본 적음
    { key: "c", label: "사이트 방문", a: 100, b: 90, changePct: 11.1 }, // 덜 움직임
  ];
  const s = dataSuggestions(rows, [{ day: "2026-09-19", label: "서대페" }, { day: "2026-10-03", label: "청춘대로" }]);
  assert.deepEqual(s, ["최근 7일 iOS 앱 첫 실행이(가) 늘었는데, 같은 기간에 무슨 일이 있었어?", "청춘대로(10월 3일) 앞뒤로 설치, 가입, 게임이 어땠어?"]);
});

test("기간 풀이: 오늘이 목요일 10/9", () => {
  const p = Object.fromEntries(namedPeriods("2026-10-09").map((x) => [x.label, `${x.start}~${x.end}`]));
  assert.equal(p["어제"], "2026-10-08~2026-10-08");
  assert.equal(p["지난주(월~일)"], "2026-09-28~2026-10-04");
  assert.equal(p["이번 주(월~어제)"], "2026-10-05~2026-10-08");
  assert.equal(p["이번 달(1일~어제)"], "2026-10-01~2026-10-08");
  assert.equal(p["지난달"], "2026-09-01~2026-09-30");
});

test("기간 풀이: 월요일과 1일에는 '이번 주', '이번 달'이 없다", () => {
  const mon = namedPeriods("2026-10-05").map((x) => x.label);
  assert.ok(!mon.includes("이번 주(월~어제)"));
  const first = namedPeriods("2026-10-01").map((x) => x.label);
  assert.ok(!first.includes("이번 달(1일~어제)"));
  assert.equal(namedPeriods("2026-01-15").find((x) => x.label === "지난달").start, "2025-12-01");
});
