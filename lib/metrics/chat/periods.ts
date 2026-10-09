/**
 * "지난주", "이번 달" 같은 말을 서버가 날짜로 풀어 지시문에 넣는다 (#163).
 * 모델이 날짜를 세다 틀리지 않게 하려는 것이다. 기준은 한국 날짜이고, 오늘은 숫자가 다 안 들어와 어제까지 본다.
 */

import { addDays } from "../dates.ts";

export type Period = { label: string; start: string; end: string };

const dow = (ymd: string) => new Date(`${ymd}T00:00:00Z`).getUTCDay(); // 0 일요일
const monthStart = (ymd: string) => `${ymd.slice(0, 8)}01`;
const prevMonthEnd = (ymd: string) => addDays(monthStart(ymd), -1);

/** today 는 한국 날짜(오늘). 반환하는 기간은 모두 어제를 넘지 않는다 */
export function namedPeriods(today: string): Period[] {
  const y = addDays(today, -1);
  // 이번 주 월요일(오늘 기준). 오늘이 월요일이면 이번 주는 아직 하루도 안 끝났다
  const thisMon = addDays(today, -((dow(today) + 6) % 7));
  const lastMon = addDays(thisMon, -7);
  const out: Period[] = [
    { label: "어제", start: y, end: y },
    { label: "최근 7일", start: addDays(y, -6), end: y },
    { label: "최근 28일", start: addDays(y, -27), end: y },
    { label: "지난주(월~일)", start: lastMon, end: addDays(lastMon, 6) },
    { label: "지지난주(월~일)", start: addDays(lastMon, -7), end: addDays(lastMon, -1) },
  ];
  if (thisMon <= y) out.push({ label: "이번 주(월~어제)", start: thisMon, end: y });
  const thisMonth = monthStart(today);
  if (thisMonth <= y) out.push({ label: "이번 달(1일~어제)", start: thisMonth, end: y });
  const lastMonthEnd = prevMonthEnd(today);
  out.push({ label: "지난달", start: monthStart(lastMonthEnd), end: lastMonthEnd });
  return out;
}
