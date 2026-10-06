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
  };
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
