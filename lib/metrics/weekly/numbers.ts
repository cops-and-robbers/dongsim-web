/**
 * 주간 리포트의 숫자 (#146). 저장된 하루 지표를 한 주(월~일)로 더한다.
 * 입력만 보고 답하는 순수 함수라 테스트(weekly.test.mjs)가 숫자를 넣어 확인한다.
 *
 * 더해도 되는 숫자만 쓴다. 하루 도달(reach), 하루 사용자(activeUsers, totalUsers)는
 * 같은 사람을 여러 날 세서 일주일로 더하면 부풀려진다. 그래서 인스타는 조회,
 * 프로필 방문, 링크 클릭을, 앱은 이벤트 횟수를 더한다.
 *
 * 날짜 기준이 소스마다 다르다. 인스타 계정 지표만 미국 서부(PT) 날짜로 오고, GA4, AdMob,
 * App Store 판매는 한국 날짜와 맞는다. PT 하루(D)는 한국 D일 오후 4~5시부터 D+1일 같은 시각까지라
 * 대부분 한국 D+1일과 겹친다. 그래서 인스타 날짜는 하루 뒤로 옮겨 한국 주에 맞춘다(shiftPt).
 * 옮기지 않으면 월요일 아침에는 PT 일요일 숫자가 아직 없어서 한 주가 6일로 잘린다.
 *
 * App Store 판매도 처음엔 PT 로 보고 옮겼는데, 실제로는 한국 날짜와 맞았다(#154). 리포트 날짜 그대로가
 * GA4 iOS 첫 실행과 상관 0.92, 하루 뒤로 옮기면 0.14 였고, 9/19 행사 날 다운로드가 9/20 에 찍혔다.
 *
 * Google Play 는 PT 날짜다(#147). 하루 뒤로 옮기면 GA4 Android 첫 실행과 상관 0.90, 그대로 두면 0.34 였고,
 * 7/4 서울게임타운 설치 52건 중 43건이 Play 7/3 에 찍혔다(한국 낮은 PT 전날 밤이다). 그래서 인스타처럼 옮긴다.
 * App Store 분석 리포트(노출, 제품 페이지 조회)는 UTC 날짜라 한국 날짜와 9시간 어긋나지만 옮기지 않는다.
 * 하루 경계가 한국 오전 9시라 대부분 같은 날이다.
 */

import { addDays, ymdRange } from "../dates.ts";
import { splitKey } from "../ga4/run.ts";
import { fromInstagram, isInternal } from "../channels.ts";
import { MARK, splitFunnelKey } from "../funnel.ts";

export type Week = { start: string; end: string }; // YYYY-MM-DD, 월요일과 일요일

export type WeeklyInput = {
  instagramDays: { day: string; views: number | null; profileViews: number | null; websiteClicks: number | null }[];
  instagramPosts: { postedAt: string }[];
  ga4: { property: string; day: string; breakdown: string; key: string; metric: string; value: number }[];
  appstoreSales: { day: string; productType: string; units: number }[];
  admob: { day: string; earningsMicros: number; matchedRequests: number; impressions: number }[];
  /** Google Play 리포트(play_daily). day 는 PT 날짜 그대로 - 여기서 shiftPt 로 옮긴다. 없으면 0 으로 센다 */
  play?: { day: string; report: string; dim: string; key: string; metric: string; value: number }[];
  /** App Store 분석 리포트의 노출, 제품 페이지 조회(engagement). day 는 UTC 날짜 */
  appstoreEngagement?: { day: string; event: string; counts: number; uniqueCounts: number }[];
};

/** 비율의 분자와 분모. 화면이 표본이 적은지 보고 비율을 띄울지 정한다 */
export type Ratio = { num: number; den: number };

