// 온라인 게임 모니터링 판정 규칙 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { gamesByHour, gamesToday, issuesOf, recentMedianRtt, rttOf, summarize, untilReset, whenLabel } from "./webgameMonitor.ts";

const base = { winner: "police", reason: "allArrested", police: 2, robbers: 4, humans: 5, scale: 1.1, theme: "town", sec: 120, catches: 4, rescues: 1, reveals: 3 };
const net = (p50, p95, rejoins = 0, samples = 40) => ({ team: "robber", p50, p95, max: p95, samples, rejoins });

test("왕복 시간: 사람별 중간값의 중간과 가장 나쁜 95번째", () => {
  const r = { ...base, at: 0, net: [net(40, 60), net(80, 300), net(50, 90)] };
  assert.deepEqual(rttOf(r), { median: 50, worst: 300 });
});

test("예전 판(네트워크 기록 없음)과 잰 적 없는 사람은 빼고 본다", () => {
  assert.deepEqual(rttOf({ ...base, at: 0 }), { median: null, worst: null });
  assert.deepEqual(rttOf({ ...base, at: 0, net: [net(null, null, 0, 0)] }), { median: null, worst: null });
  assert.deepEqual(issuesOf({ ...base, at: 0 }), []);
});

test("눈여겨볼 것: 느림, 아주 느림, 끊김, 서버 밀림을 글자와 함께 알린다", () => {
  const slow = issuesOf({ ...base, at: 0, net: [net(40, 260)] });
  assert.deepEqual(slow.map((i) => [i.kind, i.tone, i.text]), [["slow", "amber", "왕복 260ms"]]);
  const bad = issuesOf({ ...base, at: 0, net: [net(40, 520, 2)], tick: { maxGapMs: 640, lateTicks: 3, ticks: 3000 } });
  assert.deepEqual(bad.map((i) => [i.kind, i.tone, i.text]), [
    ["bad", "red", "왕복 520ms"],
    ["rejoin", "amber", "끊김 2번"],
    ["lag", "red", "서버 밀림 3번"],
  ]);
  assert.deepEqual(issuesOf({ ...base, at: 0, net: [net(30, 80)], tick: { maxGapMs: 60, lateTicks: 0, ticks: 3000 } }), []);
});

test("시간대별: 최근 24칸, 마지막 칸이 지금 시각", () => {
  const now = Date.parse("2026-11-08T10:30:00Z");
  const bins = gamesByHour(
    [
      { ...base, at: Date.parse("2026-11-08T10:05:00Z") },
      { ...base, at: Date.parse("2026-11-08T10:20:00Z") },
      { ...base, at: Date.parse("2026-11-07T11:10:00Z") },
      { ...base, at: Date.parse("2026-11-07T09:59:00Z") }, // 24시간 밖
    ],
    now,
  );
  assert.equal(bins.length, 24);
  assert.equal(bins[23].games, 2);
  assert.equal(bins[0].start, Date.parse("2026-11-07T11:00:00Z"));
  assert.equal(bins[0].games, 1);
  assert.equal(bins.reduce((n, b) => n + b.games, 0), 3);
});

test("오늘 판 수는 한국 날짜로 센다", () => {
  const now = Date.parse("2026-11-08T00:30:00Z"); // 한국 9시 30분
  const results = [
    { ...base, at: Date.parse("2026-11-07T15:10:00Z") }, // 한국 11/8 0시 10분
    { ...base, at: Date.parse("2026-11-07T14:50:00Z") }, // 한국 11/7 23시 50분
  ];
  assert.equal(gamesToday(results, now), 1);
});

test("최근 중간 왕복 시간은 최근 판들의 사람별 중간값에서 고른다", () => {
  const results = [
    { ...base, at: 3, net: [net(40, 60), net(60, 90)] },
    { ...base, at: 2 },
    { ...base, at: 1, net: [net(50, 70)] },
  ];
  assert.equal(recentMedianRtt(results), 50);
  assert.equal(recentMedianRtt([{ ...base, at: 1 }]), null);
});


test("맨 위 한 줄 답: 최근 24시간 판만 보고, 문제 종류별로 센다", () => {
  const now = Date.parse("2026-11-08T10:00:00Z");
  const h = 3_600_000;
  const results = [
    { ...base, at: now - 1 * h, net: [net(40, 60)] },
    { ...base, at: now - 2 * h, net: [net(40, 520, 1)] },
    { ...base, at: now - 3 * h, net: [net(40, 260)], tick: { maxGapMs: 200, lateTicks: 2, ticks: 3000 } },
    { ...base, at: now - 30 * h, net: [net(40, 900, 3)] }, // 24시간 밖
  ];
  assert.deepEqual(summarize(results, now, null), { tone: "warn", games: 3, flagged: 2, counts: { slow: 2, rejoin: 1, lag: 1 }, usageOver: false });
  assert.equal(summarize([results[0]], now, null).tone, "good");
  assert.equal(summarize([], now, null).tone, "idle");
  assert.equal(summarize([results[0]], now, { requests: 70_000, gbs: 0, at: now }).tone, "warn");
});

test("시각 표시는 오늘, 어제, 그 전을 한국 날짜로 나눈다", () => {
  const now = Date.parse("2026-11-08T03:00:00Z"); // 한국 11/8 12시
  assert.equal(whenLabel(Date.parse("2026-11-07T16:34:00Z"), now), "오늘 01:34");
  assert.equal(whenLabel(Date.parse("2026-11-07T07:40:00Z"), now), "어제 16:40");
  assert.equal(whenLabel(Date.parse("2026-11-05T03:00:00Z"), now), "11.05 12:00");
});

test("사용량 초기화까지 남은 시간은 UTC 0시 기준", () => {
  assert.deepEqual(untilReset(Date.parse("2026-11-08T21:30:00Z")), { hours: 2, minutes: 30 });
});
