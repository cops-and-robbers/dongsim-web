// 질문 자동 완성 시험 (#163). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { complete, eventShortName } from "./autocomplete.ts";

const events = [
  { day: "2026-09-19", label: "서대페 부스, 미니운동회 14~20시 (반포한강공원)" },
  { day: "2026-09-19", label: "청춘대로 건국대 vs 세종대 14~16시 (어린이대공원)" },
  { day: "2026-07-04", label: "서울게임타운2 부스 12~17시 (판교 투썸월드)" },
];

test("행사 이름은 일정의 첫 낱말", () => {
  assert.equal(eventShortName(events[0].label), "서대페");
  assert.equal(eventShortName(events[2].label), "서울게임타운2");
});

test("행사 이름 앞 글자만 쳐도 그 행사 질문이 먼저 나온다", () => {
  const r = complete("서대", events);
  assert.equal(r[0], "서대페 효과 있었어?");
  assert.ok(r.includes("서대페에서 실제로 몇 명이랑 게임했어?"));
});

test("팀이 부르는 줄임말(서겜타)도 받는다", () => {
  assert.equal(complete("서겜타", events)[0], "서겜타 효과 있었어?");
});

test("지표 낱말로 이 기간 비교, 가장 많은 날, 추세 질문을 낸다", () => {
  const r = complete("설치", events);
  assert.ok(r.includes("이 기간 설치, 이전 기간보다 늘었어?"));
  assert.ok(r.length <= 4);
});

test("앞이 맞는 틀을 먼저 둔다", () => {
  assert.equal(complete("이번 주", events)[0], "이번 주 지난주 대비 어때?");
});

test("빈 말, 이미 다 쓴 질문, 길게 쓴 자기 질문에는 내놓지 않는다", () => {
  assert.deepEqual(complete("  ", events), []);
  assert.ok(!complete("서대페 효과 있었어?", events).includes("서대페 효과 있었어?"));
  assert.deepEqual(complete("인스타 팔로워 늘린 방법 중에 뭐가 제일 나았는지", events), []);
});

test("조사는 받침을 보고 고른다", async () => {
  const { iGa, eunNeun } = await import("./josa.ts");
  assert.equal(iGa("광고 노출"), "광고 노출이");
  assert.equal(iGa("앱 첫 실행"), "앱 첫 실행이");
  assert.equal(iGa("사이트 방문"), "사이트 방문이");
  assert.equal(iGa("가입 후 7일 안 첫 게임 비율"), "가입 후 7일 안 첫 게임 비율이");
  assert.equal(eunNeun("App Store 최초 다운로드"), "App Store 최초 다운로드는");
  assert.equal(eunNeun("진행된 게임"), "진행된 게임은");
});
