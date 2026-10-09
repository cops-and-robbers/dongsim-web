// 답변 검증기 시험 (#163). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { matches, numbersIn, numbersOfResult, repairHypothesisRefs, verifyAnswer } from "./verify.ts";

const results = new Map([
  ["c1", { periodA: { start: "2026-09-28", end: "2026-10-04" }, metrics: [{ key: "appstore_new", a: 42, b: 30, diff: 12, changePct: 40 }, { key: "first_open_ios", a: 37, b: 45, diff: -8, changePct: -17.8 }] }],
  ["c2", { events: [{ day: "2026-09-19", label: "서대페" }], notes: ["관리자만 참가한 시험 판 33판을 뺐어요"] }],
]);
const base = { hypotheses: [], caveats: [], followUps: [] };
const ok = (answer, q = "") => verifyAnswer({ ...base, ...answer }, results, q);

test("숫자 뽑기: 쉼표, 소수, 퍼센트", () => {
  assert.deepEqual(numbersIn("1,234건이 12.5% 늘었어요"), [1234, 12.5]);
});

test("숫자 뽑기: 영문 이름에 붙은 숫자(GA4, D7)는 세지 않는다", () => {
  assert.deepEqual(numbersIn("GA4 사이트 숫자는 10월 8일까지, D7 재방문 3.2%"), [10, 8, 3.2]);
});

test("결과 속 날짜의 월, 일도 말할 수 있다", () => {
  const s = numbersOfResult(results.get("c1"));
  for (const n of [9, 28, 10, 4, 42, 40, -17.8]) assert.ok(s.has(n), String(n));
});

test("반올림과 부호는 봐준다", () => {
  assert.ok(matches(17.8, -17.8));
  assert.ok(matches(18, -17.8));
  assert.ok(!matches(19, -17.8));
});

test("인용한 결과에 있는 숫자는 통과", () => {
  const r = ok({ headline: { text: "지난주 App Store 최초 다운로드는 42건으로 그 전주보다 12건(40%) 늘었어요", refs: ["c1"] }, facts: [] });
  assert.equal(r.ok, true, JSON.stringify(r.problems));
});

test("지어낸 숫자는 걸린다", () => {
  const r = ok({ headline: { text: "App Store 최초 다운로드는 45건이에요", refs: ["c1"] }, facts: [{ text: "iOS 첫 실행은 50회예요", refs: ["c1"] }] });
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((p) => p.issue.includes("50")));
});

test("다른 결과의 숫자를 인용 없이 빌려 오면 걸린다 (33 은 c2 에만 있다)", () => {
  const r = ok({ headline: { text: "시험 판 33판을 뺐어요", refs: ["c1"] }, facts: [] });
  assert.equal(r.ok, false);
});

test("숫자가 있는데 인용이 없거나, 없는 호출을 인용하면 걸린다", () => {
  assert.equal(ok({ headline: { text: "42건이에요", refs: [] }, facts: [] }).ok, false);
  assert.equal(ok({ headline: { text: "42건이에요", refs: ["c9"] }, facts: [] }).ok, false);
});

test("사실에 인과 표현이 있으면 걸린다", () => {
  for (const t of ["서대페 때문에 늘었어요", "서대페 덕분에 늘었어요", "서대페가 설치 증가를 견인했어요", "행사 효과로 늘었어요"]) {
    assert.equal(ok({ headline: { text: t, refs: ["c2"] }, facts: [] }).ok, false, t);
  }
  assert.equal(ok({ headline: { text: "서대페(9월 19일)와 같은 주에 다운로드가 함께 늘었어요", refs: ["c2"] }, facts: [] }).ok, true);
});

test("가설에는 인과를 써도 되지만 숫자는 결과에 있어야 한다", () => {
  assert.equal(ok({ headline: { text: "다운로드가 늘었어요", refs: [] }, facts: [], hypotheses: [{ text: "서대페 때문일 수 있어요", refs: [] }] }).ok, true);
  assert.equal(ok({ headline: { text: "다운로드가 늘었어요", refs: [] }, facts: [], hypotheses: [{ text: "300명이 왔다면 그 영향일 수 있어요", refs: [] }] }).ok, false);
});