export type WeeklyNumbers = {
  instagram: { posts: number; views: number; profileViews: number; linkClicks: number };
  /**
   * 우리 팀 방문(channels.ts isInternal)은 모두 뺀 값. internalSessions 는 뺀 양.
   * downloadClicks 는 스토어로 넘긴 횟수(app_download_click)다. 사이트 버튼 클릭과 /download 링크(QR, 링크트리)의
   * 자동 이동을 더한 값이라 "버튼 클릭"이 아니다. downloadLinkClicks 가 그중 /download 몫이다.
   * storeSessions 는 스토어로 넘긴 기록이 있는 방문 수(한 방문에서 여러 번 눌러도 한 번).
   * linkSessions 는 그중 /download 에서 넘어간 방문 수. /download 로 들어온 방문은 들어오는 순간 넘어가서
   * 사이트 전환율은 (storeSessions - linkSessions) / (sessions - linkSessions) 로 낸다
   */
  web: {
    sessions: number;
    fromInstagram: number;
    downloadClicks: number;
    downloadLinkClicks: number;
    downloadClicksFromInstagram: number;
    storeSessions: number;
    storeSessionsFromInstagram: number;
    linkSessions: number;
    linkSessionsFromInstagram: number;
    internalSessions: number;
  };
  /**
   * 앱 첫 실행은 구글 플레이 자동 테스트 기기를 뺀 횟수다(testDevices.ts, #157). firstOpenTest 는 테스트 기기로 보여 뺀 횟수
   */
  installs: { appStoreNew: number; firstOpenAndroid: number; firstOpenIos: number; firstOpenTest: number };
  /**
   * 앱 이벤트는 참가자 폰마다 한 번씩 찍힌다(5명이 한 판 하면 5). 그래서 판 수가 아니라 사람 기준 횟수다.
   * 실제 판 수는 백엔드 게임 기록에만 있다(dashboard/games.ts)
   */
  game: { playerStarts: number; playerFinishes: number };
  app: {
    /** 하루 활성 사용자 평균(Android+iOS). 숫자가 있는 날만으로 나눈다 */
    dauAvg: number | null;
    /** 날마다 활성 사용자를 더한 값(사용자 x 일). ARPDAU 의 분모 */
    dauSum: number;
    /** app_remove 는 Android 만 찍힌다. 그래서 비율도 Android 첫 실행으로 나눈다 */
    androidRemoves: number;
    /** 알림 닫기(notification_dismiss)는 Android 만 찍혀서 열람률도 Android 만으로 낸다 */
    androidPushOpens: number;
    androidPushDismisses: number;
  };
  /**
   * 처음 들어온 날이 이 기간인 사람들(코호트, 테스트 기기 뺌). 분모는 그 칸이 익은 코호트만.
   * activation 은 신규 사용자 퍼널(모든 나라)의 첫 실행 대비 게임 플레이(7일 안, funnel.ts)다
   */
  cohort: { d1: Ratio; d7: Ratio; activation: Ratio };
  ads: { impressions: number; matchedRequests: number; earningsMicros: number };
  /**
   * Google Play (#147). 3~7일 늦게 들어와서 화면과 주간 리포트는 들어온 날까지만 잘라 같은 날 수로 비교한다(playWindow).
   * - installs: 그날 처음 설치한 사람(Daily User Installs). 다시 설치, 구글 출시 전 테스트 기기는 들어가지 않는다
   * - uninstalls: 그날 지운 사람(Daily User Uninstalls)
   * - activeDevicesStart/End: 앱이 깔려 있고 최근 30일 안에 켜진 기기. 기간 첫날 전날과 마지막 날의 값(더하지 않는다)
   * - storeVisitors, storeAcquisitions: 앱이 없는 사람 중 스토어 등록정보를 본 사람, 그중 설치한 사람
   * - crashes, anrs: Android vitals 의 비정상 종료와 응답 없음(진단 정보 공유를 켠 기기만)
   * - ratingTotal: 기간 마지막 날의 누적 평균 평점
   */
  play: {
    installs: number;
    installEvents: number;
    uninstalls: number;
    activeDevicesStart: number | null;
    activeDevicesEnd: number | null;
    storeVisitors: number;
    storeAcquisitions: number;
    crashes: number;
    anrs: number;
    ratingTotal: number | null;
  };
  /** App Store 노출과 제품 페이지 조회(분석 리포트 engagement). 고유 기기는 하루마다 센 값을 더했다 */
  appStorePage: { impressions: number; impressionsUnique: number; pageViews: number; pageViewsUnique: number };
};

/** 그 주(월~일)에 들어가나 */
const inWeek = (day: string, w: Week) => day >= w.start && day <= w.end;

