// 포토부스 운영 시간 게이트 설정.
// 운영 창(KST)을 정해두면 시간이 지났을 때 자동으로 "준비중" 화면이 뜬다.
// - openFrom/openUntil 가 비어 있으면(null) 게이트 꺼짐 = 항상 열림(테스트용 기본값).
// - forceClosed 를 true 로 두면 시간과 무관하게 항상 준비중(닫힘 화면 미리보기용).

type EventConfig = {
  /** 닫힘 화면에 보일 행사 이름. */
  venue: string;
  /** 닫힘 화면에 보일 날짜 문구. 비우면 날짜 줄 숨김. 예: "8월 0일 (토) 오후 2시" */
  dateLabel: string;
  /** 닫힘 화면에 보일 장소. 비우면 숨김. 예: "판교 투썸월드 B1" */
  location: string;
  /** 운영 시작(ISO, KST 오프셋 포함). 예: "2026-08-15T10:00:00+09:00" */
  openFrom: string | null;
  /** 운영 종료(ISO, KST 오프셋 포함). 예: "2026-08-15T18:00:00+09:00" */
  openUntil: string | null;
  /** true면 항상 준비중(미리보기/긴급 차단용). */
  forceClosed: boolean;
};

export const PHOTOBOOTH_EVENT: EventConfig = {
  venue: "서울 게임 타운",
  dateLabel: "7월 4일 (토) 낮 12시–오후 5시",
  location: "판교 투썸월드 B1",
  openFrom: "2026-07-04T11:30:00+09:00",
  openUntil: "2026-07-04T18:00:00+09:00",
  forceClosed: false,
};

/** 지금 부스를 열어도 되는 시간인지. 미설정이면 항상 열림. */
export function isBoothOpen(now: number = Date.now()): boolean {
  const { forceClosed, openFrom, openUntil } = PHOTOBOOTH_EVENT;
  if (forceClosed) return false;
  if (!openFrom || !openUntil) return true;
  const from = new Date(openFrom).getTime();
  const until = new Date(openUntil).getTime();
  if (Number.isNaN(from) || Number.isNaN(until)) return true; // 설정 오류 시 막지 않음
  return now >= from && now <= until;
}
