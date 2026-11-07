// 나라별 시각 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { DAY_SHIFT_LABEL, isActive, isAwake, localTime, overlapsActive, regionShares, timeWord } from "./worldClock.ts";

const at = (iso) => Date.parse(iso);

test("3.2.7 출시 시각(한국 11/2 11:55)은 미국에서 전날 저녁이다", () => {
  const t = at("2026-11-02T11:55:00+09:00");
  assert.equal(localTime(t, "Asia/Seoul").label, "오전 11:55");
  // 유럽은 10/25, 미국은 11/1 에 서머타임이 끝났다. 시드니는 10/4 부터 서머타임이다
  assert.equal(localTime(t, "Europe/London").label, "새벽 2:55");
  assert.equal(localTime(t, "America/New_York").label, "밤 9:55");
  assert.equal(localTime(t, "America/New_York").dayShift, -1);
  assert.equal(localTime(t, "America/Los_Angeles").label, "저녁 6:55");
  assert.equal(localTime(t, "Australia/Sydney").label, "낮 1:55");
});

test("여름에는 서머타임이 반영된다", () => {
  const t = at("2026-07-04T12:00:00+09:00");
  assert.equal(localTime(t, "Europe/London").label, "새벽 4:00");
  assert.equal(localTime(t, "America/New_York").label, "밤 11:00");
  assert.equal(localTime(t, "Australia/Sydney").label, "낮 1:00");
});

test("자정과 정오는 0:10, 낮 12:00 으로 쓴다", () => {
  assert.equal(localTime(at("2026-11-09T00:10:00+09:00"), "Asia/Seoul").label, "새벽 0:10");
  assert.equal(localTime(at("2026-11-09T12:00:00+09:00"), "Asia/Seoul").label, "낮 12:00");
});

test("자정을 넘긴 지역은 다음 날로 센다", () => {
  const t = localTime(at("2026-11-08T23:30:00+09:00"), "Australia/Sydney");
  assert.equal(t.label, "새벽 1:30");
  assert.equal(DAY_SHIFT_LABEL[t.dayShift], "다음 날");
});

test("시각을 부르는 말과 깨어 있는 시간, 노는 시간", () => {
  assert.deepEqual([0, 5, 6, 9, 12, 17, 21].map(timeWord), ["새벽", "새벽", "아침", "오전", "낮", "저녁", "밤"]);
  assert.equal(isAwake(6), false);
  assert.equal(isAwake(7), true);
  assert.equal(isAwake(23), false);
  assert.equal(isActive(11), false);
  assert.equal(isActive(12), true);
  assert.equal(isActive(22), false);
});

test("나라별 수를 지역 비율로 묶고, 미국은 동부와 서부로 반씩, 한국은 맨 앞", () => {
  const regions = regionShares([
    { country: "US", count: 60 },
    { country: "KR", count: 20 },
    { country: "DE", count: 5 },
    { country: "FR", count: 5 },
    { country: "AQ", count: 10 },
  ]);
  assert.deepEqual(regions.map((r) => r.id), ["kr", "us-east", "us-west", "eu"]);
  assert.equal(regions[1].share, 0.3);
  assert.equal(regions[3].share, 0.1);
});

test("한국 새벽 점검은 한국과는 안 겹치고 유럽 오후와는 겹친다", () => {
  const from = at("2026-11-09T01:00:00+09:00");
  const to = at("2026-11-09T03:00:00+09:00");
  assert.equal(overlapsActive("Asia/Seoul", to, from), false);
  // 파리 17:00 ~ 19:00
  assert.equal(overlapsActive("Europe/Paris", to, from), true);
  // 구간 없이 한 시각만: 뉴욕 11/8 13:00
  assert.equal(overlapsActive("America/New_York", to), true);
});
