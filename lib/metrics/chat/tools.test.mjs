// 챗봇 도구 시험: 훑어보기, 비율 지표, 긴 기간 (#163). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { ymdRange } from "../dates.ts";
import { bucketsOf, checkRange, metricsCompare, metricsOverview, metricsSummary, OVERVIEW_KEYS } from "./tools.ts";
import { METRICS } from "./catalog.ts";

const TODAY = "2026-10-09";
const zeroWeek = () => ({
  instagram: { posts: 0, views: 0, profileViews: 0, linkClicks: 0 },
  web: { sessions: 500, fromInstagram: 0, downloadClicks: 0, downloadLinkClicks: 40, downloadClicksFromInstagram: 0, storeSessions: 90, storeSessionsFromInstagram: 0, linkSessions: 40, linkSessionsFromInstagram: 0, internalSessions: 0 },
  installs: { appStoreNew: 0, firstOpenAndroid: 0, firstOpenIos: 0, firstOpenTest: 0 },
  game: { playerStarts: 0, playerFinishes: 0 },
  app: { dauAvg: null, dauSum: 0, androidRemoves: 0, androidPushOpens: 0, androidPushDismisses: 0 },
  cohort: { d1: { num: 0, den: 0 }, d7: { num: 0, den: 0 }, activation: { num: 12, den: 40 } },
  ads: { impressions: 0, matchedRequests: 0, earningsMicros: 0 },
  play: { installs: 0, installEvents: 0, uninstalls: 0, activeDevicesStart: null, activeDevicesEnd: null, storeVisitors: 0, storeAcquisitions: 0, crashes: 0, anrs: 0, ratingTotal: null },
  appStorePage: { impressions: 0, impressionsUnique: 0, pageViews: 0, pageViewsUnique: 0 },
});
const FRESH = { instagram: "2026-10-08", ga4web: "2026-10-08", ga4app: "2026-10-08", appstore: "2026-10-07", admob: "2026-10-08", play: "2026-10-05", playStore: "2026-09-29", appstorePage: "2026-10-07" };
const SINCE = Object.fromEntries(Object.keys(FRESH).map((k) => [k, "2026-04-01"]));
const ways = { search: 0, web: 0, app: 0, other: 0, total: 0 };

/** App Store 최초 다운로드: 평소 하루 3건, 9월 19일 주(9/15~9/21)만 하루 10건. 사이트 방문은 하루 20 */
function dash(range, previous) {
  const cur = zeroWeek();
  const prev = zeroWeek();
  prev.cohort.activation = { num: 10, den: 25 };
  const daily = ymdRange(range.start, range.end).map((day) => ({
    day,
    appStoreNew: day >= "2026-09-15" && day <= "2026-09-21" ? 10 : 3,
    webSessions: 20,
    firstOpenIos: 2,
  }));
  return Promise.resolve({
    range,
    previous,
    totals: { current: cur, previous: prev },
    daily,
    previousDaily: [],
    posts: [{ postedAt: "2026-09-16T03:00:00Z" }, { postedAt: "2026-09-17T03:00:00Z" }],
    webCampaigns: [],
    appCampaigns: [],
    channels: { current: [], previous: [] },
    countries: [],
    appStoreWays: { current: { ...ways, search: 7, web: 20, app: 3 }, previous: ways, quickDeletes: { current: { num: 0, den: 0, until: null }, previous: { num: 0, den: 0, until: null } } },
    appStoreTerritories: [],
    play: { until: "2026-10-05", window: null, storeUntil: null, storeWindow: null, current: cur.play, previous: prev.play, crashVersions: [] },
    followers: null,
    events: [{ id: 1, day: "2026-09-19", label: "서대페" }],
    games: null,
    funnel: { current: {}, previous: {} },
    freshness: FRESH,
    since: SINCE,
  });
}
const ctx = { today: TODAY, dashboard: dash, server: async () => null };

test("주 묶음: 처음과 끝은 걸친 날만, 월요일에 끊는다", () => {
  const { unit, buckets } = bucketsOf({ start: "2026-09-03", end: "2026-09-20" });
  assert.equal(unit, "week");
  assert.deepEqual(
    buckets.map((b) => [b.start, b.end, b.full]),
    [
      ["2026-09-03", "2026-09-06", false],
      ["2026-09-07", "2026-09-13", true],
      ["2026-09-14", "2026-09-20", true],
    ],
  );
});

test("지금의 전체(4월 1일부터 28주)는 주로, 30주가 넘으면 달로 묶는다", () => {
  assert.equal(bucketsOf({ start: "2026-04-01", end: "2026-10-08" }).unit, "week");
  const { unit, buckets } = bucketsOf({ start: "2026-02-01", end: "2026-10-08" });
  assert.equal(unit, "month");
  assert.equal(buckets.length, 9);
  // 2월은 28일까지라 다 찬 달
  assert.deepEqual([buckets[0].start, buckets[0].end, buckets[0].full], ["2026-02-01", "2026-02-28", true]);
  assert.deepEqual([buckets[8].start, buckets[8].end, buckets[8].full], ["2026-10-01", "2026-10-08", false]);
});

