// 답 아래 근거 그림 시험 (#163). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { evidenceOf, tabOf } from "./evidence.ts";

const A = { start: "2026-09-28", end: "2026-10-04" };
const B = { start: "2026-09-21", end: "2026-09-27" };
const metric = (key, label, a, b, changePct) => ({ key, label, unit: "건", a, b, diff: a - b, changePct, lowSample: false });
const compare = {
  id: "call-1",
  name: "metrics_compare",
  input: { periodA: A, periodB: B },
  output: {
    status: "ok",
    periodA: A,
    periodB: B,
    metrics: [metric("web_sessions", "사이트 방문", 812, 790, 2.8), metric("appstore_new", "App Store 최초 다운로드", 42, 30, 40), metric("first_open_ios", "iOS 앱 첫 실행", 37, 45, -17.8)],
    notes: ["Google Play 설치는 2026-10-05 까지만 들어와서 두 기간 모두 같은 날 수로 잘라 셌어요"],
  },
};
const say = (text, refs = ["call-1"]) => ({ headline: { text, refs }, facts: [] });

test("답에 나온 숫자가 든 지표만 고르고, 그 지표의 탭을 연다", () => {
  const [e] = evidenceOf([compare], say("지난주 App Store 최초 다운로드는 42건으로 40% 늘었어요"));
  assert.equal(e.kind, "compare");
  assert.deepEqual(e.rows.map((r) => r.key), ["appstore_new"]);
  assert.deepEqual(e.target, { range: A, cmpFrom: null, tab: "store" });
  // App Store 만 고른 그림에 Google Play 안내는 붙이지 않는다
  assert.deepEqual(e.notes, []);
});

test("고른 지표와 상관있는 안내만, 날짜는 한국어로", () => {
  const play = { ...compare, output: { ...compare.output, metrics: [metric("play_installs", "Google Play 최초 설치", 12, 10, 20)] } };
  const [e] = evidenceOf([play], say("12건"));
  assert.deepEqual(e.notes, ["Google Play 설치는 10월 5일까지만 들어와서 두 기간 모두 같은 날 수로 잘라 셌어요"]);
});

test("답에 맞는 숫자가 없으면 값이 있는 앞의 셋", () => {
  const [e] = evidenceOf([compare], say("지난주는 비슷했어요"));
  assert.equal(e.rows.length, 3);
});

test("바로 앞 같은 길이가 아닌 비교는 비교 기간 첫날을 넘긴다", () => {
  const far = { ...compare, output: { ...compare.output, periodB: { start: "2026-09-01", end: "2026-09-07" } } };
  assert.equal(evidenceOf([far], say("42건"))[0].target.cmpFrom, "2026-09-01");
});

test("인용한 도구 결과만 그림으로, 같은 호출은 한 번만", () => {
  const other = { ...compare, id: "call-2", input: { x: 1 } };
  assert.deepEqual(evidenceOf([compare, other], say("42건", ["call-2"])).map((e) => e.id), ["call-2"]);
  const dup = { ...compare, id: "call-3" };
  assert.equal(evidenceOf([compare, dup], say("42건", [])).length, 1);
});

test("나라별 나눠 보기는 두 스토어를 더해 많은 순 다섯", () => {
  const rows = [
    { country: "KR", appStore: 30, play: 20 },
    { country: "JP", appStore: 5, play: 1 },
    { country: "US", appStore: 0, play: 0 },
  ];
  const t = { id: "c", name: "metrics_breakdown", input: {}, output: { status: "ok", range: A, dimension: "country", rows } };
  const [e] = evidenceOf([t], say("한국이 50건이에요", ["c"]));
  assert.equal(e.kind, "bars");
  assert.deepEqual(e.rows, [{ label: "KR", value: 50 }, { label: "JP", value: 6 }]);
  assert.equal(e.target.tab, "store");
});

test("실패한 도구 결과는 그리지 않는다", () => {
  const bad = { id: "b", name: "metrics_compare", input: {}, output: { status: "unsupported", message: "오늘 숫자는 아직 없어요" } };
  assert.deepEqual(evidenceOf([bad], say("없어요", ["b"])), []);
});

test("지표 키로 탭을 고른다", () => {
  assert.deepEqual(["ig_views", "web_sessions", "download_clicks", "play_installs", "appstore_new", "games", "dau_avg"].map(tabOf), [
    "instagram",
    "traffic",
    "traffic",
    "store",
    "store",
    "app",
    "app",
  ]);
});

test("훑어보기는 답에 나온 합계나 칸 값이 든 지표만 주별 막대로", () => {
  const t = {
    id: "o",
    name: "metrics_overview",
    input: {},
    output: {
      status: "ok",
      range: { start: "2026-09-01", end: "2026-10-04" },
      unit: "week",
      buckets: [{ start: "2026-09-01", end: "2026-09-06", full: false, posts: 0 }, { start: "2026-09-07", end: "2026-09-13", full: true, posts: 1 }],
      metrics: [
        { key: "web_sessions", label: "사이트 방문", unit: "회", total: 300, values: [120, 180] },
        { key: "appstore_new", label: "App Store 최초 다운로드", unit: "건", total: 151, values: [18, 63] },
      ],
      movers: [],
      events: [{ day: "2026-09-19", label: "서대페" }],
      notes: [],
    },
  };
  const [e] = evidenceOf([t], say("지금까지 App Store 최초 다운로드는 151건이에요", ["o"]));
  assert.equal(e.kind, "weekly");
  assert.deepEqual(e.rows.map((r) => r.key), ["appstore_new"]);
  assert.deepEqual(e.buckets[1], { start: "2026-09-07", end: "2026-09-13" });
  assert.equal(e.target.tab, "store");
});

test("비율 비교는 %p 차이와 분자, 분모를 넘긴다", () => {
  const t = {
    id: "r",
    name: "metrics_compare",
    input: {},
    output: {
      status: "ok",
      periodA: A,
      periodB: B,
      metrics: [{ key: "signup_activation", label: "가입 후 7일 안 첫 게임 비율", unit: "%", a: 35.3, b: 28, aOf: { num: 12, den: 34 }, bOf: { num: 7, den: 25 }, diffPoints: 7.3, changePct: null, lowSample: false }],
    },
  };
  const [e] = evidenceOf([t], say("가입한 34명 중 12명이 첫 게임을 했어요", ["r"]));
  assert.deepEqual([e.rows[0].points, e.rows[0].aOf, e.rows[0].changePct], [7.3, { num: 12, den: 34 }, null]);
  assert.equal(e.target.tab, "app");
});
