// 모집글 날짜·인원 표기. 화면 여러 곳에서 같은 모양이어야 해서 한곳에 모은다.

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

/** 서버·클라이언트가 같은 값을 그리도록 KST 로 고정한다. */
function kst(iso: string): Date {
  return new Date(new Date(iso).toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
}

/** "9월 10일 (목)" - 목록에서 날짜 열로 쓴다 */
export function dayLabel(iso: string): string {
  const d = kst(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY[d.getDay()]})`;
}

/** "저녁 6시" - 24시 표기보다 읽기 쉽다 */
export function timeLabel(iso: string): string {
  const d = kst(iso);
  const hour = d.getHours();
  const minute = d.getMinutes();
  const part = hour < 6 ? "새벽" : hour < 12 ? "오전" : hour < 18 ? "낮" : "저녁";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute ? `${part} ${h12}시 ${minute}분` : `${part} ${h12}시`;
}

/** "9월 10일 (목) 저녁 6시" - 한 줄로 붙여 쓸 때 */
export function meetingLabel(iso: string): string {
  return `${dayLabel(iso)} ${timeLabel(iso)}`;
}

/** "3일 뒤예요" / "오늘이에요" - 급한 정도를 한 줄로 알려준다 */
export function untilLabel(iso: string, now: number = Date.now()): string | null {
  const target = new Date(iso).getTime();
  const diffDays = Math.ceil((target - now) / 86_400_000);
  if (diffDays < 0) return null;
  if (diffDays === 0) return "오늘이에요";
  if (diffDays === 1) return "내일이에요";
  if (diffDays <= 14) return `${diffDays}일 뒤예요`;
  return null;
}

/** "8자리 남았어요" / "한 자리 남았어요" / "자리가 다 찼어요" */
export function seatLabel(left: number): string {
  if (left <= 0) return "자리가 다 찼어요";
  if (left === 1) return "한 자리 남았어요";
  return `${left}자리 남았어요`;
}
