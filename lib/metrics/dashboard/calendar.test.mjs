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

test("비교 기간: 이전, 요일 맞춤, 직접 고르기, 주소 값", async () => {
  const { compareRange, compareError, parseCompare, compareParam, lastCompareStart } = await import("./calendar.ts");
  const week = { from: "2026-09-29", to: "2026-10-05" }; // 7일
  assert.deepEqual(compareRange(week, { kind: "prev" }), { from: "2026-09-22", to: "2026-09-28" });
  // 7일 단위면 요일 맞춤도 같다
  assert.deepEqual(compareRange(week, { kind: "dow" }), { from: "2026-09-22", to: "2026-09-28" });
  // 5일(수~일)은 바로 앞 5일(금~화)이 아니라 한 주 전 수~일
  const five = { from: "2026-09-16", to: "2026-09-20" };
  assert.deepEqual(compareRange(five, { kind: "prev" }), { from: "2026-09-11", to: "2026-09-15" });
  assert.deepEqual(compareRange(five, { kind: "dow" }), { from: "2026-09-09", to: "2026-09-13" });
  // 직접 고르기는 시작일만, 길이는 같게
  assert.deepEqual(compareRange(five, { kind: "custom", from: "2026-09-01" }), { from: "2026-09-01", to: "2026-09-05" });
  assert.equal(compareError(five, { kind: "custom", from: "2026-09-13" }, "2026-04-01"), "비교 기간은 지금 기간보다 앞이어야 해요.");
  assert.equal(compareError(five, { kind: "custom", from: "2026-09-11" }, "2026-04-01"), null);
  assert.equal(lastCompareStart(five), "2026-09-11");
  assert.equal(compareError(five, { kind: "custom", from: "2026-03-01" }, "2026-04-01"), "비교 기간이 수집을 시작한 날보다 앞이에요.");
  assert.deepEqual(parseCompare("2026-09-01"), { kind: "custom", from: "2026-09-01" });
  assert.deepEqual(parseCompare("이상한 값"), { kind: "prev" });
  assert.equal(compareParam({ kind: "prev" }), null);
  assert.equal(compareParam({ kind: "off" }), "off");
});
