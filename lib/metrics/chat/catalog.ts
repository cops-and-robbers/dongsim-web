/**
 * 챗봇이 물을 수 있는 지표 목록 (#163). 모델은 이 이름(key)으로만 지표를 고른다.
 *
 * 값은 전부 기존 집계(dashboard/data.ts loadDashboard, games.ts)에서 꺼낸다. 챗봇을 위해 숫자를 새로 계산하지 않는다.
 * 그래야 화면에 보이는 숫자와 챗봇이 말하는 숫자가 같다.
 * 정의와 주의점은 docs/metrics-collection.md 를 줄인 것이다. 모델에게 그대로 보여 준다(instructions.ts).
 */

import type { Dashboard, DailyPoint } from "../dashboard/data.ts";
import type { Source } from "../dashboard/sources.ts";
import type { ServerNumbers } from "./server.ts";

export type MetricKey =
  | "appstore_new"
  | "play_installs"
  | "first_open_android"
  | "first_open_ios"
  | "web_sessions"
  | "web_from_instagram"
  | "download_clicks"
  | "download_clicks_from_instagram"
  | "ig_posts"
  | "ig_views"
  | "ig_profile_views"
  | "ig_link_clicks"
  | "play_store_visitors"
  | "play_store_acquisitions"
  | "appstore_impressions"
  | "appstore_page_views"
  | "dau_avg"
  | "ad_impressions"
  | "ad_earnings_usd"
  | "games"
  | "game_players"
  | "signups";

export type MetricDef = {
  key: MetricKey;
  label: string;
  unit: string;
  /** 숫자가 어디서 오나. freshness 와 시간대 주석에 쓴다. server 는 게임 서버(어드민 토큰) */
  source: Source | "server";
  /** 기간 합계. 없으면 null (그 기간 숫자가 없음) */
  total: (d: Dashboard, s: ServerNumbers | null, which: "current" | "previous") => number | null;
  /** 날짜별 값을 꺼낼 열. 없으면 날짜별로는 못 본다 */
  daily?: keyof Omit<DailyPoint, "day"> | "games" | "game_players" | "signups";
  /** 더해도 되는 숫자인가. 평균, 누적값은 false */
  additive: boolean;
  note: string;
};

const T = (d: Dashboard, which: "current" | "previous") => (which === "current" ? d.totals.current : d.totals.previous);

