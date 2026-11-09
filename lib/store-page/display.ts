/**
 * 스토어 앱 화면에서 글자가 차지하는 자리와 넘칠 때 동작 (docs/admin-ui.md "스토어 페이지").
 *
 * 공식 문서에는 잘리는 기준이 없다. 그래서 실제 스토어 앱 캡처(iPhone App Store, Galaxy Google Play, 2026-11-07)를
 * 픽셀 단위로 쟀다. iPhone 은 폭 393pt(1pt = 캡처 1.692px), Galaxy 는 폭 384dp(1dp = 캡처 2.8125px)다.
 * 글자 크기는 캡처의 글자 폭이 Pretendard 로 같아지는 값이다. 어드민을 여는 기기와 상관없이 같은 곳에서 줄이 바뀌게
 * 미리보기는 늘 Pretendard 로 그린다.
 *
 * confirmed 는 앱 캡처에서 그 동작을 직접 본 것이다. App Store 앱에서 넘치는 예는 캡처가 없어서, 줄 제한은
 * apps.apple.com 을 폭 390px 로 열어 긴 문구를 넣어 본 값을 쓴다(fromWeb, 2026-11-08).
 */
import type { FieldId, Platform } from "./fields.ts";

export const STAGE_WIDTH: Record<Platform, number> = { ios: 393, android: 384 };
export const PREVIEW_FONT = '"Pretendard Variable", Pretendard, sans-serif';

export type Surface = "page" | "search" | "details" | "pageLong";

export type Slot = {
  surface: Surface;
  where: string;
  width: number;
  fontSize: number;
  lineHeight: number;
  fontWeight: number;
  /** 보이는 최대 줄 수. null 이면 줄 제한을 보지 못했거나 제한이 없다 */
  maxLines: number | null;
  confirmed: boolean;
  preLine: boolean;
  /** 앱이 아니라 웹 스토어에서 본 줄 제한 */
  fromWeb?: boolean;
  /** App Store Connect Device Preview 에서 본 줄 제한 */
  fromConsole?: boolean;
  /** 접히면 끝에 "더 보기"가 붙는다 */
  more?: boolean;
  /** 한 줄을 넘으면 화면 구성이 바뀐다 */
  bigWhenWrapped?: boolean;
};

export const SLOTS: Record<Platform, Partial<Record<FieldId, Slot[]>>> = {
  ios: {
    name: [
      { surface: "page", where: "제품 페이지", width: 218.7, fontSize: 19.4, lineHeight: 24, fontWeight: 700, maxLines: 2, confirmed: false, fromConsole: true, preLine: false },
      { surface: "search", where: "검색 결과", width: 246, fontSize: 12.85, lineHeight: 21, fontWeight: 600, maxLines: 1, confirmed: false, fromWeb: true, preLine: false },
    ],
    subtitle: [{ surface: "search", where: "검색 결과", width: 246, fontSize: 10.5, lineHeight: 18, fontWeight: 400, maxLines: 1, confirmed: false, fromWeb: true, preLine: false }],
    whatsNew: [{ surface: "page", where: "새로운 소식", width: 353, fontSize: 13.2, lineHeight: 24, fontWeight: 400, maxLines: 3, confirmed: true, more: true, preLine: true }],
    description: [{ surface: "page", where: "제품 페이지", width: 353, fontSize: 13.2, lineHeight: 24, fontWeight: 400, maxLines: 5, confirmed: false, fromWeb: true, more: true, preLine: true }],
  },
  android: {
    title: [
      { surface: "page", where: "상세 페이지", width: 238, fontSize: 22.1, lineHeight: 30, fontWeight: 500, maxLines: null, confirmed: true, bigWhenWrapped: true, preLine: false },
      { surface: "pageLong", where: "상세 페이지", width: 335.6, fontSize: 33, lineHeight: 50, fontWeight: 400, maxLines: null, confirmed: true, preLine: false },
      { surface: "search", where: "검색 결과", width: 219, fontSize: 13, lineHeight: 23.5, fontWeight: 400, maxLines: null, confirmed: false, preLine: false },
    ],
    shortDescription: [
      { surface: "page", where: "앱 정보", width: 335.6, fontSize: 22.15, lineHeight: 32, fontWeight: 400, maxLines: null, confirmed: false, preLine: false },
      { surface: "details", where: "세부정보", width: 335.6, fontSize: 13.25, lineHeight: 21, fontWeight: 400, maxLines: null, confirmed: true, preLine: false },
    ],
    fullDescription: [{ surface: "details", where: "세부정보", width: 335.6, fontSize: 13.25, lineHeight: 21, fontWeight: 400, maxLines: null, confirmed: true, preLine: true }],
  },
};

export const slotOf = (p: Platform, f: FieldId, s: Surface) => SLOTS[p][f]?.find((x) => x.surface === s);

/** 몇 줄이고 다 보이는지. 화면에서 잰 줄 수를 말로 바꾼다 */
export function fitLabel(slot: Slot, lines: number): { text: string; cut: boolean } {
  if (slot.bigWhenWrapped && lines > 1) return { text: `${slot.where} 큰 제목으로 바뀌어요`, cut: true };
  const cut = slot.maxLines !== null && lines > slot.maxLines;
  return { text: cut ? `${slot.where} ${lines}줄, ${slot.maxLines}줄까지 보여요` : `${slot.where} ${lines}줄`, cut };
}

export type Basis = "app" | "web" | "none";

/** "규격과 안내"의 글자가 넘칠 때. basis 는 앱 캡처, 웹 스토어, 아직 못 봄 */
export const OVERFLOW_ROWS: Record<Platform, { field: string; where: string; rule: string; basis: Basis }[]> = {
  ios: [
    { field: "새로운 기능", where: "제품 페이지", rule: "3줄까지 보이고 끝에 '더 보기'가 붙어요. 빈 줄도 한 줄로 세요", basis: "app" },
    { field: "이름", where: "제품 페이지", rule: "3줄까지 보이고, 넘으면 뒤가 잘려요", basis: "web" },
    { field: "이름", where: "검색 결과", rule: "1줄만 보이고, 넘으면 뒤가 잘려요", basis: "web" },
    { field: "부제", where: "검색 결과", rule: "1줄만 보이고, 넘으면 뒤가 잘려요. 제품 페이지에는 안 보여요", basis: "web" },
    { field: "설명", where: "제품 페이지", rule: "5줄까지 보이고 '더 보기'로 접혀요. 빈 줄도 한 줄로 세요", basis: "web" },
  ],
  android: [
    { field: "앱 이름", where: "상세 페이지", rule: "한 줄을 넘으면 화면이 바뀌어요. 개발자 이름이 맨 위로 가고, 이름이 큰 글자로 아이콘 위에 보여요", basis: "app" },
    { field: "간단한 설명", where: "앱 정보", rule: "큰 글자로 보여요. 37자 정도면 2줄이에요", basis: "app" },
    { field: "자세한 설명", where: "앱 정보", rule: "첫 화면에는 안 보이고, 화살표를 누르면 세부정보에 간단한 설명 다음으로 끝까지 보여요", basis: "app" },
    { field: "앱 이름", where: "검색 결과", rule: "개발자 이름 위에 보여요", basis: "none" },
  ],
};
