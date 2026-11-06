// 로컬에서 온라인 게임 화면을 만져 보는 가짜 게임 서버. dev 에서는 MSW 가 이 값으로 답해 실제 게임 서버에 닿지 않는다.
import { validateWebgameChange, WEBGAME_URL_DEFAULT, type WebgameChange, type WebgameState } from "@/lib/admin/webgame";

let state: WebgameState = { mode: "soon", message: "", until: null, at: Date.parse("2026-11-06T11:00:00Z"), by: "테스트 관리자", url: WEBGAME_URL_DEFAULT, writable: true };

export const mockWebgame = () => state;

export function mockApplyWebgame(change: WebgameChange): { status: number; body: unknown } {
  const invalid = validateWebgameChange(change);
  if (invalid) return { status: 400, body: { error: invalid } };
  state = { ...state, ...change, message: change.message.trim(), until: change.until || null, at: Date.now(), by: "테스트 관리자" };
  return { status: 200, body: state };
}
