/**
 * 챗봇이 물을 수 있는 지표 목록 (#163). 모델은 이 이름(key)으로만 지표를 고른다.
 *
 * 값은 전부 기존 집계(dashboard/data.ts loadDashboard, games.ts)에서 꺼낸다. 챗봇을 위해 숫자를 새로 계산하지 않는다.
 * 그래야 화면에 보이는 숫자와 챗봇이 말하는 숫자가 같다.
 * 정의와 주의점은 docs/metrics-collection.md 를 줄인 것이다. 모델에게 그대로 보여 준다(instructions.ts).
 *
 * 2026-10-10 에 열둘을 더했다. 이미 모아 지표 화면에 보이는데 챗봇만 못 보던 숫자(전환율, 활성화율, 재방문, 삭제,
 * QR 링크 이동, App Store 받은 길)와, 게임 서버 기록으로 새로 센 "새 가입자가 실제로 게임을 했나"(new_players, signup_activation)다.
 * 비율 지표(ratio)는 분자와 분모를 같이 돌려주고, 두 기간 차이는 %p 로 낸다(증감률은 내지 않는다).
 */

import type { Dashboard, DailyPoint } from "../dashboard/data.ts";
import type { Source } from "../dashboard/sources.ts";
import type { Ratio, ServerNumbers } from "./server.ts";

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
  | "signups"
  | "download_link_clicks"
  | "site_conversion"
  | "appstore_from_search"
  | "appstore_from_link"
  | "game_starts_app"
  | "activation_rate"
  | "d1_return"
  | "d7_return"
  | "android_removes"
  | "android_remove_rate"
  | "play_uninstalls"
  | "new_players"
  | "signup_activation";

export type MetricDef = {
  key: MetricKey;
  label: string;
  unit: string;
  /** 숫자가 어디서 오나. freshness 와 시간대 주석에 쓴다. server 는 게임 서버(어드민 토큰) */
  source: Source | "server";
  /** 기간 합계. 없으면 null (그 기간 숫자가 없음) */
  total: (d: Dashboard, s: ServerNumbers | null, which: "current" | "previous") => number | null;
  /** 날짜별 값을 꺼낼 열. 없으면 날짜별로는 못 본다 */
  daily?: keyof Omit<DailyPoint, "day"> | "games" | "game_players" | "signups" | "new_players";
  /** 비율 지표면 분자와 분모. total 은 이것을 % 로 바꾼 값이다 */
  ratio?: (d: Dashboard, s: ServerNumbers | null, which: "current" | "previous") => Ratio | null;
  /** 더해도 되는 숫자인가. 평균, 누적값은 false */
  additive: boolean;
  note: string;
};

const T = (d: Dashboard, which: "current" | "previous") => (which === "current" ? d.totals.current : d.totals.previous);

/** 비율을 소수 첫째 자리 % 로. 분모가 0 이면 없음 */
export const pctOf = (r: Ratio | null) => (!r || r.den <= 0 ? null : Math.round((r.num / r.den) * 1000) / 10);

