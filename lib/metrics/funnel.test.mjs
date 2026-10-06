import { test } from "node:test";
import assert from "node:assert/strict";
import { funnelByCountry, funnelData, pickFunnel, weakestStep } from "./funnel.ts";

const f = (day, key, value) => ({ property: "app", day, breakdown: "funnel", key, metric: "users", value });

// 9/8 은 둘째 주까지 지난 날(표시 줄), 9/9 는 첫 주만 지난 날. 9/10 줄은 기간 밖
const ROWS = [
  f("2026-09-08", "open|iOS|KR", 10),
  f("2026-09-08", "login|iOS|KR", 9),
  f("2026-09-08", "room|iOS|KR", 6),
  f("2026-09-08", "play|iOS|KR", 4),
  f("2026-09-08", "replay|iOS|KR", 1),
  f("2026-09-08", "replay|-|-", 0),
  f("2026-09-08", "open|Android|(not set)", 7), // 테스트 기기
  f("2026-09-08", "login|Android|(not set)", 1),
  f("2026-09-09", "open|Android|JP", 5),
  f("2026-09-09", "login|Android|JP", 5),
  f("2026-09-09", "room|Android|JP", 2),
  f("2026-09-09", "play|Android|JP", 2),
  f("2026-09-09", "open|iOS|US", 3),
  f("2026-09-10", "open|iOS|KR", 99),
];
const R = { start: "2026-09-08", end: "2026-09-09" };

test("고른 나라를 합치고, 다음 주에도 플레이는 둘째 주까지 지난 날만 분모로", () => {
  const d = funnelData(ROWS, R, "2026-10-05");
  const t = pickFunnel(d, { platform: "all", countries: ["KR", "JP"] });
  assert.deepEqual(
    t.steps.map((s) => s.users),
    [15, 14, 8, 6],
  );
  // 9/9 에 게임한 2명은 둘째 주가 안 지나 분모에서 뺀다
  assert.deepEqual(t.replay, { users: 1, of: 4, days: { start: "2026-09-08", end: "2026-09-08" } });
  assert.deepEqual(t.cohorts, { start: "2026-09-08", end: "2026-09-09" });
  assert.equal(t.waiting, null);
});

test("플랫폼과 나라 여럿을 골라 합친다", () => {
  const d = funnelData(ROWS, R, "2026-10-05");
  assert.deepEqual(pickFunnel(d, { platform: "Android", countries: ["KR", "JP"] }).steps.map((s) => s.users), [5, 5, 2, 2]);
  assert.deepEqual(pickFunnel(d, { platform: "all", countries: ["KR", "JP", "US", "(not set)"] }).steps.map((s) => s.users), [25, 15, 8, 6]);
  assert.deepEqual(pickFunnel(d, { platform: "all", countries: "all" }).steps.map((s) => s.users), [25, 15, 8, 6]); // 표시 줄은 안 센다
  assert.deepEqual(pickFunnel(d, { platform: "all", countries: ["(not set)"] }).steps.map((s) => s.users), [7, 1, 0, 0]);
  assert.deepEqual(pickFunnel(d, { platform: "all", countries: ["KR", "US"] }).steps.map((s) => s.users), [13, 9, 6, 4]);
  assert.deepEqual(pickFunnel(d, { platform: "all", countries: [] }).steps.map((s) => s.users), [0, 0, 0, 0]);
});

test("아직 7일이 안 지난 날과 로그인 기록 전의 날은 넣지 않는다고 밝힌다", () => {
  // 마지막 날 9/12 면 9/6 까지만 7일이 다 지났다
  const d = funnelData(ROWS, { start: "2026-09-01", end: "2026-09-09" }, "2026-09-12");
  assert.deepEqual(d.cohorts, { start: "2026-09-01", end: "2026-09-06" });
  assert.deepEqual(d.waiting, { start: "2026-09-07", end: "2026-09-09" });
  const old = funnelData([], { start: "2026-06-01", end: "2026-06-20" }, "2026-10-05");
  assert.deepEqual(old.cohorts, { start: "2026-06-17", end: "2026-06-20" });
  const none = funnelData([], { start: "2026-06-01", end: "2026-06-10" }, "2026-10-05");
  assert.equal(none.cohorts, null);
  assert.equal(none.replayDays, null);
});

test("나라별 표는 첫 실행이 많은 순, 첫 실행이 없는 나라는 뺀다", () => {
  const d = funnelData(ROWS, R, "2026-10-05");
  assert.deepEqual(
    funnelByCountry(d, "all").map((x) => [x.country, x.steps.open, x.steps.play]),
    [
      ["KR", 10, 4],
      ["(not set)", 7, 0],
      ["JP", 5, 2],
      ["US", 3, 0],
    ],
  );
  assert.deepEqual(funnelByCountry(d, "iOS").map((x) => x.country), ["KR", "US"]);
});

test("가장 많이 빠지는 단계는 앞 단계 대비가 가장 낮은 곳, 사람이 적으면 짚지 않는다", () => {
  const steps = (n) => ["open", "login", "room", "play"].map((key, i) => ({ key, users: n[i] }));
  assert.equal(weakestStep(steps([99, 91, 75, 51]), 30), "play"); // 92%, 82%, 68%
  assert.equal(weakestStep(steps([100, 50, 45, 40]), 30), "login");
  assert.equal(weakestStep(steps([100, 90, 20, 18]), 30), null); // 방 입장 20명이 다음 단계의 분모라 흔들린다
});