/** 인스타의 PT 날짜를 그 하루와 가장 많이 겹치는 한국 날짜로 (위 설명) */
export const shiftPt = (day: string) => addDays(day, 1);
const sum = <T>(rows: T[], pick: (r: T) => number | null) => rows.reduce((a, r) => a + (pick(r) ?? 0), 0);

/** 날짜가 "처음 들어온 날"인 코호트 줄. 하루 활성 사용자 날 수를 셀 때 빼야 한다 */
const COHORT_BREAKDOWNS = new Set(["retention", "activation", "funnel"]);

/** App Store 신규 다운로드 상품 유형 (재다운로드 3, 업데이트 7 은 뺀다) */
const NEW_DOWNLOAD = new Set(["1", "1F", "1T"]);

// 인스타 판별과 내부 방문 판별은 channels.ts 에 모았다(대시보드와 같이 쓴다)
export { fromInstagram } from "../channels.ts";

/** 게시물 올린 시각을 한국 날짜로 */
function seoulDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso));
}

/** Play 숫자를 한 기간으로. day 는 PT 라 하루 뒤로 옮겨 그 기간에 드는지 본다 */
function playNumbers(rows: NonNullable<WeeklyInput["play"]>, w: Week): WeeklyNumbers["play"] {
  const total = (report: string, dim: string, metric: string) =>
    sum(rows.filter((r) => r.report === report && r.dim === dim && r.metric === metric && inWeek(shiftPt(r.day), w)), (r) => r.value);
  // 누적값(활성 기기, 누적 평점)은 날짜별 하나뿐인 overview 줄에서 그날 값을 읽는다
  const level = (report: string, metric: string, upto: string, from?: string) => {
    const hit = rows
      .filter((r) => r.report === report && r.dim === "overview" && r.metric === metric && shiftPt(r.day) <= upto && (!from || shiftPt(r.day) >= from))
      .sort((a, b) => a.day.localeCompare(b.day))
      .at(-1);
    return hit ? hit.value : null;
  };
  return {
    installs: total("installs", "overview", "user_installs"),
    installEvents: total("installs", "overview", "install_events"),
    uninstalls: total("installs", "overview", "user_uninstalls"),
    activeDevicesStart: level("installs", "active_devices", addDays(w.start, -1)),
    activeDevicesEnd: level("installs", "active_devices", w.end, w.start),
    // 스토어 등록정보는 overview 파일이 없어 나라 축(합이 전체)을 더한다. 유입 경로 축까지 더하면 두 번 센다
    storeVisitors: total("store", "country", "visitors"),
    storeAcquisitions: total("store", "country", "acquisitions"),
    crashes: total("crashes", "overview", "crashes"),
    anrs: total("crashes", "overview", "anrs"),
    ratingTotal: level("ratings", "rating_total", w.end),
  };
}

