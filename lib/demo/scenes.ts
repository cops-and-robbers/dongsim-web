// 데모 장면·코스의 구조 정의. 화면·안내·여정이 같은 데이터에서 나와서
// 서로 어긋날 수 없다 (#77). 문구는 로케일별로 lib/demo/copy.ts에 있다.
export type DemoTab = "home" | "community" | "my";
export type DemoSceneId =
  | "home"
  | "join"
  | "waiting"
  | "ingame"
  | "victory"
  | "community"
  | "my";

export type DemoTask = { id: string; label: string };

export type DemoScene = {
  id: DemoSceneId;
  title: string;
  intro: string;
  tasks: DemoTask[];
};

// 데모 코스의 한 단계 - 여정 목록의 한 줄이다. 도둑 시점·방 만들기 같은
// 코스가 생기면 copy.ts에 단계 배열을 하나 더 정의하고 무대에서 고르면 된다.
export type DemoCourseStep = {
  /** 여정 목록에 보이는 문장 */
  label: string;
  /** 가로(모바일) 여정에 보이는 짧은 이름 */
  short: string;
  /** 이 단계에 속하는 장면들 */
  scenes: readonly DemoSceneId[];
};

// 데모에서 쓰는 방 코드. 참여 다이얼로그에 미리 채워져 있고
// 대기실 앱바에도 그대로 보인다.
export const DEMO_ROOM_CODE = "K9X2QP";

// 장면이 코스의 몇 번째 단계인지. 코스 밖 장면(커뮤니티·마이 탭)은 -1 이라
// 무대가 직전 진행을 그대로 들고 있으면 된다. finish 장면에 닿으면 완주다.
export function courseProgress(
  steps: readonly DemoCourseStep[],
  sceneId: DemoSceneId,
  finish: DemoSceneId = "victory",
) {
  return {
    step: steps.findIndex((s) => s.scenes.includes(sceneId)),
    finished: sceneId === finish,
  };
}

// 인게임 각본 - 발자국이 찍히는 위치와 간격(ms). 구역 원 안쪽 경로다.
export const FOOTPRINT_SCRIPT = [
  { left: "30%", top: "36%", rotate: -18 },
  { left: "44%", top: "46%", rotate: 8 },
  { left: "56%", top: "56%", rotate: -4 },
  { left: "62%", top: "66%", rotate: 14 },
] as const;
export const FOOTPRINT_INTERVAL_MS = 2200;
