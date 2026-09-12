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
