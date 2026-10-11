// 답 글 숫자 강조 시험 (#163). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { emphasize } from "./emphasis.ts";

const nums = (t) => emphasize(t).filter((p) => p.num).map((p) => p.text);

test("단위가 붙은 값만 굵게 고른다", () => {
  assert.deepEqual(nums("게임은 19판에서 2판으로 17판 줄었고, 가입은 82명에서 20명으로 75.6% 줄었어요"), ["19판", "2판", "17판", "82명", "20명", "75.6%"]);
  assert.deepEqual(nums("사이트 전환율은 4.1%에서 2.8%로 1.3%p 낮아졌어요"), ["4.1%", "2.8%", "1.3%p"]);
  assert.deepEqual(nums("인스타 조회는 1,494회에서 1,401회로"), ["1,494회", "1,401회"]);
});

test("날짜와 시각은 값이 아니라 그대로 둔다", () => {
  assert.deepEqual(nums("9월 19일 14시 27분에 36명"), ["36명"]);
  assert.deepEqual(nums("10월 5일부터 10일까지"), []);
});

test("조각을 이으면 원래 글과 같다", () => {
  const t = "서대페에서 게임을 4판 했고 실제 방문객은 59명이에요.";
  assert.equal(emphasize(t).map((p) => p.text).join(""), t);
});
