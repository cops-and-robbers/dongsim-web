/**
 * 스토어 앱 화면에서 글자가 차지하는 자리와 넘칠 때 동작 (docs/admin-ui.md "스토어 페이지").
 *
 * 공식 문서에는 잘리는 기준이 없다. 그래서 실제 스토어 앱 캡처(iPhone App Store, Galaxy Google Play, 2026-11-07)를
 * 픽셀 단위로 쟀다. iPhone 은 폭 393pt(1pt = 캡처 1.692px), Galaxy 는 폭 384dp(1dp = 캡처 2.8125px)다.
 * 글자 크기는 캡처의 글자 폭이 Pretendard 로 같아지는 값이다. 어드민을 여는 기기와 상관없이 같은 곳에서 줄이 바뀌게
 * 미리보기는 늘 Pretendard 로 그린다.
 *
 * confirmed 는 캡처에서 그 동작을 직접 본 것이다. false 인 칸은 넘치는 예가 캡처에 없어서 줄 제한을 적지 않는다.
 */
import type { FieldId, Platform } from "./fields.ts";

export const STAGE_WIDTH: Record<Platform, number> = { ios: 393, android: 384 };
export const PREVIEW_FONT = '"Pretendard Variable", Pretendard, sans-serif';

export type Surface = "page" | "search";

export type Slot = {
  surface: Surface;
  where: string;
  width: number;
  fontSize: number;
  lineHeight: number;
  fontWeight: number;
  /** 보이는 최대 줄 수. null 이면 캡처로 제한을 보지 못했다 */
  maxLines: number | null;
  confirmed: boolean;
  preLine: boolean;
};

export const SLOTS: Record<Platform, Partial<Record<FieldId, Slot[]>>> = {
  ios: {
    name: [
      { surface: "page", where: "제품 페이지", width: 218.7, fontSize: 19.4, lineHeight: 24, fontWeight: 700, maxLines: null, confirmed: false, preLine: false },
      { surface: "search", where: "검색 결과", width: 246, fontSize: 12.85, lineHeight: 21, fontWeight: 600, maxLines: null, confirmed: false, preLine: false },
    ],
    subtitle: [{ surface: "search", where: "검색 결과", width: 246, fontSize: 10.5, lineHeight: 18, fontWeight: 400, maxLines: null, confirmed: false, preLine: false }],
    whatsNew: [{ surface: "page", where: "새로운 소식", width: 353, fontSize: 13.2, lineHeight: 24, fontWeight: 400, maxLines: 3, confirmed: true, preLine: true }],
    description: [{ surface: "page", where: "제품 페이지", width: 353, fontSize: 13.2, lineHeight: 24, fontWeight: 400, maxLines: null, confirmed: false, preLine: true }],
  },
  android: {
    title: [
      { surface: "page", where: "상세 페이지", width: 238, fontSize: 22.1, lineHeight: 30, fontWeight: 500, maxLines: null, confirmed: false, preLine: false },
      { surface: "search", where: "검색 결과", width: 219, fontSize: 13, lineHeight: 23.5, fontWeight: 400, maxLines: null, confirmed: false, preLine: false },
    ],
    shortDescription: [{ surface: "page", where: "앱 정보", width: 335.6, fontSize: 22.15, lineHeight: 32, fontWeight: 400, maxLines: null, confirmed: false, preLine: false }],
  },
};

export const slotOf = (p: Platform, f: FieldId, s: Surface) => SLOTS[p][f]?.find((x) => x.surface === s);

/** 몇 줄이고 다 보이는지. 화면에서 잰 줄 수를 말로 바꾼다 */
export function fitLabel(slot: Slot, lines: number): { text: string; cut: boolean } {
  const cut = slot.maxLines !== null && lines > slot.maxLines;
  return { text: cut ? `${slot.where} ${lines}줄, ${slot.maxLines}줄까지 보여요` : `${slot.where} ${lines}줄`, cut };
}

/** "규격과 안내"의 글자가 넘칠 때. seen 이 false 면 캡처에 넘치는 예가 없어 아직 모르는 것이다 */
export const OVERFLOW_ROWS: Record<Platform, { field: string; where: string; rule: string; seen: boolean }[]> = {
  ios: [
    { field: "새로운 기능", where: "제품 페이지", rule: "3줄까지 보이고 끝에 '더 보기'가 붙어요. 빈 줄도 한 줄로 세요", seen: true },
    { field: "이름", where: "제품 페이지", rule: "개발자 이름 위에 보여요", seen: false },
    { field: "이름", where: "검색 결과", rule: "부제 위에 보여요", seen: false },
    { field: "부제", where: "검색 결과", rule: "제품 페이지에는 안 보이고 검색 결과에만 보여요", seen: false },
    { field: "설명", where: "제품 페이지", rule: "접히기 전 줄 수는 캡처에 없어요", seen: false },
  ],
  android: [
    { field: "간단한 설명", where: "앱 정보", rule: "큰 글자로 보여요. 37자 정도면 2줄이에요", seen: true },
    { field: "자세한 설명", where: "앱 정보", rule: "첫 화면에는 안 보이고 화살표를 누르면 보여요", seen: true },
    { field: "앱 이름", where: "상세 페이지", rule: "개발자 이름 위에 보여요", seen: false },
    { field: "앱 이름", where: "검색 결과", rule: "개발자 이름 위에 보여요", seen: false },
  ],
};
