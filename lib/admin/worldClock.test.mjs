// 나라별 시각 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { cityTimes, DAY_SHIFT_LABEL } from "./worldClock.ts";

const byId = (atIso) => Object.fromEntries(cityTimes(Date.parse(atIso)).map((c) => [c.id, c]));

test("3.2.7 출시 시각(한국 11/2 11:55)은 미국에서 전날 밤이다", () => {
  const t = byId("2026-11-02T11:55:00+09:00");
  assert.equal(t.seoul.time, "11:55");
  assert.equal(t.tokyo.time, "11:55");
  // 유럽은 10/25, 미국은 11/1 에 서머타임이 끝났다. 시드니는 10/4 부터 서머타임이다
  assert.equal(t.london.time, "02:55");
  assert.equal(t["new-york"].time, "21:55");
  assert.equal(t["new-york"].dayShift, -1);
  assert.equal(t["los-angeles"].time, "18:55");
  assert.equal(t.sydney.time, "13:55");
  assert.equal(t.sydney.dayShift, 0);
});

test("여름에는 서머타임이 반영된다", () => {
  const t = byId("2026-07-04T12:00:00+09:00");
  assert.equal(t.london.time, "04:00");
  assert.equal(t["new-york"].time, "23:00");
  assert.equal(t["new-york"].dayShift, -1);
  assert.equal(t.sydney.time, "13:00");
});

test("한국 새벽이면 시드니는 같은 날, 자정을 넘긴 도시는 다음 날로 센다", () => {
  const t = byId("2026-11-08T23:30:00+09:00");
  assert.equal(t.sydney.time, "01:30");
  assert.equal(t.sydney.dayShift, 1);
  assert.equal(DAY_SHIFT_LABEL[t.sydney.dayShift], "다음 날");
});

test("밤 11시 ~ 아침 7시는 밤으로 본다", () => {
  const t = byId("2026-11-02T22:00:00+09:00");
  assert.equal(t.seoul.night, false);
  assert.equal(byId("2026-11-02T23:00:00+09:00").seoul.night, true);
  assert.equal(byId("2026-11-02T06:59:00+09:00").seoul.night, true);
  assert.equal(byId("2026-11-02T07:00:00+09:00").seoul.night, false);
});
