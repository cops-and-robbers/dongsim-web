/** "2026-07-05" → "2026년 7월 5일". 값이 비었거나 이상하면 빈 문자열. */
export function formatPostDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
