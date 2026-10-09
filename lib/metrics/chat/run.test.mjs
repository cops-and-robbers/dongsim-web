// 챗봇 흐름 시험 (#163). 진짜 모델 없이 가짜 모델(MockLanguageModelV4)로 단계를 정해 두고 돌린다. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { MockLanguageModelV4 } from "ai/test";
import { askMetrics } from "./run.ts";
import { metricsCompare, checkRange, eventWindow, metricsDaily } from "./tools.ts";

const TODAY = "2026-10-09";
const zeroWeek = () => ({
  instagram: { posts: 0, views: 0, profileViews: 0, linkClicks: 0 },
  web: { sessions: 0, fromInstagram: 0, downloadClicks: 0, downloadLinkClicks: 0, downloadClicksFromInstagram: 0, storeSessions: 0, storeSessionsFromInstagram: 0, linkSessions: 0, linkSessionsFromInstagram: 0, internalSessions: 0 },
  installs: { appStoreNew: 0, firstOpenAndroid: 0, firstOpenIos: 0, firstOpenTest: 0 },
  game: { playerStarts: 0, playerFinishes: 0 },
  app: { dauAvg: null, dauSum: 0, androidRemoves: 0, androidPushOpens: 0, androidPushDismisses: 0 },
  cohort: { d1: { num: 0, den: 0 }, d7: { num: 0, den: 0 }, activation: { num: 0, den: 0 } },
  ads: { impressions: 0, matchedRequests: 0, earningsMicros: 0 },
  play: { installs: 0, installEvents: 0, uninstalls: 0, activeDevicesStart: null, activeDevicesEnd: null, storeVisitors: 0, storeAcquisitions: 0, crashes: 0, anrs: 0, ratingTotal: null },
  appStorePage: { impressions: 0, impressionsUnique: 0, pageViews: 0, pageViewsUnique: 0 },
});
const FRESH = { instagram: "2026-10-08", ga4web: "2026-10-08", ga4app: "2026-10-08", appstore: "2026-10-07", admob: "2026-10-08", play: "2026-10-05", playStore: "2026-09-29", appstorePage: "2026-10-07" };
const SINCE = Object.fromEntries(Object.keys(FRESH).map((k) => [k, "2026-04-01"]));

/** 기간 시작일로 숫자를 정하는 가짜 집계. 지난주(9/28~)는 iOS 다운로드 42, 그 전주(9/21~)는 30 */
function fakeDashboard(range, previous) {
  const cur = zeroWeek();
  const prev = zeroWeek();
  const byStart = { "2026-09-28": 42, "2026-09-21": 30, "2026-09-19": 25, "2026-09-12": 9 };
  cur.installs.appStoreNew = byStart[range.start] ?? 5;
  prev.installs.appStoreNew = byStart[previous.start] ?? 5;
  cur.installs.firstOpenIos = 37;
  prev.installs.firstOpenIos = 45;
  return Promise.resolve({
    range, previous, totals: { current: cur, previous: prev },
    daily: [], previousDaily: [], posts: [], webCampaigns: [], appCampaigns: [], channels: { current: [], previous: [] }, countries: [],
    appStoreWays: { current: { search: 0, web: 0, app: 0, other: 0, total: 0 }, previous: { search: 0, web: 0, app: 0, other: 0, total: 0 }, quickDeletes: { current: { num: 0, den: 0, until: null }, previous: { num: 0, den: 0, until: null } } },
    appStoreTerritories: [],
    play: { until: "2026-10-05", window: null, storeUntil: null, storeWindow: null, current: cur.play, previous: prev.play, crashVersions: [] },
    followers: null,
    events: [{ id: 1, day: "2026-09-19", label: "서대페" }, { id: 2, day: "2026-09-20", label: "청춘대로" }],
    games: null, funnel: { current: {}, previous: {} }, freshness: FRESH, since: SINCE,
  });
}
const ctx = { today: TODAY, dashboard: fakeDashboard, server: async () => null };

const usage = { inputTokens: { total: 1000, noCache: 1000, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 200, text: 200, reasoning: undefined } };
const toolCall = (id, name, input) => ({ content: [{ type: "tool-call", toolCallId: id, toolName: name, input: JSON.stringify(input) }], finishReason: { unified: "tool-calls", raw: undefined }, usage, warnings: [] });
const final = (answer) => ({ content: [{ type: "text", text: JSON.stringify(answer) }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] });
const model = (...steps) => {
  let i = 0;
  const calls = [];
  const m = new MockLanguageModelV4({ doGenerate: async (opts) => (calls.push(opts), steps[Math.min(i++, steps.length - 1)]) });
  return { m, calls };
};
const compareCall = toolCall("call-1", "metrics_compare", {
  periodA: { start: "2026-09-28", end: "2026-10-04" },
  periodB: { start: "2026-09-21", end: "2026-09-27" },
  metrics: ["appstore_new", "first_open_ios"],
});
const answer = (headline, facts = [], hypotheses = []) => ({ headline: { text: headline, refs: ["call-1"] }, facts: facts.map((t) => ({ text: t, refs: ["call-1"] })), hypotheses, caveats: [], followUps: ["지난달과 이번 달을 비교해 줄래요?"] });

