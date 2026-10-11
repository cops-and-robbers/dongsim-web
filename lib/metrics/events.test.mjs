// 일정 성격과 행사 시간 시험 (#165). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { guessCategory, inEventTime, seoulClock, toEvent } from "./events.ts";

test("이름으로 성격 짐작: 마이그레이션과 같은 규칙, 같은 순서", () => {
  assert.equal(guessCategory("iOS 3.1.24 출시"), "release");
  assert.equal(guessCategory("3차 QA"), "test");
  assert.equal(guessCategory("잠금 화면 게임 현황 테스트"), "test");
  // 포스터(홍보)와 시험(테스트)이 같이 있으면 테스트가 먼저다
  assert.equal(guessCategory("청춘대로 포스터 QR 시험 (팀)"), "test");
  assert.equal(guessCategory("서대페 부스, 미니운동회 14~20시 (반포한강공원)"), "event");
  assert.equal(guessCategory("청춘대로 건국대 vs 세종대 14~16시 (어린이대공원)"), "event");
  assert.equal(guessCategory("청춘대로 홍보 (에타 모집글, 그리디)"), "promo");
  assert.equal(guessCategory("팀 회의"), "etc");
});

test("DB 한 줄을 일정으로: 새 칸이 없으면(0007 전) 이름으로 성격을 짐작한다", () => {
  assert.deepEqual(toEvent({ id: 3, day: "2026-07-04", label: "서울게임타운2 부스" }), {
    id: 3, day: "2026-07-04", label: "서울게임타운2 부스", category: "event", startsAt: null, endsAt: null,
  });
  assert.deepEqual(toEvent({ id: 5, day: "2026-09-19", label: "청춘대로", category: "event", starts_at: "14:00:00", ends_at: "16:00:00" }), {
    id: 5, day: "2026-09-19", label: "청춘대로", category: "event", startsAt: "14:00", endsAt: "16:00",
  });
});

test("한국 시각으로 날짜와 분", () => {
  assert.deepEqual(seoulClock("2026-09-19T05:30:00Z"), { day: "2026-09-19", minute: 14 * 60 + 30 });
  assert.deepEqual(seoulClock("2026-10-01T23:30:00+09:00"), { day: "2026-10-01", minute: 23 * 60 + 30 });
});

test("행사 시간 안: 같은 날, 시작 30분 전부터 끝까지. 시간이 없으면 미리 체크하지 않는다", () => {
  const e = { day: "2026-09-19", startsAt: "14:00", endsAt: "16:00" };
  assert.equal(inEventTime(e, "2026-09-19T14:25:00+09:00"), true);
  assert.equal(inEventTime(e, "2026-09-19T13:40:00+09:00"), true); // 미리 연 방
  assert.equal(inEventTime(e, "2026-09-19T13:20:00+09:00"), false);
  assert.equal(inEventTime(e, "2026-09-19T16:10:00+09:00"), false);
  assert.equal(inEventTime(e, "2026-09-20T14:25:00+09:00"), false);
  assert.equal(inEventTime({ ...e, startsAt: null, endsAt: null }, "2026-09-19T14:25:00+09:00"), false);
});
