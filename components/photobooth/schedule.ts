// 포토부스 운영 시간 게이트 설정.
// 배포(production)에서만 운영 창(KST)으로 게이트가 적용되고, 로컬 개발에선 항상 열린다
// (그래서 이 파일을 그대로 커밋해도 로컬 테스트가 막히지 않는다).
// forceClosed=true 면 시간과 무관하게 항상 준비중(닫힘 화면 미리보기용).

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
  venue: "서울 게임 타운",
  dateLabel: "7월 4일 (토) 낮 12시–오후 5시",
  location: "판교 투썸월드 B1",
  openFrom: "2026-07-04T09:00:00+09:00", // 설치·디버깅 위해 9시부터 접근 가능
  openUntil: "2026-07-04T18:00:00+09:00",
  forceClosed: false, // 준비중 화면 미리보려면 잠깐 true
};

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
