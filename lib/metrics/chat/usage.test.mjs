// 챗봇 사용량과 남은 한도 시험 (#163). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_COST_USD, usageOf } from "./usage.ts";

const day = "2026-10-11T00:00:00+09:00";
const dayStart = new Date(day).toISOString();
const row = (user_key, cost_usd, at = "2026-10-11T03:00:00.000Z", error = null) => ({ user_key, cost_usd, error, created_at: at });

test("답이 적으면 실험 평균으로 남은 질문 수를 어림한다", () => {
  const u = usageOf([row("u:1", 0.01)], "u:1", dayStart, "2026-10-11", 30, 8);
  assert.equal(u.month.avgCostUsd, DEFAULT_COST_USD);
  assert.equal(u.month.estLeft, Math.floor((8 - 0.01) / DEFAULT_COST_USD));
  assert.equal(u.remainingToday, 29);
  assert.equal(u.month.resetOn, "2026-11-01");
  assert.equal(u.warn, null);
});

test("이번 달 답이 다섯 개를 넘으면 실제 평균을 쓴다. 실패한 질문은 평균에서 빼고 수에는 넣는다", () => {
  const rows = [...Array(6)].map(() => row("u:2", 0.02)).concat([row("u:1", 0, undefined, "타임아웃")]);
  const u = usageOf(rows, "u:1", dayStart, "2026-10-11", 30, 8);
  assert.equal(u.month.avgCostUsd, 0.02);
  assert.equal(u.month.questions, 7);
  assert.equal(u.month.mine, 1);
  assert.equal(u.remainingToday, 29);
});

test("어제 질문은 오늘 몫에 들지 않는다. 하루 몫이 다섯 개 이하로 남으면 알린다", () => {
  const rows = [row("u:1", 0.01, "2026-10-10T10:00:00.000Z"), ...[...Array(26)].map(() => row("u:1", 0.01))];
  const u = usageOf(rows, "u:1", dayStart, "2026-10-11", 30, 8);
  assert.equal(u.remainingToday, 4);
  assert.equal(u.warn, "today");
});

test("달 예산의 80% 를 넘으면 알리고, 다 쓰면 막는다. 12월 다음은 1월 1일", () => {
  assert.equal(usageOf([row("u:1", 6.5)], "u:1", dayStart, "2026-10-11", 30, 8).warn, "month");
  const full = usageOf([row("u:1", 8.1)], "u:1", dayStart, "2026-12-31", 30, 8);
  assert.equal(full.month.full, true);
  assert.equal(full.month.estLeft, 0);
  assert.equal(full.month.resetOn, "2027-01-01");
});

test("평가 실험 비용도 남은 한도에서 빼되, 질문 수와 평균값에는 넣지 않는다", () => {
  const u = usageOf([row("u:1", 0.01)], "u:1", dayStart, "2026-10-11", 30, 8, 4.16);
  assert.equal(u.month.otherUsd, 4.16);
  assert.equal(u.month.spentUsd, 4.17);
  assert.equal(u.month.questions, 1);
  assert.equal(u.month.avgCostUsd, DEFAULT_COST_USD);
  assert.equal(u.month.estLeft, Math.floor((8 - 4.17) / DEFAULT_COST_USD));
});
