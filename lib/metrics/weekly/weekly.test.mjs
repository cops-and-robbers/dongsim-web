// 주간 리포트 테스트 (#146). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildWeeklyReport } from "./messages.ts";
import { lastTwoWeeks, playWindow, weeklyNumbers } from "./numbers.ts";

test("지난주는 오늘이 무슨 요일이든 바로 전 월요일~일요일", () => {
  // 2026-10-05 월요일, 2026-10-11 일요일
  for (const today of ["2026-10-05", "2026-10-08", "2026-10-11"]) {
    assert.deepEqual(lastTwoWeeks(today), {
      current: { start: "2026-09-28", end: "2026-10-04" },
      previous: { start: "2026-09-21", end: "2026-09-27" },
    });
  }
});

const W = { start: "2026-09-28", end: "2026-10-04" };
const ga = (property, day, breakdown, key, metric, value) => ({ property, day, breakdown, key, metric, value });

test("주에 들어가는 날만, 더해도 되는 숫자만 더한다", () => {
  const n = weeklyNumbers(
    {
      instagramDays: [
        // PT 날짜라 하루 뒤 한국 날짜로 옮겨 센다: 9/27 은 이번 주 월요일, 10/04 는 다음 주
        { day: "2026-09-26", views: 999, profileViews: 9, websiteClicks: 9 }, // 전주
        { day: "2026-09-27", views: 100, profileViews: 5, websiteClicks: 1 },
        { day: "2026-10-03", views: 50, profileViews: null, websiteClicks: 2 },
        { day: "2026-10-04", views: 777, profileViews: 7, websiteClicks: 7 }, // 다음 주
      ],
      // 한국 날짜로 나눈다: 9/27 23:30 UTC 는 한국 9/28 08:30 이라 이번 주
      instagramPosts: [{ postedAt: "2026-09-27T23:30:00Z" }, { postedAt: "2026-09-27T10:00:00Z" }],
      ga4: [
        ga("web", "2026-09-30", "total", "", "sessions", 10),
        ga("web", "2026-09-30", "total", "", "activeUsers", 99), // 하루 사용자는 더하지 않는다
        ga("web", "2026-09-30", "session_campaign", "instagram|bio|always|download", "sessions", 3),
        ga("web", "2026-09-30", "session_campaign", "l.instagram.com|referral|(referral)|(not set)", "sessions", 2),
        ga("web", "2026-09-30", "session_campaign", "linktr.ee|referral|(referral)|(not set)", "sessions", 4),
        ga("web", "2026-09-30", "session_campaign", "ig|social|(referral)|link_in_bio", "sessions", 2), // 인스타가 스스로 붙인 UTM
        ga("web", "2026-09-30", "session_campaign", "facebook.com|referral|(referral)|(not set)", "sessions", 6), // 가를 수 없어 빼기
        ga("web", "2026-09-30", "event", "app_download_click", "eventCount", 7),
        ga("web", "2026-09-30", "download_source", "linktr.ee|referral|(referral)", "eventCount", 3),
        ga("web", "2026-09-30", "download_source", "linktr.ee|referral|(referral)", "sessions", 2), // 한 방문에서 두 번 누르면 방문은 하나
        ga("web", "2026-09-30", "download_source", "(direct)|(none)|(direct)", "sessions", 4),
        ga("web", "2026-09-30", "download_source", "github.com|referral|(referral)", "sessions", 1), // 팀 방문은 빼기
        ga("web", "2026-09-30", "download_page", "linktr.ee|referral|/download", "eventCount", 2),
        ga("web", "2026-09-30", "download_page", "linktr.ee|referral|/download", "sessions", 2),
        ga("web", "2026-09-30", "download_page", "(direct)|(none)|/download", "eventCount", 3),
        ga("web", "2026-09-30", "download_page", "(direct)|(none)|/download", "sessions", 3),
        ga("web", "2026-09-30", "download_page", "localhost:5174|referral|/download", "sessions", 1), // 팀 방문은 빼기
        ga("web", "2026-09-30", "download_page", "(direct)|(none)|/", "eventCount", 3),
        ga("web", "2026-09-30", "download_source", "(direct)|(none)|(direct)", "eventCount", 4),
        // 우리 팀 개발 방문은 방문과 버튼 클릭에서 뺀다
        ga("web", "2026-09-30", "session_campaign", "localhost:5174|referral|(referral)|(not set)", "sessions", 2),
        ga("web", "2026-09-30", "download_source", "github.com|referral|(referral)", "eventCount", 1),
        // 하루 활성 사용자는 플랫폼을 더해 날마다 평균
        ga("app", "2026-09-30", "platform", "Android", "activeUsers", 10),
        ga("app", "2026-09-30", "platform", "iOS", "activeUsers", 6),
        ga("app", "2026-10-01", "platform", "Android", "activeUsers", 8),
        ga("app", "2026-09-30", "event", "app_remove|Android", "eventCount", 2),
        ga("app", "2026-09-30", "event", "notification_open|Android", "eventCount", 3),
        ga("app", "2026-09-30", "event", "notification_open|iOS", "eventCount", 9), // iOS 는 닫기가 안 찍혀 빼고 센다
        ga("app", "2026-09-30", "event", "notification_dismiss|Android", "eventCount", 1),
        // 코호트: 9/28 에 처음 온 10명 중 1일 뒤 2명, 7일 뒤 1명, 7일 안 게임 참가 4명. 10/3 은 7일이 안 익어 1일만
        ga("app", "2026-09-28", "retention", "0", "cohortActiveUsers", 10),
        ga("app", "2026-09-28", "retention", "1", "cohortActiveUsers", 2),
        ga("app", "2026-09-28", "retention", "7", "cohortActiveUsers", 1),
        // 활성화는 퍼널(#157)의 첫 실행 대비 게임 플레이(모든 나라, 테스트 기기는 수집 때 뺐다). 예전 activation 줄은 안 센다
        ga("app", "2026-09-28", "activation", "", "gameStartUsers7d", 99),
        ga("app", "2026-09-28", "funnel", "open|Android|KR", "users", 6),
        ga("app", "2026-09-28", "funnel", "open|iOS|JP", "users", 4),
        ga("app", "2026-09-28", "funnel", "play|iOS|KR", "users", 4),
        ga("app", "2026-09-28", "funnel", "open|Android|IN", "users", 3),
        ga("app", "2026-09-28", "funnel", "play|Android|IN", "users", 2),
        ga("app", "2026-09-28", "funnel", "replay|-|-", "users", 0), // 표시 줄은 안 센다
        ga("app", "2026-10-03", "retention", "0", "cohortActiveUsers", 5),
        ga("app", "2026-10-03", "retention", "1", "cohortActiveUsers", 0),
        ga("app", "2026-09-30", "event", "first_open|Android", "eventCount", 50), // 첫 실행은 나라별 줄에서 센다
        ga("app", "2026-09-30", "first_open_country", "Android|KR", "eventCount", 4), // 테스트 기기는 수집 때 뺀 줄
        ga("app", "2026-09-30", "first_open_country", "Android|IN", "eventCount", 1),
        ga("app", "2026-09-30", "first_open_country", "iOS|KR", "eventCount", 3),
        ga("app", "2026-09-30", "first_open_country", "iOS|JP", "eventCount", 1),
        ga("app", "2026-09-30", "first_open_test", "Android", "eventCount", 7),
        ga("app", "2026-09-30", "event", "first_open|iOS", "eventCount", 4),
        ga("app", "2026-09-30", "event", "game_start|iOS", "eventCount", 6),
        ga("app", "2026-09-30", "event", "game_start|Android", "eventCount", 1),
        ga("app", "2026-09-30", "event", "game_over|iOS", "eventCount", 4),
      ],
      appstoreSales: [
        { day: "2026-10-01", productType: "1F", units: 3 },
        { day: "2026-10-04", productType: "1", units: 2 }, // 한국 날짜 그대로(#154): 일요일은 이번 주
        { day: "2026-09-27", productType: "1", units: 8 }, // 전주 일요일
        { day: "2026-10-01", productType: "3F", units: 9 }, // 재다운로드는 신규가 아니다
        { day: "2026-10-01", productType: "7F", units: 9 }, // 업데이트도
      ],
      admob: [{ day: "2026-10-02", earningsMicros: 230000, matchedRequests: 10, impressions: 5 }],
    },
    W,
  );
  assert.deepEqual(n, {
    instagram: { posts: 1, views: 150, profileViews: 5, linkClicks: 3 },
    web: { sessions: 8, fromInstagram: 11, downloadClicks: 6, downloadLinkClicks: 5, downloadClicksFromInstagram: 3, storeSessions: 6, storeSessionsFromInstagram: 2, linkSessions: 5, linkSessionsFromInstagram: 2, internalSessions: 2 },
    installs: { appStoreNew: 5, firstOpenAndroid: 5, firstOpenIos: 4, firstOpenTest: 7 },
    game: { playerStarts: 7, playerFinishes: 4 },
    app: { dauAvg: 12, dauSum: 24, androidRemoves: 2, androidPushOpens: 3, androidPushDismisses: 1 },
    cohort: { d1: { num: 2, den: 15 }, d7: { num: 1, den: 10 }, activation: { num: 6, den: 13 } },
    ads: { impressions: 5, matchedRequests: 10, earningsMicros: 230000 },
    play: { installs: 0, installEvents: 0, uninstalls: 0, activeDevicesStart: null, activeDevicesEnd: null, storeVisitors: 0, storeAcquisitions: 0, crashes: 0, anrs: 0, ratingTotal: null },
    appStorePage: { impressions: 0, impressionsUnique: 0, pageViews: 0, pageViewsUnique: 0 },
  });
});

