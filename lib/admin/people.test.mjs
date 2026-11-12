// 유저와 게임 두 칸 화면 표시 규칙 테스트 (#315). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { ago, avatarFor, clock, dayName, groupInOrder, kstClock, kstDay, kstTimeOfDay, sinceDay } from "./people.ts";

const NOW = Date.parse("2026-11-10T15:20:00+09:00");

test("KST 로 날과 시각을 읽는다", () => {
  assert.equal(kstDay("2026-11-09T15:30:00Z"), "2026-11-10");
  assert.equal(kstClock("2026-11-09T15:30:00Z"), "00:30");
  assert.equal(kstTimeOfDay("2026-11-10T05:42:00Z"), "오후 2:42");
  assert.equal(kstTimeOfDay("2026-11-09T15:05:00Z"), "오전 12:05");
});

test("날 묶음 제목은 오늘, 어제, 날짜", () => {
  assert.equal(dayName("2026-11-10T00:10:00+09:00", NOW), "오늘");
  assert.equal(dayName("2026-11-09T23:59:00+09:00", NOW), "어제");
  assert.equal(dayName("2026-11-08T10:00:00+09:00", NOW), "11월 8일");
  assert.equal(dayName("2025-12-31T10:00:00+09:00", NOW), "2025년 12월 31일");
});

test("지난 시간은 분, 시간, 날로 줄인다", () => {
  assert.equal(ago("2026-11-10T15:19:40+09:00", NOW), "방금");
  assert.equal(ago("2026-11-10T15:14:00+09:00", NOW), "6분 전");
  assert.equal(ago("2026-11-10T11:20:00+09:00", NOW), "4시간 전");
  assert.equal(ago("2026-11-07T15:20:00+09:00", NOW), "3일 전");
  assert.equal(ago("2026-08-20T10:00:00+09:00", NOW), "8월 20일");
  assert.equal(ago("2026-11-10T15:30:00+09:00", NOW), "방금");
});

test("가입한 지는 달력 날짜로 센다", () => {
  assert.equal(sinceDay("2026-11-10T00:01:00+09:00", NOW), "오늘");
  assert.equal(sinceDay("2026-11-09T23:59:00+09:00", NOW), "어제");
  assert.equal(sinceDay("2026-10-31T09:00:00+09:00", NOW), "10일 전");
});

test("진행 시간은 분:초", () => {
  assert.equal(clock(337), "5:37");
  assert.equal(clock(59), "0:59");
  assert.equal(clock(3723), "1:02:03");
});

test("순서를 지키며 묶는다", () => {
  const g = groupInOrder(["a1", "a2", "b1", "a3"], (x) => x[0]);
  assert.deepEqual(g.map((x) => [x.key, x.items.length]), [["a", 2], ["b", 1], ["a", 1]]);
});

test("사람 그림은 같은 번호면 늘 같다", () => {
  assert.deepEqual(avatarFor("5090"), avatarFor("5090"));
  const seen = new Set(Array.from({ length: 60 }, (_, i) => JSON.stringify(avatarFor(String(5000 + i)))));
  assert.ok(seen.size >= 8, "골고루 퍼진다");
  for (let i = 0; i < 60; i++) {
    const a = avatarFor(String(i));
    assert.ok(a.tone >= 0 && a.tone < 6);
  }
});
