// 이벤트(서울 게임 타운) 페이지 노출 게이트 - 행사 당일엔 본문, 그 외엔 "곧 공개" 티저.
// 배포(production)에서만 날짜 게이트가 적용되고, 로컬 개발에선 항상 본문이 뜬다
// (그래서 이 파일을 그대로 커밋해도 로컬 테스트가 막히지 않는다). forceClosed로 티저 미리보기.

type EventGate = {
  venue: string;
  dateLabel: string;
  openFrom: string | null;
  openUntil: string | null;
  forceClosed: boolean;
};

export const EVENT: EventGate = {
  venue: "서울 게임 타운",
  dateLabel: "7월 4일 (토)",
  openFrom: "2026-07-04T09:00:00+09:00", // 포토부스와 동일한 운영 창(9-18시)
  openUntil: "2026-07-04T18:00:00+09:00",
  forceClosed: false, // 티저 미리보려면 잠깐 true
};

/** 행사가 끝났는지(운영 종료 시각 이후) - 닫힘 화면을 "곧 공개"와 "감사 인사"로 분기. */
export function isEventOver(now: number = Date.now()): boolean {
  const { openUntil } = EVENT;
  if (!openUntil) return false;
  const until = new Date(openUntil).getTime();
  return !Number.isNaN(until) && now > until;
}

/** 지금 이벤트 본문을 노출해도 되는지. 개발 모드는 항상 열림, 배포는 행사 당일만. */
export function isEventOpen(now: number = Date.now()): boolean {
  if (EVENT.forceClosed) return false;
  if (process.env.NODE_ENV !== "production") return true; // 로컬 개발은 항상 본문
  const { openFrom, openUntil } = EVENT;
  if (!openFrom || !openUntil) return true;
  const from = new Date(openFrom).getTime();
  const until = new Date(openUntil).getTime();
  if (Number.isNaN(from) || Number.isNaN(until)) return true;
  return now >= from && now <= until;
}
