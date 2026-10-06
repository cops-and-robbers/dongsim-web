/**
 * 지표 수집에서 쓰는 식별자 (#142, #143). 비밀이 아닌 값만 둔다.
 * 키와 토큰은 환경변수에 있다 (docs/metrics-collection.md).
 */

/** App Store 앱 Apple ID, 판매 리포트 Vendor 번호 */
export const APPSTORE_APP_ID = "6756843948";
export const APPSTORE_VENDOR_NUMBER = "94205600";

/** GA4 속성. 웹은 "경찰과 도둑", 앱은 Firebase 연결 속성 */
export const GA4_PROPERTIES = { web: "535113807", app: "520880900" } as const;

/** AdMob 퍼블리셔 (app-ads.txt 에 공개되는 값) */
export const ADMOB_PUBLISHER_ID = "pub-7675755123462739";

/**
 * 처음 채울 때 어디서부터 받을지. 그 전에는 데이터가 없다 (2026-10-06 조회).
 * App Store 첫 판매 2026년 4월, GA4 웹 4월, 앱 6월.
 */
export const BACKFILL_FROM = {
  appstoreSales: "2026-04-01",
  ga4: { web: "2026-04-01", app: "2026-06-01" },
  admob: "2026-04-01",
} as const;

/** 매일 다시 받는 기간. 소스마다 며칠 동안 숫자가 바뀐다 */
export const REFETCH_DAYS = 7;