test("훑어보기: 주 합계와 전체 합계를 코드가 내고, 크게 움직인 주를 찾는다", async () => {
  const r = await metricsOverview(ctx, { start: "2026-09-01", end: "2026-10-04" }, ["appstore_new", "web_sessions"]);
  assert.equal(r.status, "ok");
  assert.equal(r.unit, "week");
  const a = r.metrics.find((m) => m.key === "appstore_new");
  // 9/1~9/6(6일) 18, 9/7~13 21, 9/14~20 은 9/14 하루 3 + 9/15~20 엿새 60, 9/21~27 은 9/21 10 + 18, 9/28~10/4 21
  assert.deepEqual(a.values, [18, 21, 63, 28, 21]);
  assert.equal(a.total, 151);
  // 21 -> 63 (+200%), 63 -> 28 (-55.6%)
  assert.deepEqual(
    r.movers.map((m) => [m.key, m.period.start, m.changePct]),
    [
      ["appstore_new", "2026-09-14", 200],
      ["appstore_new", "2026-09-21", -55.6],
    ],
  );
  assert.deepEqual(r.events, [{ day: "2026-09-19", label: "서대페" }]);
  assert.deepEqual(r.buckets.map((b) => b.posts), [0, 0, 2, 0, 0]);
  // 사이트 방문은 고르게 20 이라 움직인 주가 없다
  assert.ok(!r.movers.some((m) => m.key === "web_sessions"));
});

test("훑어보기: 덜 들어온 칸은 partial, 그 칸은 움직임 후보에서 뺀다", async () => {
  // App Store 는 10/7 까지만 들어왔다. 10/5~10/8 칸은 덜 들어왔다
  const r = await metricsOverview(ctx, { start: "2026-09-28", end: "2026-10-08" }, ["appstore_new"]);
  assert.deepEqual(r.metrics[0].partial, [false, true]);
  assert.deepEqual(r.movers, []);
});

test("훑어보기에는 날짜별로 있고 더할 수 있는 개수 지표만", () => {
  for (const k of OVERVIEW_KEYS) {
    const m = METRICS.find((x) => x.key === k);
    assert.ok(m.daily && m.additive && m.unit !== "%", k);
  }
  assert.ok(OVERVIEW_KEYS.includes("new_players"));
  assert.ok(!OVERVIEW_KEYS.includes("signup_activation"));
});

test("비율 지표: 분자, 분모를 같이 주고 두 기간 차이는 %p 로만", async () => {
  const w = { start: "2026-09-28", end: "2026-10-04" };
  const p = { start: "2026-09-21", end: "2026-09-27" };
  const s = await metricsSummary(ctx, w, ["activation_rate", "site_conversion"]);
  const act = s.metrics.find((m) => m.key === "activation_rate");
  assert.deepEqual([act.value, act.num, act.den, act.lowSample], [30, 12, 40, false]);
  // (90-40)/(500-40) = 10.9%
  assert.equal(s.metrics.find((m) => m.key === "site_conversion").value, 10.9);
  const c = await metricsCompare(ctx, w, p, ["activation_rate"]);
  const m = c.metrics[0];
  assert.deepEqual([m.a, m.b, m.diffPoints, m.changePct, m.lowSample], [30, 40, -10, null, true]);
  assert.deepEqual(m.aOf, { num: 12, den: 40 });
});

test("App Store 받은 길: 링크는 웹과 다른 앱을 더한다", async () => {
  const s = await metricsSummary(ctx, { start: "2026-09-28", end: "2026-10-04" }, ["appstore_from_link", "appstore_from_search", "download_link_clicks"]);
  assert.deepEqual(
    s.metrics.map((m) => m.value),
    [23, 7, 40],
  );
});

test("전체 기간(수집 시작부터)은 한 번에 볼 수 있다", () => {
  assert.equal(checkRange({ start: "2026-04-01", end: "2026-10-08" }, TODAY), null);
});

test("개발용 가짜 모델: 전체 질문은 훑어보기로, 보통 질문은 비교와 일정으로 답하고 검증을 통과한다", async () => {
  const { askMetrics } = await import("./run.ts");
  const { devMockModel } = await import("./devMock.ts");
  const { todayIn } = await import("../dates.ts");
  const live = { ...ctx, today: todayIn("Asia/Seoul") };
  const wide = await askMetrics({ model: devMockModel(), ctx: live, question: "지금까지 설치 추세 어때?" });
  assert.deepEqual(wide.tools.map((t) => t.name), ["metrics_overview"]);
  assert.deepEqual(wide.unverified, [], JSON.stringify(wide.problems));
  const week = await askMetrics({ model: devMockModel(), ctx: live, question: "지난주 어땠어?" });
  assert.deepEqual(week.tools.map((t) => t.name).sort(), ["events_list", "metrics_compare"]);
  assert.deepEqual(week.unverified, [], JSON.stringify(week.problems));
  const bad = await askMetrics({ model: devMockModel(), ctx: live, question: "지금까지 틀리게 말해 줘" });
  assert.ok(bad.unverified.includes("headline"));
});

test("날 수가 다른 두 기간은 앞에서부터 같은 날 수로 맞춘다", async () => {
  const { alignLengths } = await import("./tools.ts");
  const thisWeek = { start: "2026-10-05", end: "2026-10-10" };
  const lastWeek = { start: "2026-09-28", end: "2026-10-04" };
  const r = alignLengths(thisWeek, lastWeek);
  assert.deepEqual(r.a, thisWeek);
  assert.deepEqual(r.b, { start: "2026-09-28", end: "2026-10-03" });
  assert.match(r.note, /6일씩/);
  assert.equal(alignLengths(lastWeek, lastWeek).note, null);
});