export const METRICS: MetricDef[] = [
  { key: "appstore_new", label: "App Store 최초 다운로드", unit: "건", source: "appstore", additive: true, daily: "appStoreNew",
    total: (d, _s, w) => T(d, w).installs.appStoreNew,
    note: "App Store 판매 리포트의 처음 받기. 재다운로드, 업데이트는 뺀다. 날짜는 한국 날짜와 맞는다(#154 실측)" },
  { key: "play_installs", label: "Google Play 최초 설치", unit: "명", source: "play", additive: true, daily: "playInstalls",
    total: (d, _s, w) => (d.play.window ? d.play[w].installs : null),
    note: "그날 처음 설치한 사람. 3~7일 늦게 들어와 들어온 날까지만 세고, 비교 기간도 같은 날 수로 자른다" },
  { key: "first_open_android", label: "Android 앱 첫 실행", unit: "회", source: "ga4app", additive: true, daily: "firstOpenAndroid",
    total: (d, _s, w) => T(d, w).installs.firstOpenAndroid,
    note: "GA4 first_open. 구글 플레이 자동 테스트 기기는 뺐다(#157). 지웠다 다시 깔면 또 세서 사람 수가 아니다" },
  { key: "first_open_ios", label: "iOS 앱 첫 실행", unit: "회", source: "ga4app", additive: true, daily: "firstOpenIos",
    total: (d, _s, w) => T(d, w).installs.firstOpenIos,
    note: "GA4 first_open. 사람 수가 아니라 횟수" },
  { key: "web_sessions", label: "사이트 방문", unit: "회", source: "ga4web", additive: true, daily: "webSessions",
    total: (d, _s, w) => T(d, w).web.sessions, note: "GA4 세션. 우리 팀 방문은 뺐다" },
  { key: "web_from_instagram", label: "인스타에서 온 사이트 방문", unit: "회", source: "ga4web", additive: true, daily: "webFromInstagram",
    total: (d, _s, w) => T(d, w).web.fromInstagram, note: "세션 소스 ig, instagram, linktr.ee" },
  { key: "download_clicks", label: "스토어로 넘긴 횟수", unit: "회", source: "ga4web", additive: true, daily: "downloadClicks",
    total: (d, _s, w) => T(d, w).web.downloadClicks, note: "사이트 다운로드 버튼과 /download 링크(QR, 링크트리) 자동 이동을 더한 값. 버튼 클릭만이 아니다" },
  { key: "download_clicks_from_instagram", label: "인스타에서 와서 스토어로 넘긴 횟수", unit: "회", source: "ga4web", additive: true, daily: "downloadClicksFromInstagram",
    total: (d, _s, w) => T(d, w).web.downloadClicksFromInstagram, note: "위와 같은 기준, 인스타에서 온 방문만" },
  { key: "ig_posts", label: "인스타 게시물", unit: "개", source: "instagram", additive: true,
    total: (d, _s, w) => T(d, w).instagram.posts, note: "기간 안에 올린 게시물 수" },
  { key: "ig_views", label: "인스타 조회", unit: "회", source: "instagram", additive: true, daily: "igViews",
    total: (d, _s, w) => T(d, w).instagram.views, note: "계정 전체 조회. 미국 서부 날짜로 와서 하루 뒤 한국 날짜로 옮겼다" },
  { key: "ig_profile_views", label: "인스타 프로필 방문", unit: "회", source: "instagram", additive: true, daily: "igProfileViews",
    total: (d, _s, w) => T(d, w).instagram.profileViews, note: "" },
  { key: "ig_link_clicks", label: "인스타 프로필 링크 클릭", unit: "회", source: "instagram", additive: true, daily: "igLinkClicks",
    total: (d, _s, w) => T(d, w).instagram.linkClicks, note: "" },
  { key: "play_store_visitors", label: "Google Play 스토어 방문자", unit: "명", source: "playStore", additive: true, daily: "playStoreVisitors",
    total: (d, _s, w) => (d.play.storeWindow ? d.play[w].storeVisitors : null),
    note: "앱이 없는 사람 중 스토어 화면을 본 사람. 1~2주에 한 번, 열흘쯤 늦게 갱신된다" },
  { key: "play_store_acquisitions", label: "Google Play 스토어 획득", unit: "명", source: "playStore", additive: true,
    total: (d, _s, w) => (d.play.storeWindow ? d.play[w].storeAcquisitions : null), note: "스토어 방문자 중 설치한 사람" },
  { key: "appstore_impressions", label: "App Store 노출(고유 기기)", unit: "대", source: "appstorePage", additive: true,
    total: (d, _s, w) => T(d, w).appStorePage.impressionsUnique, note: "App Store 분석 리포트. 하루마다 센 고유 기기를 더했다. 날짜는 UTC" },
  { key: "appstore_page_views", label: "App Store 제품 페이지 조회(고유 기기)", unit: "대", source: "appstorePage", additive: true,
    total: (d, _s, w) => T(d, w).appStorePage.pageViewsUnique, note: "같은 리포트. 날짜는 UTC" },
  { key: "dau_avg", label: "하루 활성 사용자 평균", unit: "명", source: "ga4app", additive: false,
    total: (d, _s, w) => T(d, w).app.dauAvg, note: "Android+iOS. 숫자가 있는 날만으로 나눈 평균이라 더하면 안 된다" },
  { key: "ad_impressions", label: "광고 노출", unit: "회", source: "admob", additive: true, daily: "adImpressions",
    total: (d, _s, w) => T(d, w).ads.impressions, note: "AdMob" },
  { key: "ad_earnings_usd", label: "광고 수익", unit: "달러", source: "admob", additive: true,
    total: (d, _s, w) => Math.round(T(d, w).ads.earningsMicros / 10_000) / 100, note: "AdMob 추정 수익" },
  { key: "games", label: "진행된 게임", unit: "판", source: "server", additive: true, daily: "games",
    total: (_d, s, w) => (s ? s[w].games : null),
    note: "게임 서버의 끝난 판. 관리자만 참가한 시험 판은 뺐다(참가자 기록이 있는 2026-08-17 이후만 가릴 수 있다)" },
  { key: "game_players", label: "게임 참가 인원 합", unit: "명", source: "server", additive: true, daily: "game_players",
    total: (_d, s, w) => (s ? s[w].players : null), note: "판마다 경찰+도둑 인원을 더한 값. 같은 사람이 여러 판 하면 여러 번 센다" },
  { key: "signups", label: "가입", unit: "명", source: "server", additive: true, daily: "signups",
    total: (_d, s, w) => (s ? s[w].signups : null), note: "게임 서버 계정이 만들어진 날 기준. 관리자 계정은 뺐다" },
];

export const METRIC_KEYS = METRICS.map((m) => m.key) as [MetricKey, ...MetricKey[]];
export const metricDef = (k: MetricKey) => METRICS.find((m) => m.key === k)!;

/** 작은 숫자의 % 변화는 크게 보인다. 둘 중 하나라도 이보다 작으면 표본이 적다고 표시한다 */
export const LOW_SAMPLE = 20;