test("도구 결과: 차이와 증감률은 코드가 계산한다", async () => {
  const r = await metricsCompare(ctx, { start: "2026-09-28", end: "2026-10-04" }, { start: "2026-09-21", end: "2026-09-27" }, ["appstore_new", "first_open_ios"]);
  const a = r.metrics.find((m) => m.key === "appstore_new");
  assert.deepEqual([a.a, a.b, a.diff, a.changePct, a.lowSample], [42, 30, 12, 40, false]);
  const i = r.metrics.find((m) => m.key === "first_open_ios");
  assert.equal(i.changePct, -17.8);
});

test("도구 결과: 오늘, 데이터 시작 전, 뒤집힌 기간은 unsupported", async () => {
  assert.match(checkRange({ start: "2026-10-01", end: "2026-10-09" }, TODAY), /어제/);
  assert.match(checkRange({ start: "2026-03-01", end: "2026-03-05" }, TODAY), /2026-04-01/);
  assert.match(checkRange({ start: "2026-10-05", end: "2026-10-01" }, TODAY), /늦어요/);
});

test("도구 결과: 날짜별 값은 소스 마지막 날 뒤를 null 로", async () => {
  const r = await metricsDaily(ctx, "play_installs", { start: "2026-10-03", end: "2026-10-07" });
  assert.deepEqual(r.series.map((p) => p.value === null), [false, false, false, true, true]);
});

test("도구 결과: 행사 창은 앞 주 같은 요일과 비교하고 겹친 일정을 알려 준다", async () => {
  const r = await eventWindow(ctx, "2026-09-19", 2);
  assert.deepEqual(r.baselinePeriod, { start: "2026-09-12", end: "2026-09-13" });
  assert.deepEqual(r.eventsInEventPeriod.map((e) => e.label), ["서대페", "청춘대로"]);
  const a = r.metrics.find((m) => m.key === "appstore_new");
  assert.deepEqual([a.a, a.b, a.lowSample], [25, 9, true]);
});

test("흐름: 도구로 확인한 숫자만 말하면 한 번에 통과", async () => {
  const { m, calls } = model(compareCall, final(answer("지난주 App Store 최초 다운로드는 42건으로 그 전주보다 40% 늘었어요", ["iOS 앱 첫 실행은 37회로 17.8% 줄었어요"])));
  const r = await askMetrics({ model: m, ctx, question: "지난주 iOS 어땠어?" });
  assert.equal(r.retried, false);
  assert.deepEqual(r.unverified, []);
  assert.equal(r.tools[0].id, "call-1");
  assert.equal(calls.length, 2);
  // 지시문에 서버가 푼 기간이 들어갔다
  assert.match(JSON.stringify(calls[0].prompt), /지난주\(월~일\): 2026-09-28 ~ 2026-10-04/);
});

test("흐름: 지어낸 숫자는 한 번 다시 쓰게 하고, 고치면 통과", async () => {
  const { m, calls } = model(compareCall, final(answer("지난주 다운로드는 50건이에요")), final(answer("지난주 다운로드는 42건이에요")));
  const r = await askMetrics({ model: m, ctx, question: "지난주 다운로드?" });
  assert.equal(r.retried, true);
  assert.deepEqual(r.unverified, []);
  assert.equal(calls.length, 3);
  // 다시 쓰기 요청에는 도구를 주지 않고, 걸린 숫자를 알려 준다
  assert.equal(calls[2].tools, undefined);
  assert.match(JSON.stringify(calls[2].prompt), /50/);
  // 다시 쓰기 요청에도 도구 결과가 들어 있어야 근거를 보고 고친다
  const roles = calls[2].prompt.map((m) => m.role);
  assert.ok(roles.includes("tool"), roles.join(","));
  assert.match(JSON.stringify(calls[2].prompt), /"a":42/);
});

test("흐름: 다시 써도 틀리면 그 문장을 검증 안 됨으로 표시한다", async () => {
  const { m } = model(compareCall, final(answer("지난주 다운로드는 50건이에요", ["그 전주는 31건이에요"])), final(answer("지난주 다운로드는 50건이에요", ["그 전주는 31건이에요"])));
  const r = await askMetrics({ model: m, ctx, question: "지난주 다운로드?" });
  assert.deepEqual(r.unverified.sort(), ["facts[0]", "headline"]);
});

test("흐름: 사실에 원인을 단정하면 가설로 옮기게 한다", async () => {
  const { m } = model(
    compareCall,
    final(answer("서대페 덕분에 다운로드가 42건으로 늘었어요")),
    final(answer("다운로드가 42건으로 늘었어요", [], ["같은 기간 행사가 있었다면 그 영향일 수 있어요. 행사 날짜별 다운로드를 보면 확인할 수 있어요"])),
  );
  const r = await askMetrics({ model: m, ctx, question: "서대페 효과 있었어?" });
  assert.equal(r.retried, true);
  assert.deepEqual(r.unverified, []);
  assert.equal(r.answer.hypotheses.length, 1);
});

test("흐름: 도구를 안 부르고 숫자를 말하면 검증 안 됨", async () => {
  const { m } = model(final({ ...answer("지난주 다운로드는 42건이에요"), headline: { text: "지난주 다운로드는 42건이에요", refs: [] } }));
  const r = await askMetrics({ model: m, ctx, question: "지난주 다운로드?" });
  assert.deepEqual(r.unverified, ["headline"]);
});