const ZERO = {
  instagram: { posts: 0, views: 0, profileViews: 0, linkClicks: 0 },
  web: { sessions: 0, fromInstagram: 0, downloadClicks: 0, downloadLinkClicks: 0, downloadClicksFromInstagram: 0, storeSessions: 0, storeSessionsFromInstagram: 0, linkSessions: 0, linkSessionsFromInstagram: 0, internalSessions: 0 },
  installs: { appStoreNew: 0, firstOpenAndroid: 0, firstOpenIos: 0, firstOpenTest: 0 },
  game: { playerStarts: 0, playerFinishes: 0 },
  app: { dauAvg: null, dauSum: 0, androidRemoves: 0, androidPushOpens: 0, androidPushDismisses: 0 },
  cohort: { d1: { num: 0, den: 0 }, d7: { num: 0, den: 0 }, activation: { num: 0, den: 0 } },
  ads: { impressions: 0, matchedRequests: 0, earningsMicros: 0 },
};

// 2026-09-28 주 실제 숫자 (각 소스에 직접 물어 대조함, 2026-10-06)
const LAST_WEEK = {
  instagram: { posts: 2, views: 1148, profileViews: 83, linkClicks: 8 },
  web: { sessions: 78, fromInstagram: 8, downloadClicks: 7, downloadLinkClicks: 5, downloadClicksFromInstagram: 1, storeSessions: 6, storeSessionsFromInstagram: 1, linkSessions: 5, linkSessionsFromInstagram: 1, internalSessions: 0 },
  installs: { appStoreNew: 39, firstOpenAndroid: 71, firstOpenIos: 43, firstOpenTest: 79 },
  game: { playerStarts: 141, playerFinishes: 106 },
  app: { dauAvg: 20, dauSum: 140, androidRemoves: 0, androidPushOpens: 0, androidPushDismisses: 0 },
  cohort: { d1: { num: 0, den: 0 }, d7: { num: 0, den: 0 }, activation: { num: 0, den: 0 } },
  ads: { impressions: 116, matchedRequests: 216, earningsMicros: 464827 },
};

