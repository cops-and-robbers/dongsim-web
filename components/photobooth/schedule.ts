// 포토부스 운영 시간 게이트 설정.
// 배포(production)에서만 운영 창(KST)으로 게이트가 적용되고, 로컬 개발에선 항상 열린다
// (그래서 이 설정 그대로도 로컬 테스트가 막히지 않는다).
// forceClosed=true 면 시간과 무관하게 항상 준비중(닫힘 화면 미리보기·긴급 차단용).
//
// 값은 전부 Vercel env(NEXT_PUBLIC_PHOTOBOOTH_*)로 덮을 수 있다 (#123) - 행사가
// 바뀔 때 코드 수정 없이 env 갱신 + Redeploy로 끝낸다. 닫힘 화면(클라이언트)도
// 읽는 값이라 NEXT_PUBLIC 접두사가 필요하고, 그래서 값 변경은 재배포로만 반영된다.
// 아래 하드코딩 값은 env가 없을 때의 폴백(마지막 행사)이다.

type EventConfig = {
  /** 닫힘 화면에 보일 행사 이름. */
  venue: string;
  /** 닫힘 화면에 보일 날짜 문구. 비우면 날짜 줄 숨김. */
  dateLabel: string;
  /** 닫힘 화면에 보일 장소. 비우면 숨김. */
  location: string;
  /** 운영 시작(ISO, KST 오프셋 포함). */
  openFrom: string | null;
  /** 운영 종료(ISO, KST 오프셋 포함). */
  openUntil: string | null;
  /** true면 항상 준비중(미리보기/긴급 차단용). */
  forceClosed: boolean;
};

export const PHOTOBOOTH_EVENT: EventConfig = {
  venue: process.env.NEXT_PUBLIC_PHOTOBOOTH_VENUE ?? "서울 게임 타운",
  dateLabel:
    process.env.NEXT_PUBLIC_PHOTOBOOTH_DATE_LABEL ??
    "7월 4일 (토) 낮 12시-오후 5시",
  location: process.env.NEXT_PUBLIC_PHOTOBOOTH_LOCATION ?? "판교 투썸월드 B1",
  // 운영 시작은 행사보다 이르게 잡는다 - 설치·디버깅 시간 확보 (지난 행사: 3시간 전)
  openFrom:
    process.env.NEXT_PUBLIC_PHOTOBOOTH_OPEN_FROM ?? "2026-07-04T09:00:00+09:00",
  openUntil:
    process.env.NEXT_PUBLIC_PHOTOBOOTH_OPEN_UNTIL ??
    "2026-07-04T18:00:00+09:00",
  forceClosed: process.env.NEXT_PUBLIC_PHOTOBOOTH_FORCE_CLOSED === "1",
};

/** 행사가 끝났는지(운영 종료 시각 이후) - 닫힘 화면을 "준비중"과 "감사 인사"로 분기. */
export function isEventOver(now: number = Date.now()): boolean {
  const { openUntil } = PHOTOBOOTH_EVENT;
  if (!openUntil) return false;
  const until = new Date(openUntil).getTime();
  return !Number.isNaN(until) && now > until;
}

/** 지금 부스를 열어도 되는지. 개발 모드는 항상 열림, 배포는 운영 창에만. */
export function isBoothOpen(now: number = Date.now()): boolean {
  if (PHOTOBOOTH_EVENT.forceClosed) return false;
  if (process.env.NODE_ENV !== "production") return true; // 로컬 개발은 항상 열림
  const { openFrom, openUntil } = PHOTOBOOTH_EVENT;
  if (!openFrom || !openUntil) return true;
  const from = new Date(openFrom).getTime();
  const until = new Date(openUntil).getTime();
  if (Number.isNaN(from) || Number.isNaN(until)) return true; // 설정 오류 시 막지 않음
  return now >= from && now <= until;
}
