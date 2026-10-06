// 지표 화면 달력 날짜 계산 테스트 (#145). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { addMonths, dayLabel, monthEnd, presets, rangeLabel, shiftMonth, weekday } from "./calendar.ts";

test("달 넘기기는 연도를 넘고, 말일은 그 달 날 수를 따른다", () => {
  assert.equal(addMonths("2026-12-01", 1), "2027-01-01");
  assert.equal(addMonths("2026-01-01", -1), "2025-12-01");
  assert.equal(monthEnd("2026-02-01"), "2026-02-28");
  assert.equal(monthEnd("2028-02-01"), "2028-02-29");
  // 1월 31일에서 한 달 뒤는 2월 말일
  assert.equal(shiftMonth("2026-01-31", 1), "2026-02-28");
  assert.equal(shiftMonth("2026-03-15", -1), "2026-02-15");
});

test("요일과 날짜 글자", () => {
  assert.equal(weekday("2026-10-06"), 2); // 화요일
  assert.equal(dayLabel("2026-09-23", true), "9월 23일 (수)");
});

const byLabel = (list) => Object.fromEntries(list.map((p) => [p.label, p.range]));

test("자주 쓰는 기간은 어제까지, 고를 수 있는 날 안으로 자른다", () => {
  const p = byLabel(presets("2026-04-01", "2026-10-05")); // 오늘 10월 6일
  assert.deepEqual(p["어제"], { from: "2026-10-05", to: "2026-10-05" });
  assert.deepEqual(p["지난 7일"], { from: "2026-09-29", to: "2026-10-05" });
  assert.deepEqual(p["지난 4주"], { from: "2026-09-08", to: "2026-10-05" });
  assert.deepEqual(p["이번 달"], { from: "2026-10-01", to: "2026-10-05" });
  assert.deepEqual(p["지난달"], { from: "2026-09-01", to: "2026-09-30" });
  assert.deepEqual(p["모은 날 전체"], { from: "2026-04-01", to: "2026-10-05" });
});

test("오늘이 1일이면 이번 달은 고를 수 없고, 수집 전 날은 잘린다", () => {
  const p = byLabel(presets("2026-09-20", "2026-09-30")); // 오늘 10월 1일
  assert.equal(p["이번 달"], null);
  assert.deepEqual(p["지난달"], { from: "2026-09-20", to: "2026-09-30" });
  assert.deepEqual(p["지난 13주"], { from: "2026-09-20", to: "2026-09-30" });
});

test("해가 바뀌거나 올해가 아니면 연도를 붙인다", () => {
  assert.equal(rangeLabel({ from: "2026-09-23", to: "2026-09-27" }, "2026-10-05"), "9월 23일~9월 27일");
  assert.equal(rangeLabel({ from: "2025-09-25", to: "2026-03-31" }, "2026-10-05"), "2025년 9월 25일~2026년 3월 31일");
  assert.equal(rangeLabel({ from: "2025-12-01", to: "2025-12-07" }, "2026-10-05"), "2025년 12월 1일~2025년 12월 7일");
});
