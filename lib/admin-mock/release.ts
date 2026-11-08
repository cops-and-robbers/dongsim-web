// 로컬에서 출시 보드를 상황마다 보는 가짜 값(#229). 실제 스토어에 닿지 않는다.
// 실제 판단 함수(buildBoard)를 그대로 거쳐서, 화면이 운영과 같은 말을 한다. 상황은 화면 위 "상황 고르기"로 바꾼다
import { buildBoard, type ReleaseBoard } from "@/lib/release/board";
import { SCENARIOS } from "@/lib/release/fixtures";
import { androidOptions, iosOptions } from "@/lib/release/options";

export const MOCK_SCENARIOS = Object.entries(SCENARIOS).map(([id, s]) => ({ id, label: s.label }));

export function mockRelease(scenario: string | null): ReleaseBoard {
  const s = SCENARIOS[scenario ?? "real"] ?? SCENARIOS.real;
  // 읽은 시각은 지금으로. 상대 시각("3시간째")은 상황의 시각과 견주므로 그대로 둔다
  const board = { ...buildBoard(s.input), readAt: new Date().toISOString(), writable: true, actions: mockLog };
  if (board.ios.ok && !("error" in s.input.ios)) board.ios.options = iosOptions(s.input.ios);
  if (board.android.ok && !("error" in s.input.android)) board.android.options = androidOptions(s.input.android);
  return board;
}

const mockLog: NonNullable<ReleaseBoard["actions"]> = [
  { id: 3, platform: "ios", action: "ios.renameVersion", version: "3.2.8", status: "done", message: "버전 칸 이름을 3.2.17로 바꿨어요", actor: "테스트 관리자", createdAt: "2026-11-08T03:10:00Z" },
  { id: 2, platform: "android", action: "android.createRelease", version: "392", status: "failed", message: "Play 가 오류를 돌려줬어요 (400 Changes are in review)", actor: "테스트 관리자", createdAt: "2026-11-07T09:00:00Z" },
];

/** 로컬에서 누른 조작. 스토어에 닿지 않고 성공한 것처럼 답한다 */
export function mockRunAction(body: { id?: string; dryRun?: boolean; confirm?: string }): { status: number; body: unknown } {
  if (body.dryRun) return { status: 200, body: { message: "Play 가 이 변경을 받아들여요(로컬 가짜, 커밋하지 않았어요)", validated: true } };
  return { status: 200, body: { message: `로컬 가짜: ${body.id} 을 한 것처럼 답했어요. 실제 스토어는 그대로예요` } };
}
