// 일정 성격과 행사 게임 찾기 시험 (#165). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { guessCategory, isEventGame, parsePlace, seoulClock, toEvent } from "./events.ts";

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
    id: 3, day: "2026-07-04", label: "서울게임타운2 부스", category: "event", startsAt: null, endsAt: null, place: null,
  });
  assert.deepEqual(toEvent({ id: 5, day: "2026-09-19", label: "청춘대로", category: "event", starts_at: "14:00:00", ends_at: "16:00:00", lat: 37.5498, lng: 127.0799, radius_m: null }), {
    id: 5, day: "2026-09-19", label: "청춘대로", category: "event", startsAt: "14:00", endsAt: "16:00", place: { lat: 37.5498, lng: 127.0799, radiusM: 500 },
  });
});

test("지도에서 복사한 좌표 읽기", () => {
  assert.deepEqual(parsePlace("37.5498, 127.0799"), { lat: 37.5498, lng: 127.0799 });
  assert.deepEqual(parsePlace("https://www.google.com/maps/place/x/@37.5498,127.0799,17z"), { lat: 37.5498, lng: 127.0799 });
  assert.deepEqual(parsePlace("https://map.example/?lng=127.0799&lat=37.5498"), { lat: 37.5498, lng: 127.0799 });
  assert.equal(parsePlace("어린이대공원"), null);
  assert.equal(parsePlace("137.5, 127"), null);
});

test("한국 시각으로 날짜와 분", () => {
  assert.deepEqual(seoulClock("2026-09-19T05:30:00Z"), { day: "2026-09-19", minute: 14 * 60 + 30 });
  assert.deepEqual(seoulClock("2026-10-01T23:30:00+09:00"), { day: "2026-10-01", minute: 23 * 60 + 30 });
});

test("행사 게임: 같은 날, 행사 시간(30분 전부터), 장소 반경 안", () => {
  const e = { id: 5, day: "2026-09-19", label: "청춘대로", category: "event", startsAt: "14:00", endsAt: "16:00", place: { lat: 37.5498, lng: 127.0799, radiusM: 500 } };
  const here = { lat: 37.5499, lng: 127.0801 };
  assert.equal(isEventGame(e, { startedAt: "2026-09-19T14:25:00+09:00", center: here }), true);
  assert.equal(isEventGame(e, { startedAt: "2026-09-19T13:40:00+09:00", center: here }), true); // 미리 연 방
  assert.equal(isEventGame(e, { startedAt: "2026-09-19T13:20:00+09:00", center: here }), false);
  assert.equal(isEventGame(e, { startedAt: "2026-09-19T16:10:00+09:00", center: here }), false);
  assert.equal(isEventGame(e, { startedAt: "2026-09-20T14:25:00+09:00", center: here }), false);
  // 같은 시간 반포(서대페)는 다른 행사다
  assert.equal(isEventGame(e, { startedAt: "2026-09-19T14:27:00+09:00", center: { lat: 37.5114, lng: 126.9969 } }), false);
  assert.equal(isEventGame(e, { startedAt: "2026-09-19T14:25:00+09:00", center: null }), false);
  // 장소를 모르면 시간만 본다. 시간도 장소도 모르면 찾지 않는다
  assert.equal(isEventGame({ ...e, place: null }, { startedAt: "2026-09-19T14:25:00+09:00", center: null }), true);
  assert.equal(isEventGame({ ...e, place: null, startsAt: null, endsAt: null }, { startedAt: "2026-09-19T14:25:00+09:00", center: here }), false);
  assert.equal(isEventGame({ ...e, category: "promo" }, { startedAt: "2026-09-19T14:25:00+09:00", center: here }), false);
});
