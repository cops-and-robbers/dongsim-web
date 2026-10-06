/**
 * 게시물 하나의 날짜별 추세 (#145). 지표 화면에서 게시물을 누르면 여는 상세가 쓴다.
 *
 * 수집기는 매일 아침(9시 17분) 게시물마다 누적값을 찍는다(instagram_media_daily).
 * 하루에 늘어난 양은 이웃한 두 기록의 차이다. D 일 아침 기록과 D+1 일 아침 기록의 차이를 D 일 몫으로 본다.
 * 기록이 하루 이상 빠지면 그 사이 몫은 어느 날 것인지 몰라 빈칸(null)으로 둔다.
 * 화면과 테스트가 같이 쓰므로 아무것도 부르지 않는다(dates 만).
 */

import { addDays, ymdRange } from "../dates.ts";
import type { PostSnapshot } from "./data.ts";

export type PostMetric = "views" | "reach" | "shares" | "saved" | "profileVisits" | "bioLinkClicks";

/** 날짜와 그날 늘어난 양. 차트의 x 축은 처음 기록 날부터 마지막 기록 전날까지 */
export function dailyGains(series: PostSnapshot[], metric: PostMetric): { days: string[]; values: (number | null)[] } {
  if (series.length < 2) return { days: [], values: [] };
  const byDay = new Map(series.map((s) => [s.day, s[metric]]));
  const days = ymdRange(series[0].day, addDays(series[series.length - 1].day, -1));
  const values = days.map((d) => {
    const a = byDay.get(d);
    const b = byDay.get(addDays(d, 1));
    if (a === undefined || b === undefined || a === null || b === null) return null;
    // 인스타가 값을 고쳐 조금 줄어드는 날이 있다. 음수는 0 으로 본다
    return Math.max(0, b - a);
  });
  return { days, values };
}

/**
 * 올린 뒤 처음 며칠에 전체의 얼마가 붙었나. 첫 기록이 올린 다음 날 아침 안이어야 믿을 수 있다
 * (더 늦게 기록을 시작한 게시물은 처음 며칠 몫을 모른다)
 */
export function earlyShare(series: PostSnapshot[], postedDay: string, metric: PostMetric, days = 3): number | null {
  const first = series[0];
  const last = series[series.length - 1];
  if (!first || !last || first.day > addDays(postedDay, 1)) return null;
  const total = last[metric];
  if (!total) return null;
  // 올린 날 + days 일 아침 기록이 그때까지의 누적이다
  const cut = series.filter((s) => s.day <= addDays(postedDay, days)).at(-1);
  if (!cut || cut[metric] === null || last.day <= addDays(postedDay, days)) return null;
  return (cut[metric] as number) / total;
}
