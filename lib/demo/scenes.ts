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
  | "my"
  // 방 만들기 코스 (#80)
  | "homeCreate"
  | "createZone"
  | "createJail"
  | "createBasic"
  | "createConfirm"
  | "hostWaiting"
  // 커뮤니티 코스 (#86)
  | "homeCommunity"
  | "communityDetail"
  | "communityChat";

export type DemoCourseId = "police" | "create" | "community";

export type DemoTask = { id: string; label: string };

export type DemoScene = {
  id: DemoSceneId;
  title: string;
  intro: string;
  tasks: DemoTask[];
};

// 데모 코스의 한 단계 - 여정 목록의 한 줄이다.
export type DemoCourseStep = {
  /** 여정 목록에 보이는 문장 */
  label: string;
  /** 가로(모바일) 여정에 보이는 짧은 이름 */
  short: string;
  /** 이 단계에 속하는 장면들 */
  scenes: readonly DemoSceneId[];
};

// 코스 = 장면들을 하나의 경험으로 묶은 것. 무대에서 골라 여정과 폰 흐름을
// 갈아끼운다. 도둑 시점 같은 코스가 생기면 copy.ts에 하나 더 정의한다.
export type DemoCourse = {
  id: DemoCourseId;
  /** 무대의 코스 선택 칩에 보이는 이름 */
  title: string;
  steps: readonly DemoCourseStep[];
  /** 이 장면에 닿으면 코스 완주 - 여정이 전부 체크된다 */
  finish: DemoSceneId;
};

// 데모에서 쓰는 방 코드. 참여 다이얼로그에 미리 채워져 있고
// 대기실 앱바에도 그대로 보이며, 커뮤니티 채팅의 게임 초대 카드도 같은
// 코드를 준다 - 어느 길로 와도 같은 방에 닿는 것처럼 보이게.
export const DEMO_ROOM_CODE = "K9X2QP";

// 데모 방문자의 닉네임. 홈 프로필 카드와 커뮤니티 채팅(참여 알림·내 말풍선)이
// 같은 사람이어야 하므로 한 곳에서 정한다. 앱이 실제로 만들어 주는 형식이다.
export const DEMO_NICKNAME = "민첩한괴도5308";

// 커뮤니티 채팅 각본의 타이밍(ms). 인사를 보내면 [답장 지연] 뒤 방장이 답하고,
// 답장에서 다시 [초대 지연] 뒤 게임 초대 카드가 도착한다.
export const COMMUNITY_REPLY_DELAY_MS = 1600;
export const COMMUNITY_INVITE_DELAY_MS = 1800;

// 장면이 코스의 몇 번째 단계인지. 코스 밖 장면(커뮤니티·마이 탭)은 -1 이라
// 무대가 직전 진행을 그대로 들고 있으면 된다. finish 장면에 닿으면 완주다.
export function courseProgress(course: DemoCourse, sceneId: DemoSceneId) {
  return {
    step: course.steps.findIndex((s) => s.scenes.includes(sceneId)),
    finished: sceneId === course.finish,
  };
}

// 방 만들기 기본 정보 4항목 (game_setting_values_editor.dart의
// GameSettingField 실측: 최소·최대와 키패드 빠른 추가 3개)
export type DemoSettingFieldId =
  | "participants"
  | "roundDuration"
  | "locationShare"
  | "policeWait";

export const DEMO_SETTING_FIELDS: readonly {
  id: DemoSettingFieldId;
  min: number;
  max: number;
  initial: number;
  quickAmounts: readonly [number, number, number];
}[] = [
  { id: "participants", min: 2, max: 150, initial: 2, quickAmounts: [5, 10, 20] },
  { id: "roundDuration", min: 10, max: 180, initial: 30, quickAmounts: [5, 10, 30] },
  { id: "locationShare", min: 0, max: 30, initial: 5, quickAmounts: [3, 5, 10] },
  { id: "policeWait", min: 1, max: 10, initial: 3, quickAmounts: [1, 3, 5] },
];

// 인게임 각본 - 발자국이 찍히는 위치와 간격(ms). 구역 원 안쪽 경로다.
export const FOOTPRINT_SCRIPT = [
  { left: "30%", top: "36%", rotate: -18 },
  { left: "44%", top: "46%", rotate: 8 },
  { left: "56%", top: "56%", rotate: -4 },
  { left: "62%", top: "66%", rotate: 14 },
] as const;
export const FOOTPRINT_INTERVAL_MS = 2200;
