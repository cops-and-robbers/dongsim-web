/** 날짜 문자열(YYYY-MM-DD) 다루기. 시간대 계산 없이 달력 날짜만 더하고 뺀다 (#142). */

const DAY = 86_400_000;

export function addDays(ymd: string, days: number): string {
  return new Date(Date.parse(`${ymd}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}

/** from 부터 to 까지 (둘 다 포함) */
export function ymdRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** 그 시간대의 오늘 날짜 */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

/** "20260929" → "2026-09-29" */
export function compactToYmd(s: string): string {
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

/** "09/29/2026" → "2026-09-29" (애플 판매 리포트 형식) */
export function usToYmd(s: string): string {
  const [m, d, y] = s.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
