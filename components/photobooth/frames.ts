// 포토부스 프레임 레지스트리.
// 서대페부터 단일 디자인(연두, #130) - 팀 결정으로 색상 선택을 두지 않는다.
// 창 좌표는 원본 SVG 경로에서 실측(4창 전부 x 105.95~1694.04, 높이 1117.05로 균일).
// 창 위에 걸친 장식 요소는 의도된 디자인이다 - 프레임이 사진 위에 덮이며 함께 보인다.
//
// 프레임을 갈아 끼우거나 추가하려면: scripts/render-frame.mjs 로 SVG를 렌더·실측한 뒤
// FRAMES 에 항목을 추가/교체하면 끝이다. 2개 이상이 되면 선택 화면이 자동으로 돌아온다
// (HAS_FRAME_CHOICE). 크기·창 좌표는 프레임마다 따로 들고 있어 디자인이 달라도 안전하다.

export type FrameSlot = { x: number; y: number; w: number; h: number };

export type FrameDef = {
  /** 안정적인 식별자(URL 파라미터·저장 키 등에 사용). */
  id: string;
  /** 선택 UI 표시용 이름. */
  label: string;
  /** /public 기준 프레임 PNG 경로(투명 창 + 스티커). */
  src: string;
  /** 선택 스와치에 쓸 대표색. */
  swatch: string;
  width: number;
  height: number;
  /** 사진이 들어갈 창들. 위→아래(합성·선택 순서)와 일치해야 한다. */
  slots: readonly FrameSlot[];
};

// 1800×5400 캔버스, 창 1588×1117 ≈ 1.42:1.
const SLOTS: readonly FrameSlot[] = [
  { x: 106, y: 147, w: 1588, h: 1117 },
  { x: 106, y: 1388, w: 1588, h: 1117 },
  { x: 106, y: 2629, w: 1588, h: 1117 },
  { x: 106, y: 3871, w: 1588, h: 1117 },
];

export const FRAMES: readonly FrameDef[] = [
  {
    id: "green",
    label: "그린",
    src: "/photobooth/frame-green.png",
    swatch: "#E1ECCF",
    width: 1800,
    height: 5400,
    slots: SLOTS,
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

/** 슬롯 가로:세로 비율 - 웹캠 프리뷰 크롭 비율을 맞출 때 사용. */
export function slotRatio(frame: FrameDef): number {
  return frame.slots[0].w / frame.slots[0].h;
}
