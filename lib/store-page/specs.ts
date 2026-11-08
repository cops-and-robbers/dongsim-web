/**
 * 디자이너가 만들 이미지와 영상의 규격 (docs/admin-ui.md "스토어 페이지").
 * 애플, 구글 공식 문서를 2026-11-08 에 열어 확인한 값이다. 문서에서 찾지 못한 값은 적지 않는다.
 */
import { LINKS, type Platform } from "./fields.ts";

export type Spec = {
  item: string;
  /** 눌러서 복사할 수 있는 크기들 */
  sizes: string[];
  /** 크기를 숫자로 줄 수 없을 때의 설명 */
  sizeNote?: string;
  format: string;
  count: string;
  need: "required" | "optional" | "soon";
  needLabel: string;
  link: string;
};

export const IMAGE_SPECS: Record<Platform, Spec[]> = {
  ios: [
    { item: "iPhone 스크린샷", sizes: ["1206 x 2622", "1179 x 2556"], sizeNote: "가로로 돌린 크기도 돼요", format: "JPEG, PNG. 투명 배경 불가", count: "1 ~ 10장", need: "required", needLabel: "필수", link: LINKS.appleShots },
    { item: "iPad 13인치 스크린샷", sizes: ["2064 x 2752", "2048 x 2732"], sizeNote: "가로로 돌린 크기도 돼요", format: "JPEG, PNG. 투명 배경 불가", count: "1 ~ 10장", need: "optional", needLabel: "iPad 지원 시 필수", link: LINKS.appleShots },
    { item: "iPhone Duo 스크린샷", sizes: ["1398 x 2034", "2007 x 2853"], sizeNote: "바깥 화면, 안쪽 화면 크기예요", format: "JPEG, PNG. 투명 배경 불가", count: "최대 10장", need: "soon", needLabel: "2027년 4월부터 필수", link: LINKS.appleShots },
    { item: "앱 미리보기 영상 (iPhone)", sizes: ["886 x 1920", "1920 x 886"], format: "H.264 또는 ProRes 422 HQ, 30fps, 500MB 이하, 15 ~ 30초", count: "언어별 최대 3개", need: "optional", needLabel: "선택", link: LINKS.applePreview },
    { item: "앱 미리보기 영상 (iPad 13인치)", sizes: ["1200 x 1600", "1600 x 1200"], format: "H.264 또는 ProRes 422 HQ, 30fps, 500MB 이하, 15 ~ 30초", count: "언어별 최대 3개", need: "optional", needLabel: "선택", link: LINKS.applePreview },
    { item: "앱 아이콘", sizes: ["1024 x 1024"], sizeNote: "모서리는 시스템이 둥글게 깎아요", format: "PNG", count: "1개, 앱 빌드에 들어가요", need: "required", needLabel: "필수", link: LINKS.appleIcon },
  ],
  android: [
    { item: "앱 아이콘", sizes: ["512 x 512"], sizeNote: "꽉 찬 정사각형으로 만드세요", format: "32비트 PNG, 1024KB 이하", count: "1개", need: "required", needLabel: "필수", link: LINKS.playIcon },
    { item: "피처 그래픽", sizes: ["1024 x 500"], format: "JPEG 또는 24비트 PNG. 투명 배경 불가", count: "1개", need: "required", needLabel: "필수", link: LINKS.playAssets },
    { item: "폰 스크린샷", sizes: [], sizeNote: "한 변 320 ~ 3840px, 긴 변은 짧은 변의 2배 이하", format: "JPEG 또는 24비트 PNG. 투명 배경 불가", count: "최대 8장", need: "required", needLabel: "기기 합쳐 2장 이상", link: LINKS.playAssets },
    { item: "게임 추천에 나오는 스크린샷", sizes: ["1920 x 1080", "1080 x 1920"], sizeNote: "이 크기 이상, 16:9 또는 9:16, 실제 게임 화면", format: "JPEG 또는 24비트 PNG. 투명 배경 불가", count: "3장 이상", need: "optional", needLabel: "추천 노출 요건", link: LINKS.playAssets },
    { item: "태블릿 스크린샷", sizes: [], sizeNote: "한 변 1080 ~ 7680px, 16:9 또는 9:16", format: "JPEG 또는 24비트 PNG. 투명 배경 불가", count: "최대 8장", need: "optional", needLabel: "태블릿 노출용", link: LINKS.playAssets },
    { item: "동영상", sizes: [], sizeNote: "YouTube 주소로 넣어요", format: "공개 또는 일부 공개, 광고 끔, 연령 제한 없음", count: "1개", need: "optional", needLabel: "선택", link: LINKS.playAssets },
  ],
};

/** 마케터가 쓰기 전에 보는 짧은 원칙 */
export const WRITE_TIPS: { text: string; link: string }[] = [
  { text: "첫 문장에 핵심을 쓰세요. 첫 문장만 읽힐 수 있어요.", link: LINKS.appleProduct },
  { text: "수식어 대신 실제 기능과 쓰임을 쓰세요.", link: LINKS.playBest },
  { text: "설명은 짧은 소개 다음에 주요 기능 목록으로 쓰세요.", link: LINKS.appleProduct },
  { text: "키워드를 늘어놓지 말고 사용자가 쓰는 말로 쓰세요.", link: LINKS.playBest },
  { text: "App Store 행사 소식은 새 버전 없이 바꿀 수 있는 프로모션 문구에 쓰세요.", link: LINKS.appleProduct },
  { text: "App Store 검색에는 이름, 부제, 키워드가 쓰이고 설명은 쓰이지 않아요.", link: LINKS.appleSearch },
];

/** 이미지 안에 글자를 넣을 때 */
export const IMAGE_RULES: Record<Platform, { text: string; link: string }[]> = {
  ios: [
    { text: "스크린샷은 앱을 쓰는 화면이어야 해요. 글자를 얹는 건 괜찮아요.", link: LINKS.appleReview },
    { text: "미리보기 영상은 앱 화면을 녹화한 것만 쓸 수 있어요.", link: LINKS.appleReview },
    { text: "이미지에 가격을 넣지 마세요.", link: LINKS.appleReview },
  ],
  android: [
    { text: "실제 앱 화면을 쓰고, 문구는 이미지의 20% 안으로 줄이세요.", link: LINKS.playAssets },
    { text: "순위, 가격, '지금 다운로드' 같은 말은 넣지 마세요.", link: LINKS.playAssets },
    { text: "이미지 안의 글자는 언어마다 따로 만드세요.", link: LINKS.playAssets },
    { text: "동영상은 처음 10초 안에 실제 화면이 나와야 해요.", link: LINKS.playAssets },
  ],
};
