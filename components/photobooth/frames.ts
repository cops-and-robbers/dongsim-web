// 포토부스 프레임 레지스트리.
// 화이트/스카이/블랙 3종 — 레이아웃(창 좌표)은 동일하고 색상만 다르다.
// 창 좌표는 알파 채널 스캔으로 검증(창4개 전부 x=82, w=1200, h=830, y 간격 정확히 895).

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

// 3종 공통 창 좌표(1364×4096 캔버스, 창 1200×830 ≈ 1.446:1).
const SLOTS: readonly FrameSlot[] = [
  { x: 82, y: 99, w: 1200, h: 830 },
  { x: 82, y: 994, w: 1200, h: 830 },
  { x: 82, y: 1889, w: 1200, h: 830 },
  { x: 82, y: 2784, w: 1200, h: 830 },
];

export const FRAMES: readonly FrameDef[] = [
  {
    id: "white",
    label: "화이트",
    src: "/photobooth/frame-white.png",
    swatch: "#ffffff",
    width: 1364,
    height: 4096,
    slots: SLOTS,
  },
  {
    id: "sky",
    label: "스카이",
    src: "/photobooth/frame-sky.png",
    swatch: "#cbeeff",
    width: 1364,
    height: 4096,
    slots: SLOTS,
  },
  {
    id: "black",
    label: "블랙",
    src: "/photobooth/frame-black.png",
    swatch: "#000000",
    width: 1364,
    height: 4096,
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

/** 슬롯 가로:세로 비율 — 웹캠 프리뷰 크롭 비율을 맞출 때 사용. */
export function slotRatio(frame: FrameDef): number {
  return frame.slots[0].w / frame.slots[0].h;
}