test("주간 리포트 문구", () => {
  const text = buildWeeklyReport(W, LAST_WEEK, { ...ZERO, installs: { appStoreNew: 10, firstOpenAndroid: 31, firstOpenIos: 13, firstOpenTest: 0 } });
  const lines = text.split("\n");
  assert.equal(lines[0], "**지난주(9월 28일~10월 4일) 앱 첫 실행은 114회예요**");
  assert.equal(lines[1], "그 전주보다 70회 늘었어요.");
  assert.ok(lines.includes("- App Store 최초 다운로드 39건 (전주 10건)"));
  assert.ok(lines.includes("- 광고 게재율 54%"));
  assert.ok(lines.includes("-# 앱 첫 실행은 Android와 iOS를 더한 횟수예요. 구글 플레이 자동 테스트 기기로 보이는 79회는 뺐어요."));
  assert.ok(lines.includes("-# 게재율은 받은 광고 중 화면에 뜬 비율이에요(AdMob 표기)."));
  assert.ok(lines.includes("- 게임을 끝낸 106회, 1회당 광고 노출 1.1회"));
  assert.ok(lines.includes("- 게임 참가 141회 (전주 0회)"));
  assert.ok(lines.includes("- 예상 광고 수익 0.46달러 (전주 0.00달러)"));
  assert.doesNotMatch(text, /[\u2014\u2013]/); // 긴 대시 (저장소 규칙)
  assert.ok(lines.every((l) => !l.startsWith("#")), "헤더(#)를 쓰지 않는다. 작은 글씨 -# 만 쓴다");
  assert.ok(text.length <= 2000);
});

test("일요일 App Store 리포트가 아직 없으면 월~토로 비교했다고 밝힌다", () => {
  const text = buildWeeklyReport(W, LAST_WEEK, { ...ZERO, installs: { appStoreNew: 10, firstOpenAndroid: 31, firstOpenIos: 13, firstOpenTest: 0 } }, { appStoreUntilSaturday: true });
  const lines = text.split("\n");
  assert.ok(lines.includes("- App Store 최초 다운로드(월~토) 39건 (전주 10건)"));
  assert.ok(lines.includes("-# App Store 다운로드는 일요일 숫자가 아직 안 나와서 두 주 모두 월~토요일로 비교했어요."));
  assert.doesNotMatch(buildWeeklyReport(W, LAST_WEEK, ZERO), /월~토/);
});

