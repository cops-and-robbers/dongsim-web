// 포토부스 운영 시간 게이트.
// 행사 이름, 날짜, 운영 시간은 어드민 "행사"에서 정하고 서버가 지금 행사를 골라 넘긴다(lib/event/server.ts, #219).
// 예전처럼 Vercel 환경 변수를 고치고 다시 배포하지 않는다.
// 배포(production)에서만 운영 시간으로 막고, 로컬 개발에선 닫아 두지 않았으면 늘 열린다(로컬 테스트가 막히지 않게).
import { boothState, type EventSettings } from "@/lib/event/settings";

/** 지금 부스를 열어도 되는지 */
export function isBoothOpen(s: EventSettings, nowMs: number = Date.now()): boolean {
  if (s.boothClosed) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return boothState(s, nowMs) === "open";
}

/** 닫혀 있을 때 "준비 중"이 아니라 "감사 인사"를 보일 때(운영 시간이 지난 뒤) */
export const isBoothOver = (s: EventSettings, nowMs: number = Date.now()) => boothState({ ...s, boothClosed: false }, nowMs) === "after";
