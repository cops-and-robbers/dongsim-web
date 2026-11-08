// 출시 보드 시각 말 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { ago, kstDay, kstShort, since } from "./time.ts";

test("스토어 시각을 한국 시각으로", () => {
  // 애플이 준 "2026-11-07T07:48:56-08:00" 은 한국 11/8 (일) 0:48
  assert.equal(kstShort("2026-11-07T07:48:56-08:00"), "11/8 (일) 0:48");
  assert.equal(kstDay("2026-11-02"), "11월 2일 (월)");
});

test("상대 시각", () => {
  const now = Date.parse("2026-11-08T03:00:00Z");
  assert.equal(ago("2026-11-08T02:59:30Z", now), "방금");
  assert.equal(ago("2026-11-08T02:48:00Z", now), "12분 전");
  assert.equal(ago("2026-11-08T00:00:00Z", now), "3시간 전");
  assert.equal(ago("2026-11-06T00:00:00Z", now), "2일 전");
  assert.equal(since("2026-11-06T23:00:00Z", now), "1일 4시간째");
  assert.equal(since("2026-11-07T03:00:00Z", now), "1일째");
});
