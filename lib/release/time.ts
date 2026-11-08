// 출시 보드의 시각 말. 스토어는 미국 서부나 UTC 로 주지만 화면은 모두 한국 시각과 상대 시각으로 쓴다.

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

/** "11/8 (토) 0:48" 한국 시각 */
export function kstShort(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} (${WEEK[d.getUTCDay()]}) ${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** "11월 2일 (일)" 한국 날짜. YYYY-MM-DD 를 받는다 */
export function kstDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${m}월 ${d}일 (${WEEK[w]})`;
}

function span(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${Math.max(min, 1)}분`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간`;
  const days = Math.floor(h / 24);
  const rest = h % 24;
  return rest ? `${days}일 ${rest}시간` : `${days}일`;
}

/** "방금", "12분 전", "3시간 전", "2일 전". 지난 일은 큰 단위 하나로 */
export function ago(iso: string, now: number): string {
  const ms = now - new Date(iso).getTime();
  if (ms < 60_000) return "방금";
  if (ms < 3600_000) return `${Math.floor(ms / 60_000)}분 전`;
  if (ms < 86400_000) return `${Math.floor(ms / 3600_000)}시간 전`;
  return `${Math.floor(ms / 86400_000)}일 전`;
}

/** "12분째", "1일 4시간째". 기다리는 일(심사)에 쓴다 */
export const since = (iso: string, now: number) => `${span(Math.max(now - new Date(iso).getTime(), 0))}째`;
