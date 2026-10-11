// 체다 카드 숫자 표기 시험 (#163). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { changeText, magnitude } from "./format.ts";

test("퍼센트는 정수, 2배가 넘으면 N배, 비율은 %p", () => {
  assert.deepEqual(changeText({ a: 161, b: 88, changePct: 83 }), { dir: "up", text: "83%" });
  assert.deepEqual(changeText({ a: 187, b: 115, changePct: 62.6 }), { dir: "up", text: "63%" });
  assert.deepEqual(changeText({ a: 482, b: 80, changePct: 502.5 }), { dir: "up", text: "6배" });
  assert.deepEqual(changeText({ a: 101, b: 135, changePct: -25.2 }), { dir: "down", text: "25%" });
  assert.deepEqual(changeText({ a: 2, b: 5.8, points: -3.8 }), { dir: "down", text: "3.8%p" });
});

test("표본이 적으면 %를 숨기고 개수 차이만, 변화가 없으면 그대로", () => {
  assert.deepEqual(changeText({ a: 39, b: 10, changePct: 290, lowSample: true }), { dir: "up", text: "29" });
  assert.deepEqual(changeText({ a: 5, b: 5, changePct: 0 }), { dir: "flat", text: "그대로" });
  assert.equal(changeText({ a: null, b: 3 }), null);
});

test("많이 바뀐 순서: 표본이 적은 지표는 뒤로", () => {
  const big = magnitude({ a: 482, b: 80 });
  const small = magnitude({ a: 39, b: 10, lowSample: true });
  assert.ok(big > small);
});
