/**
 * 지표 화면 달력(components/admin/metrics/DateRangePicker.tsx)의 날짜 계산 (#145).
 * 화면 없이 테스트하려고 따로 뺐다(calendar.test.mjs). 날짜는 YYYY-MM-DD 문자열, 시간대 계산 없음.
 */

import { addDays, ymdRange } from "../dates.ts";

export type DayRange = { from: string; to: string };

export const MAX_RANGE_DAYS = 366;
export const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export const parts = (ymd: string) => ymd.split("-").map(Number) as [number, number, number];
export const weekday = (ymd: string) => new Date(`${ymd}T00:00:00Z`).getUTCDay();
export const monthStart = (ymd: string) => `${ymd.slice(0, 7)}-01`;
export function addMonths(first: string, n: number): string {
  const [y, m] = parts(first);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}
export const monthEnd = (first: string) => addDays(addMonths(first, 1), -1);
/** 한 달 앞뒤 같은 날. 31일에서 2월로 가면 2월 말일 */
export function shiftMonth(ymd: string, n: number): string {
  const first = addMonths(monthStart(ymd), n);
  const last = monthEnd(first);
  const day = `${first.slice(0, 8)}${ymd.slice(8, 10)}`;
  return day > last ? last : day;
}
export const lengthOf = (r: DayRange) => ymdRange(r.from, r.to).length;
export const clamp = (d: string, min: string, max: string) => (d < min ? min : d > max ? max : d);

export const dayLabel = (ymd: string, withWeekday = false) => {
  const [, m, d] = parts(ymd);
  return `${m}월 ${d}일${withWeekday ? ` (${WEEK[weekday(ymd)]})` : ""}`;
};

/** 자주 쓰는 기간. 고를 수 있는 날 밖이면 잘라 내고, 다 밖이면 고를 수 없다 */
/**
 * "9월 23일~9월 27일". 해가 바뀌는 기간이거나 올해(thisYearOf 의 해)가 아니면 연도를 붙인다.
 * 연도가 없으면 "9월 25일~3월 31일"이 거꾸로 된 기간처럼 읽힌다
 */
export function rangeLabel(r: DayRange, thisYearOf: string, withWeekday = false): string {
  const year = (d: string) => d.slice(0, 4);
  const needYear = year(r.from) !== year(r.to) || year(r.from) !== year(thisYearOf);
  const one = (d: string) => `${needYear ? `${Number(year(d))}년 ` : ""}${dayLabel(d, withWeekday)}`;
  return `${one(r.from)}~${one(r.to)}`;
}

export function presets(min: string, max: string): { label: string; range: DayRange | null }[] {
  const today = addDays(max, 1);
  const thisMonth = monthStart(today);
  const lastMonth = addMonths(thisMonth, -1);
  const fit = (from: string, to: string): DayRange | null => {
    const f = from < min ? min : from;
    const t = to > max ? max : to;
    return f <= t ? { from: f, to: t } : null;
  };
  const back = (n: number) => fit(addDays(max, -(n - 1)), max);
  return [
    { label: "어제", range: back(1) },
    { label: "지난 7일", range: back(7) },
    { label: "지난 14일", range: back(14) },
    { label: "지난 4주", range: back(28) },
    { label: "지난 13주", range: back(91) },
    // 오늘이 1일이면 이번 달은 아직 어제까지 하루도 없다
    { label: "이번 달", range: thisMonth <= max ? fit(thisMonth, max) : null },
    { label: "지난달", range: fit(lastMonth, monthEnd(lastMonth)) },
    { label: "모은 날 전체", range: lengthOf({ from: min, to: max }) <= MAX_RANGE_DAYS ? fit(min, max) : back(MAX_RANGE_DAYS) },
  ];
}

/**
 * 비교 기간 (#152). 지표 화면이 지금 기간을 무엇과 비교하나.
 * - prev: 바로 앞 같은 길이(기본)
 * - dow: 요일을 맞춘 이전 기간. 7일 단위가 아닌 기간이면 7의 배수만큼 앞으로 옮겨 같은 요일부터 시작한다
 *   (GA4 의 "이전 기간(요일 일치)"과 같다). 7일 단위면 prev 와 같다
 * - custom: 시작일만 고르고 길이는 지금 기간과 같다. 길이가 다르면 합계 비교가 불공평하고 차트를 날짜별로 겹칠 수 없다
 * - off: 비교하지 않는다(서버는 prev 로 계산하고 화면이 숨긴다)
 * 작년 같은 기간은 데이터가 2026-04 부터라 넣지 않았다
 */
export type CompareMode = { kind: "prev" } | { kind: "dow" } | { kind: "custom"; from: string } | { kind: "off" };

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 주소의 cmp 값 → 비교 방식. 모르는 값은 기본(prev) */
export function parseCompare(v: string | null): CompareMode {
  if (v === "dow") return { kind: "dow" };
  if (v === "off") return { kind: "off" };
  if (v && YMD_RE.test(v)) return { kind: "custom", from: v };
  return { kind: "prev" };
}

/** 비교 방식 → 주소의 cmp 값(기본이면 null 로 빼서 주소를 짧게) */
export function compareParam(m: CompareMode): string | null {
  return m.kind === "prev" ? null : m.kind === "custom" ? m.from : m.kind;
}

/** 비교할 기간. off 는 화면이 숨길 뿐 숫자는 prev 로 계산한다 */
export function compareRange(r: DayRange, m: CompareMode): DayRange {
  const len = lengthOf(r);
  if (m.kind === "custom") return { from: m.from, to: addDays(m.from, len - 1) };
  const shift = m.kind === "dow" ? Math.ceil(len / 7) * 7 : len;
  return { from: addDays(r.from, -shift), to: addDays(r.from, -shift + len - 1) };
}

/** 직접 고른 비교 기간이 쓸 수 있는지. 지금 기간보다 앞서 끝나야 하고(겹치면 같은 날을 두 번 센다), 수집 시작 뒤여야 한다 */
export function compareError(r: DayRange, m: CompareMode, min: string): string | null {
  if (m.kind !== "custom") return null;
  const c = compareRange(r, m);
  if (c.to >= r.from) return "비교 기간은 지금 기간보다 앞이어야 해요.";
  if (c.from < min) return "비교 기간이 수집을 시작한 날보다 앞이에요.";
  return null;
}

/** 직접 고를 때 시작일로 고를 수 있는 마지막 날(이날 시작하면 지금 기간 바로 전날에 끝난다) */
export const lastCompareStart = (r: DayRange) => addDays(r.from, -lengthOf(r));