test("확인하려고 비교를 돌린 가설은 인용한 결과의 숫자만 쓸 수 있다", () => {
  const h = (text, refs) => ok({ headline: { text: "다운로드가 늘었어요", refs: [] }, facts: [], hypotheses: [{ text, refs }] });
  assert.equal(h("행사가 있던 주에 App Store 다운로드가 30건에서 42건으로 함께 늘었어요", ["c1"]).ok, true);
  // 33 은 c2 에만 있다. c1 을 인용하고 33 을 말하면 걸린다
  const r = h("시험 판 33판과 겹쳤을 수 있어요", ["c1"]);
  assert.equal(r.ok, false);
  assert.equal(r.problems[0].where, "hypotheses[0]");
  assert.equal(h("숫자는 c9 에서 왔어요", ["c9"]).ok, false);
});

test("표본이 적은 지표의 증감률을 % 로 말하면 걸리고, 개수나 %p 는 통과", () => {
  const small = new Map([["s1", { metrics: [{ key: "appstore_new", label: "App Store 최초 다운로드", a: 39, b: 10, diff: 29, changePct: 290, lowSample: true }, { key: "site_conversion", a: 4.8, b: 6.5, diffPoints: -1.7, changePct: null, lowSample: false }] }]]);
  const v = (text) => verifyAnswer({ ...base, headline: { text, refs: ["s1"] }, facts: [] }, small);
  const r = v("App Store 최초 다운로드는 10건에서 39건으로 29건(290%) 늘었어요");
  assert.equal(r.ok, false);
  assert.match(r.problems[0].issue, /표본이 적은/);
  assert.equal(v("App Store 최초 다운로드는 10건에서 39건으로 29건 늘었어요").ok, true);
  assert.equal(v("사이트 전환율은 6.5%에서 4.8%로 1.7%p 낮아졌어요").ok, true);
});

test("주의점은 지시문의 기준 숫자(표본 20)를 말할 수 있지만, 사실은 안 된다", () => {
  const c = ok({ headline: { text: "지난주 App Store 최초 다운로드는 42건이에요", refs: ["c1"] }, facts: [], caveats: ["한국 외 나라는 20 미만이라 표본이 작아요"] });
  assert.equal(c.ok, true, JSON.stringify(c.problems));
  assert.equal(ok({ headline: { text: "지난주 다운로드는 20건이에요", refs: ["c1"] }, facts: [] }).ok, false);
});

test("가설 인용 고치기: 10 이상 숫자가 다른 결과에 있으면 그 결과를 더하고, 작은 숫자나 없는 숫자는 그대로", () => {
  const a = (text, refs) => ({ ...base, headline: { text: "늘었어요", refs: [] }, facts: [], hypotheses: [{ text, refs }] });
  // 42 는 c1 에만 있다. c2 만 인용했으면 c1 을 더한다
  const fixed = repairHypothesisRefs(a("서대페 날 다운로드가 42건이었어요", ["c2"]), results);
  assert.deepEqual(fixed.hypotheses[0].refs, ["c2", "c1"]);
  assert.equal(verifyAnswer(fixed, results).ok, true);
  // 9 는 작아서 우연일 수 있어 고치지 않는다
  assert.deepEqual(repairHypothesisRefs(a("9건이었어요", ["c2"]), results).hypotheses[0].refs, ["c2"]);
  // 어디에도 없는 숫자는 고치지 않는다(검증에서 걸린다)
  assert.deepEqual(repairHypothesisRefs(a("777건이었어요", ["c2"]), results).hypotheses[0].refs, ["c2"]);
});

test("주의점은 지시문에 적힌 숫자(3~7일 늦게)를 말할 수 있다", () => {
  const ans = { ...base, headline: { text: "지난주 다운로드는 42건이에요", refs: ["c1"] }, facts: [], caveats: ["Google Play 는 3~7일 늦게 들어와요"] };
  assert.equal(verifyAnswer(ans, results, "").ok, false);
  assert.equal(verifyAnswer(ans, results, "", [3, 7]).ok, true);
});

test("도구를 안 부르고 숫자를 말하면 걸린다", () => {
  const r = verifyAnswer({ ...base, headline: { text: "지난주 설치는 42건이에요", refs: [] }, facts: [] }, new Map());
  assert.equal(r.ok, false);
});

test("질문에 나온 숫자는 다시 말해도 된다", () => {
  assert.equal(ok({ headline: { text: "50명이 넘은 날은 없었어요", refs: ["c1"] }, facts: [] }, "50명 넘은 날 있어?").ok, true);
});

test("후속 질문의 숫자는 보지 않는다", () => {
  assert.equal(ok({ headline: { text: "다운로드가 늘었어요", refs: [] }, facts: [], followUps: ["2026년 8월과 비교해 줄래요?"] }).ok, true);
});