/** 비율 지표 정의. total 은 ratio 를 % 로 바꾼 값 */
const ratioMetric = (def: Omit<MetricDef, "total" | "additive" | "unit"> & { ratio: NonNullable<MetricDef["ratio"]> }): MetricDef => ({
  ...def,
  unit: "%",
  additive: false,
  total: (d, s, w) => pctOf(def.ratio(d, s, w)),
});

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
  { key: "new_players", label: "첫 게임을 한 새 가입자", unit: "명", source: "server", additive: true, daily: "new_players",
    total: (_d, s, w) => (s ? s[w].newPlayers : null),
    note: "그날 처음 판에 참가한 새 가입자. 참가자 기록이 생긴 2026-08-17 이후 가입한 사람만 센다(그 전 가입자는 첫 판을 알 수 없다)" },
  ratioMetric({ key: "signup_activation", label: "가입 후 7일 안 첫 게임 비율", source: "server",
    ratio: (_d, s, w) => (s ? s.activation[w] : null),
    note: "기간 안에 가입한 사람 중 7일 안에 한 판이라도 한 비율. 2026-08-17 이후 가입자, 7일이 다 지난 가입자만. 마케팅이 실제 게임으로 이어졌는지 보는 숫자" }),

  { key: "download_link_clicks", label: "QR, 링크트리 링크로 스토어에 넘긴 횟수", unit: "회", source: "ga4web", additive: true,
    total: (d, _s, w) => T(d, w).web.downloadLinkClicks,
    note: "/download 링크(행사 QR, 링크트리)로 들어와 바로 스토어로 넘어간 횟수. download_clicks 안에 든 몫" },
  ratioMetric({ key: "site_conversion", label: "사이트 전환율", source: "ga4web",
    ratio: (d, _s, w) => {
      const x = T(d, w).web;
      return { num: Math.max(0, x.storeSessions - x.linkSessions), den: Math.max(0, x.sessions - x.linkSessions) };
    },
    note: "사이트 방문 중 다운로드 버튼으로 스토어에 간 방문. QR, 링크트리로 들어와 바로 넘어간 방문은 분자와 분모에서 뺐다" }),
  { key: "appstore_from_search", label: "App Store 최초 다운로드(스토어 검색)", unit: "건", source: "appstorePage", additive: true, daily: "appStoreFromSearch",
    total: (d, _s, w) => d.appStoreWays[w].search,
    note: "App Store 분석 리포트의 받은 길. 날짜는 UTC 라 판매 리포트(appstore_new)와 합이 조금 다를 수 있다" },
  { key: "appstore_from_link", label: "App Store 최초 다운로드(링크)", unit: "건", source: "appstorePage", additive: true, daily: "appStoreFromLink",
    total: (d, _s, w) => d.appStoreWays[w].web + d.appStoreWays[w].app,
    note: "웹 링크(행사 QR, 사이트 버튼)와 다른 앱 속 링크(카카오톡, 문자). 행사가 있는 주에 늘고 없는 주엔 검색이 늘었다" },
  { key: "game_starts_app", label: "게임 참가(앱 기록)", unit: "회", source: "ga4app", additive: true, daily: "playerStarts",
    total: (d, _s, w) => T(d, w).game.playerStarts,
    note: "앱이 참가자 폰마다 한 번 찍는 게임 시작. 판 수가 아니라 사람 기준 횟수. 게임 서버 숫자(games)를 못 읽을 때 대신 쓴다" },
  ratioMetric({ key: "activation_rate", label: "활성화율(첫 실행 후 7일 안 게임)", source: "ga4app",
    ratio: (d, _s, w) => T(d, w).cohort.activation,
    note: "이 기간에 처음 앱을 연 사람 중 7일 안에 게임을 한 비율(GA4). 7일이 안 지난 날과 테스트 기기는 뺐다" }),
  ratioMetric({ key: "d1_return", label: "다음 날 다시 온 비율", source: "ga4app",
    ratio: (d, _s, w) => T(d, w).cohort.d1, note: "이 기간에 처음 온 사람 중 다음 날 다시 앱을 연 비율(GA4)" }),
  ratioMetric({ key: "d7_return", label: "7일 뒤 다시 온 비율", source: "ga4app",
    ratio: (d, _s, w) => T(d, w).cohort.d7, note: "이 기간에 처음 온 사람 중 7일째에 다시 앱을 연 비율(GA4)" }),
  { key: "android_removes", label: "Android 앱 삭제", unit: "회", source: "ga4app", additive: true,
    total: (d, _s, w) => T(d, w).app.androidRemoves, note: "GA4 app_remove. Android 만 찍힌다" },
  ratioMetric({ key: "android_remove_rate", label: "Android 삭제 비율", source: "ga4app",
    ratio: (d, _s, w) => ({ num: T(d, w).app.androidRemoves, den: T(d, w).installs.firstOpenAndroid }),
    note: "Android 첫 실행 대비 삭제. 지운 사람이 그 기간에 깐 사람과 같다는 보장이 없어 참고용" }),
  { key: "play_uninstalls", label: "Google Play 삭제", unit: "명", source: "play", additive: true, daily: "playUninstalls",
    total: (d, _s, w) => (d.play.window ? d.play[w].uninstalls : null), note: "Play Console 의 그날 지운 사람. 설치처럼 3~7일 늦게 들어온다" },
];

export const METRIC_KEYS = METRICS.map((m) => m.key) as [MetricKey, ...MetricKey[]];
export const metricDef = (k: MetricKey) => METRICS.find((m) => m.key === k)!;

/** 작은 숫자의 % 변화는 크게 보인다. 둘 중 하나라도 이보다 작으면 표본이 적다고 표시한다 */
export const LOW_SAMPLE = 20;
/** 비율은 분모가 이보다 작으면 표본이 적다고 표시한다(지표 화면 MIN_SAMPLE 과 같다) */
export const LOW_RATIO_DEN = 30;