test("광고 요청이나 끝난 게임이 없으면 비율 줄을 뺀다, 줄었으면 줄었다고 쓴다", () => {
  const text = buildWeeklyReport(W, { ...ZERO, installs: { appStoreNew: 0, firstOpenAndroid: 1, firstOpenIos: 0, firstOpenTest: 0 } }, { ...ZERO, installs: { appStoreNew: 0, firstOpenAndroid: 4, firstOpenIos: 0, firstOpenTest: 0 } });
  assert.match(text, /\n그 전주보다 3회 줄었어요\./);
  assert.doesNotMatch(text, /게재율|한 판당/);
});

const pl = (day, report, dim, key, metric, value) => ({ day, report, dim, key, metric, value });

test("Google Play: PT 날짜를 하루 뒤로 옮겨 주에 넣고, 누적값은 더하지 않는다", () => {
  const play = [
    // PT 9/27 은 한국 9/28(월)이라 이번 주. PT 10/4 는 한국 10/5 라 다음 주
    pl("2026-09-27", "installs", "overview", "", "user_installs", 3),
    pl("2026-10-03", "installs", "overview", "", "user_installs", 19),
    pl("2026-10-04", "installs", "overview", "", "user_installs", 50),
    pl("2026-10-01", "installs", "overview", "", "user_uninstalls", 2),
    // 활성 기기: 주 시작 전날(한국 9/27 = PT 9/26) 값과 주 마지막 날 값
    pl("2026-09-26", "installs", "overview", "", "active_devices", 130),
    pl("2026-10-02", "installs", "overview", "", "active_devices", 140),
    pl("2026-10-03", "installs", "overview", "", "active_devices", 150),
    // 스토어 등록정보는 나라 축만 더한다(유입 경로 축까지 더하면 두 번 센다)
    pl("2026-09-30", "store", "country", "KR", "visitors", 4),
    pl("2026-09-30", "store", "country", "Other", "visitors", 40),
    pl("2026-09-30", "store", "traffic_source", "Other|Other|Other|Other", "visitors", 44),
    pl("2026-09-30", "store", "country", "KR", "acquisitions", 2),
    pl("2026-10-01", "crashes", "overview", "", "crashes", 11),
    pl("2026-10-01", "ratings", "overview", "", "rating_total", 4.8),
  ];
  const n = weeklyNumbers({ instagramDays: [], instagramPosts: [], ga4: [], appstoreSales: [], admob: [], play }, W).play;
  assert.equal(n.installs, 22);
  assert.equal(n.uninstalls, 2);
  assert.equal(n.activeDevicesStart, 130);
  assert.equal(n.activeDevicesEnd, 150);
  assert.equal(n.storeVisitors, 44);
  assert.equal(n.storeAcquisitions, 2);
  assert.equal(n.crashes, 11);
  assert.equal(n.ratingTotal, 4.8);
});

test("Google Play 는 들어온 날까지 잘라 비교 기간도 같은 날 수로", () => {
  const prev = { start: "2026-09-21", end: "2026-09-27" };
  assert.deepEqual(playWindow(W, prev, "2026-09-30"), { current: { start: "2026-09-28", end: "2026-09-30" }, previous: { start: "2026-09-21", end: "2026-09-23" }, cut: true });
  assert.deepEqual(playWindow(W, prev, "2026-10-06"), { current: W, previous: prev, cut: false });
  assert.equal(playWindow(W, prev, "2026-09-25"), null);
  assert.equal(playWindow(W, prev, null), null);
});

test("주간 리포트: Google Play 는 들어온 요일까지 견줬다고 밝히고, 없으면 없다고 쓴다", () => {
  const cut = buildWeeklyReport(W, LAST_WEEK, ZERO, { playInstalls: { now: 30, before: 12, days: 3 } }).split("\n");
  assert.ok(cut.includes("- Google Play 최초 설치(월~수) 30건 (전주 12건)"));
  assert.ok(cut.includes("-# Google Play 설치는 3~7일 늦게 나와서 두 주 모두 월~수요일로 비교했어요."));
  const full = buildWeeklyReport(W, LAST_WEEK, ZERO, { playInstalls: { now: 30, before: 12, days: 7 } });
  assert.match(full, /- Google Play 최초 설치 30건 \(전주 12건\)/);
  assert.doesNotMatch(full, /늦게 나와서/);
  const none = buildWeeklyReport(W, LAST_WEEK, ZERO, { playInstalls: null });
  assert.doesNotMatch(none, /- Google Play/);
  assert.match(none, /지난주 숫자가 아직 없어요/);
});
