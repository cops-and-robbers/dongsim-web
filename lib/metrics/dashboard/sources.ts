/**
 * 지표 화면의 날짜별 칸이 어느 소스에서 왔나 (#145).
 *
 * 화면(브라우저)과 서버(data.ts)가 같이 쓴다. data.ts 는 Supabase 클라이언트를 불러
 * 브라우저 번들에 넣을 수 없어서 이것만 따로 뺐다. 여기엔 값만 두고 아무것도 부르지 않는다.
 */

import type { DailyPoint } from "./data.ts";

/**
 * GA4 는 사이트(ga4web)와 앱(ga4app) 속성의 시작일이 달라 따로 본다(사이트 2026-04-01, 앱 2026-06-01).
 * 하나로 보면 6월 전 앱 숫자가 "0"으로 읽혀 이전 기간 비교가 크게 부풀려진다.
 * play 는 Google Play 설치 통계, playStore 는 Play 스토어 등록정보, appstorePage 는 App Store 분석 리포트(노출, 조회)
 */
export type Source = "instagram" | "ga4web" | "ga4app" | "appstore" | "admob" | "play" | "playStore" | "appstorePage";

/** 숫자가 없는 날(수집 전, 아직 안 들어옴)을 가를 때 쓴다 */
export const SOURCE_OF: Record<Exclude<keyof DailyPoint, "day">, Source> = {
  igViews: "instagram",
  igProfileViews: "instagram",
  igLinkClicks: "instagram",
  webSessions: "ga4web",
  webFromInstagram: "ga4web",
  downloadClicks: "ga4web",
  downloadClicksFromInstagram: "ga4web",
  appStoreNew: "appstore",
  firstOpenAndroid: "ga4app",
  firstOpenIos: "ga4app",
  playerStarts: "ga4app",
  dau: "ga4app",
  adImpressions: "admob",
  adEarningsMicros: "admob",
  // Play 설치 통계와 스토어 등록정보는 파일이 따로라 마지막 날이 다를 수 있다(#147)
  playInstalls: "play",
  playUninstalls: "play",
  playActiveDevices: "play",
  playStoreVisitors: "playStore",
  // App Store 분석 리포트(노출, 제품 페이지 조회). 2026-10-03 부터 있다
  appStoreImpressions: "appstorePage",
  appStorePageViews: "appstorePage",
  // 다운로드 경로도 같은 분석 리포트라 같은 날까지 있다(#160)
  appStoreFromSearch: "appstorePage",
  appStoreFromLink: "appstorePage",
};
