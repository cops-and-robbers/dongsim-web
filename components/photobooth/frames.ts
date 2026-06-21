// 포토부스 프레임 레지스트리.
// 지금은 "경찰과 도둑" 한 개뿐 → 프레임 선택 단계는 두지 않는다.
// 나중에 FRAMES 배열에 항목을 추가하면 선택 단계를 붙일 수 있도록 구조만 열어둔다.

export type FrameSlot = { x: number; y: number; w: number; h: number };

export type FrameDef = {
  /** 안정적인 식별자(URL 파라미터·저장 키 등에 사용). */
  id: string;
  /** 선택 UI 표시용 이름. */
  label: string;
  /** /public 기준 프레임 PNG 경로(투명 창 + 스티커). */
  src: string;
  width: number;
  height: number;
  /** 사진이 들어갈 창들. 위→아래(합성·선택 순서)와 일치해야 한다. */
  slots: readonly FrameSlot[];
};

export const FRAMES: readonly FrameDef[] = [
  {
    id: "cops-and-robbers",
    label: "경찰과 도둑",
    src: "/photobooth/frame.png",
    width: 1800,
    height: 5400,
    // 좌표 검증: frame.png 알파 채널 16경계(창4 × 상·하·좌·우) 전부 PASS — 900ppi inch사양 일치.
    // 모든 창: x=112.5, w=1575, h=1125 (가로 7:5).
    slots: [
      { x: 112.5, y: 112.5, w: 1575, h: 1125 },
      { x: 112.5, y: 1293.75, w: 1575, h: 1125 },
      { x: 112.5, y: 2475, w: 1575, h: 1125 },
      { x: 112.5, y: 3656.25, w: 1575, h: 1125 },
    ],
  },
] as const;

export const DEFAULT_FRAME = FRAMES[0];

/** 프레임 선택 단계가 의미 있는지(2개 이상일 때). */
export const HAS_FRAME_CHOICE = FRAMES.length > 1;

export function getFrame(id?: string | null): FrameDef {
  if (!id) return DEFAULT_FRAME;
  return FRAMES.find((f) => f.id === id) ?? DEFAULT_FRAME;
}

/** 프레임이 요구하는 최종 선택 장수(= 슬롯 수). */
export function pickCount(frame: FrameDef): number {
  return frame.slots.length;
}

/** 슬롯 가로:세로 비율 — 웹캠 프리뷰 크롭 비율을 맞출 때 사용. */
export function slotRatio(frame: FrameDef): number {
  return frame.slots[0].w / frame.slots[0].h;
}