export function weeklyNumbers(input: WeeklyInput, w: Week): WeeklyNumbers {
  const ig = input.instagramDays.filter((d) => inWeek(shiftPt(d.day), w));
  const ga = input.ga4.filter((r) => inWeek(r.day, w));
  const appEvent = (name: string, platform?: string) =>
    sum(
      ga.filter(
        (r) =>
          r.property === "app" &&
          r.breakdown === "event" &&
          r.metric === "eventCount" &&
          splitKey(r.key)[0] === name &&
          (!platform || splitKey(r.key)[1] === platform),
      ),
      (r) => r.value,
    );
  // 첫 실행은 테스트 기기를 뺀 줄(first_open_country, 플랫폼|나라), 뺀 몫은 first_open_test(플랫폼)
  const firstOpen = (breakdown: "first_open_country" | "first_open_test", platform?: string) =>
    sum(
      ga.filter((r) => r.property === "app" && r.breakdown === breakdown && r.metric === "eventCount" && (!platform || splitKey(r.key)[0] === platform)),
      (r) => r.value,
    );
  const ads = input.admob.filter((r) => inWeek(r.day, w));
  // /download 에서 남은 스토어 이동(출처|매체|페이지). 우리 팀 방문은 뺀다
  const linkRows = (metric: string) =>
    ga.filter(
      (r) =>
        r.property === "web" &&
        r.breakdown === "download_page" &&
        r.metric === metric &&
        splitKey(r.key)[2] === "/download" &&
        !isInternal(splitKey(r.key)[0]),
    );
  const internalSessions = sum(
    ga.filter((r) => r.property === "web" && r.breakdown === "session_campaign" && r.metric === "sessions" && isInternal(splitKey(r.key)[0])),
    (r) => r.value,
  );
  // 하루 활성 사용자: 플랫폼별 activeUsers 를 날마다 더하고(한 사람이 두 플랫폼을 쓰는 일은 드물다) 날 수로 나눈다
  const dauByDay = new Map<string, number>();
  for (const r of ga) if (r.property === "app" && r.breakdown === "platform" && r.metric === "activeUsers") dauByDay.set(r.day, (dauByDay.get(r.day) ?? 0) + r.value);
  const appDays = [...new Set(ga.filter((r) => r.property === "app" && !COHORT_BREAKDOWNS.has(r.breakdown)).map((r) => r.day))].sort();
  // 하루 활성 사용자가 0 인 날은 GA4 가 줄을 주지 않아 평균에서 빠진다. 앱 숫자가 있는 첫날부터 마지막 날까지를
  // 날 수로 보고, 그 사이 빈 날은 0 으로 센다
  const dauDays =
    appDays.length === 0
      ? []
      : ymdRange(appDays[0], appDays[appDays.length - 1]).map((d) => dauByDay.get(d) ?? 0);
  // 코호트: 이 기간에 처음 들어온 날들. 분모는 그 칸(1일 뒤, 7일 뒤, 7일 활성화)이 익어 줄이 있는 코호트만
  const cohortSize = new Map(ga.filter((r) => r.property === "app" && r.breakdown === "retention" && r.key === "0").map((r) => [r.day, r.value]));
  // 분모(코호트 크기)가 없는 날은 분자에서도 뺀다. 안 그러면 비율이 100% 를 넘을 수 있다
  const ratioOver = (rows: typeof ga): Ratio => {
    const sized = rows.filter((r) => cohortSize.has(r.day));
    return { num: sum(sized, (r) => r.value), den: sum(sized, (r) => cohortSize.get(r.day) ?? 0) };
  };
  const retention = (n: string) => ratioOver(ga.filter((r) => r.property === "app" && r.breakdown === "retention" && r.key === n));
  // 퍼널 줄은 7일이 다 지난 날만 있다. 모든 나라(테스트 기기는 수집 때 뺐다)의 첫 실행 대비 게임 플레이
  const funnelSum = (step: string) =>
    sum(
      ga.filter((r) => {
        if (r.property !== "app" || r.breakdown !== "funnel") return false;
        const k = splitFunnelKey(r.key);
        return k.step === step && k.country !== MARK;
      }),
      (r) => r.value,
    );
  const activationRatio: Ratio = { num: funnelSum("play"), den: funnelSum("open") };
  return {
    instagram: {
      posts: input.instagramPosts.filter((p) => inWeek(seoulDay(p.postedAt), w)).length,
      views: sum(ig, (d) => d.views),
      profileViews: sum(ig, (d) => d.profileViews),
      linkClicks: sum(ig, (d) => d.websiteClicks),
    },
    web: {
      sessions:
        sum(ga.filter((r) => r.property === "web" && r.breakdown === "total" && r.metric === "sessions"), (r) => r.value) - internalSessions,
      internalSessions,
      fromInstagram: sum(
        ga.filter(
          (r) =>
            r.property === "web" &&
            r.breakdown === "session_campaign" &&
            r.metric === "sessions" &&
            // 링크트리 UTM(instagram|bio|...), 인스타 앱이 남긴 출처(l.instagram.com 등),
            // UTM 없이 링크트리를 거친 방문(linktr.ee)을 같이 센다. 링크트리는 인스타 프로필에만 걸려 있다
            fromInstagram(splitKey(r.key)[0]),
        ),
        (r) => r.value,
      ),
      downloadClicks:
        sum(
          ga.filter((r) => r.property === "web" && r.breakdown === "event" && r.key === "app_download_click" && r.metric === "eventCount"),
          (r) => r.value,
        ) - sum(ga.filter((r) => r.property === "web" && r.breakdown === "download_source" && r.metric === "eventCount" && isInternal(splitKey(r.key)[0])), (r) => r.value),
      downloadLinkClicks: sum(linkRows("eventCount"), (r) => r.value),
      linkSessions: sum(linkRows("sessions"), (r) => r.value),
      linkSessionsFromInstagram: sum(
        linkRows("sessions").filter((r) => fromInstagram(splitKey(r.key)[0])),
        (r) => r.value,
      ),
      storeSessions: sum(
        ga.filter((r) => r.property === "web" && r.breakdown === "download_source" && r.metric === "sessions" && !isInternal(splitKey(r.key)[0])),
        (r) => r.value,
      ),
      storeSessionsFromInstagram: sum(
        ga.filter((r) => r.property === "web" && r.breakdown === "download_source" && r.metric === "sessions" && fromInstagram(splitKey(r.key)[0])),
        (r) => r.value,
      ),
      // 스토어로 넘긴 기록 중 인스타에서 온 방문에서 나온 것 (ga4 download_source)
      downloadClicksFromInstagram: sum(
        ga.filter((r) => r.property === "web" && r.breakdown === "download_source" && r.metric === "eventCount" && fromInstagram(splitKey(r.key)[0])),
        (r) => r.value,
      ),
    },
    installs: {
      appStoreNew: sum(input.appstoreSales.filter((r) => inWeek(r.day, w) && NEW_DOWNLOAD.has(r.productType)), (r) => r.units),
      firstOpenAndroid: firstOpen("first_open_country", "Android"),
      firstOpenIos: firstOpen("first_open_country", "iOS"),
      firstOpenTest: firstOpen("first_open_test"),
    },
    game: { playerStarts: appEvent("game_start"), playerFinishes: appEvent("game_over") },
    app: {
      dauAvg: dauDays.length ? dauDays.reduce((a, d) => a + d, 0) / dauDays.length : null,
      dauSum: dauDays.reduce((a, d) => a + d, 0),
      androidRemoves: appEvent("app_remove", "Android"),
      androidPushOpens: appEvent("notification_open", "Android"),
      androidPushDismisses: appEvent("notification_dismiss", "Android"),
    },
    cohort: { d1: retention("1"), d7: retention("7"), activation: activationRatio },
    ads: {
      impressions: sum(ads, (r) => r.impressions),
      matchedRequests: sum(ads, (r) => r.matchedRequests),
      earningsMicros: sum(ads, (r) => r.earningsMicros),
    },
    play: playNumbers(input.play ?? [], w),
    appStorePage: (() => {
      const eng = (input.appstoreEngagement ?? []).filter((r) => inWeek(r.day, w));
      const of = (event: string, pick: (r: (typeof eng)[number]) => number) => sum(eng.filter((r) => r.event === event), pick);
      return {
        impressions: of("Impression", (r) => r.counts),
        impressionsUnique: of("Impression", (r) => r.uniqueCounts),
        pageViews: of("Page view", (r) => r.counts),
        pageViewsUnique: of("Page view", (r) => r.uniqueCounts),
      };
    })(),
  };
}

