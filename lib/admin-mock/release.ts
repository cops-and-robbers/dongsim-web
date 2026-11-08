// 로컬에서 출시 보드를 상황마다 보는 가짜 값(#229). 실제 스토어에 닿지 않는다.
// 실제 판단 함수(buildBoard)를 그대로 거쳐서, 화면이 운영과 같은 말을 한다. 상황은 화면 위 "상황 고르기"로 바꾼다
import { buildBoard, type ReleaseBoard } from "@/lib/release/board";
import { SCENARIOS } from "@/lib/release/fixtures";

export const MOCK_SCENARIOS = Object.entries(SCENARIOS).map(([id, s]) => ({ id, label: s.label }));

export function mockRelease(scenario: string | null): ReleaseBoard {
  const s = SCENARIOS[scenario ?? "real"] ?? SCENARIOS.real;
  // 읽은 시각은 지금으로. 상대 시각("3시간째")은 상황의 시각과 견주므로 그대로 둔다
  return { ...buildBoard(s.input), readAt: new Date().toISOString() };
}
