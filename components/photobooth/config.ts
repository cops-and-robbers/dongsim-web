// 포토부스 촬영 설정 - 추후 조정이 잦을 값만 한곳에 모음.
// (최종 "선택 장수"는 프레임 슬롯 수를 따르므로 frames.ts에서 파생한다.)

/** 총 촬영 장수 - 이 중에서 프레임 슬롯 수만큼 골라 합성한다. */
export const SHOT_COUNT = 6;

/** 컷당 카운트다운(초). 사용자는 기다리지 않고 "지금 찍기"로 즉시 촬영할 수도 있다. */
export const COUNTDOWN_SECONDS = 3;

/**
 * 인쇄 용지 레이아웃 (#123) - 프린터 기종이 바뀌면 여기만 바꾼다.
 * - "strip-2x6": 2x6인치 스트립 전용지에 1장
 * - "postcard-pair": 엽서지(100x148mm)에 같은 스트립 2장 나란히 → 세로로 반 재단
 *
 * 현재 장비: 캐논 SELPHY CP1500 + RP-108(엽서 100x148mm, 테두리 없는 인화)
 * → 엽서에 2장 찍어 반으로 자르는 postcard-pair.
 */
export const PRINT_LAYOUT: "strip-2x6" | "postcard-pair" = "postcard-pair";

/**
 * 보더리스 오버스캔 역보정 배율 (postcard-pair 전용).
 * SELPHY는 테두리 없는 인화 시 이미지를 약 4% 확대해 종이 밖으로 흘리므로,
 * 그만큼 미리 축소해 두면 확대 후에 원래 크기로 찍힌다. 축소로 생기는 가장자리
 * 틈은 프레임 배경색으로 채워져 있어(QrScreen 인쇄 CSS) 흰 여백이 보이지 않는다.
 * 시험 인쇄에서 잘림이 남으면 낮추고, 연두 띠가 보이면 올린다.
 */
export const PRINT_OVERSCAN_SCALE = 0.96;