/**
 * Play 는 3~7일 늦게 들어온다. 기간 끝까지 안 들어왔으면 들어온 날(until, 한국 날짜)까지로 자르고,
 * 비교 기간도 첫날부터 같은 날 수로 자른다. 그래야 "덜 들어와 줄어든 것"을 "줄었다"로 읽지 않는다.
 * until 이 기간 첫날보다 앞이면 이 기간 Play 숫자는 없다(null)
 */
export function playWindow(range: Week, previous: Week, until: string | null): { current: Week; previous: Week; cut: boolean } | null {
  if (!until || until < range.start) return null;
  if (until >= range.end) return { current: range, previous, cut: false };
  const days = ymdRange(range.start, until).length;
  return { current: { start: range.start, end: until }, previous: { start: previous.start, end: addDays(previous.start, days - 1) }, cut: true };
}

/** now 기준으로 바로 지난주(한국 날짜 월~일)와 그 전주 */
export function lastTwoWeeks(todaySeoul: string): { current: Week; previous: Week } {
  const day = new Date(`${todaySeoul}T12:00:00Z`);
  const dow = (day.getUTCDay() + 6) % 7; // 월 0 ... 일 6
  const thisMonday = new Date(day.getTime() - dow * 86_400_000);
  const shift = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000).toISOString().slice(0, 10);
  return {
    current: { start: shift(thisMonday, -7), end: shift(thisMonday, -1) },
    previous: { start: shift(thisMonday, -14), end: shift(thisMonday, -8) },
  };
}
