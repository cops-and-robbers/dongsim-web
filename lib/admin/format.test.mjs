// 어드민 시각 표시 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDate, formatDateTime, gameEndedAt } from "./format.ts";

test("끝난 시각이 있으면 기록을 만든 시각이 아니라 끝난 시각을 쓴다", () => {
  const game = { createdAt: "2026-10-01T10:00:00+09:00", endedAt: "2026-10-01T10:25:00+09:00" };
  assert.equal(gameEndedAt(game), game.endedAt);
  assert.match(formatDateTime(gameEndedAt(game)), /^2026\.10\.01.*10:25$/);
});

test("끝난 시각이 없는 옛 기록은 그때 끝날 때 만든 기록이라 만든 시각을 쓴다", () => {
  const createdAt = "2026-08-20T14:00:00+09:00";
  assert.equal(gameEndedAt({ createdAt, endedAt: null }), createdAt);
  assert.equal(gameEndedAt({ createdAt }), createdAt);
});

test("자정을 넘겨 끝난 판의 종료일은 끝난 날이다", () => {
  const game = { createdAt: "2026-10-01T23:50:00+09:00", endedAt: "2026-10-02T00:10:00+09:00" };
  assert.equal(formatDate(gameEndedAt(game)), "2026.10.02");
});

test("한국 시간으로 표시한다", () => {
  assert.match(formatDateTime(gameEndedAt({ createdAt: "2026-10-01T15:30:00Z" })), /^2026\.10\.02.*00:30$/);
});
