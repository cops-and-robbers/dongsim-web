// 지표 화면 데이터 테스트 (#145). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { campaigns, dailySeries, previousRange } from "./data.ts";

test("비교 기간은 바로 앞 같은 길이", () => {
  assert.deepEqual(previousRange({ start: "2026-09-28", end: "2026-10-04" }), { start: "2026-09-21", end: "2026-09-27" });
  assert.deepEqual(previousRange({ start: "2026-07-08", end: "2026-10-05" }), { start: "2026-04-09", end: "2026-07-07" });
});

const ga = (property, day, breakdown, key, metric, value) => ({ property, day, breakdown, key, metric, value });
const EMPTY = { instagramDays: [], instagramPosts: [], ga4: [], appstoreSales: [], admob: [] };

test("날짜별 추이는 숫자가 없는 날도 0 으로 채운다", () => {
  const s = dailySeries(
    {
      ...EMPTY,
      ga4: [
        ga("app", "2026-10-02", "event", "first_open|Android", "eventCount", 5),
        ga("app", "2026-10-02", "event", "first_open|iOS", "eventCount", 3),
        ga("app", "2026-10-02", "event", "game_start|iOS", "eventCount", 4),
        ga("web", "2026-10-02", "session_campaign", "instagram|bio|always|download", "sessions", 2),
        ga("web", "2026-10-02", "session_campaign", "google|organic|(organic)|", "sessions", 9),
        ga("web", "2026-09-30", "total", "", "sessions", 99), // 기간 밖
      ],
      // App Store 판매는 한국 날짜 그대로 놓는다(#154): 10/1 은 첫날, 9/30 은 기간 밖
      appstoreSales: [
        { day: "2026-10-01", productType: "1F", units: 2 },
        { day: "2026-10-01", productType: "7F", units: 8 },
        { day: "2026-09-30", productType: "1F", units: 50 },
      ],
      instagramDays: [{ day: "2026-10-02", views: 11, profileViews: 1, websiteClicks: 0 }],
      admob: [{ day: "2026-10-03", earningsMicros: 1000, matchedRequests: 4, impressions: 3 }],
    },
    { start: "2026-10-01", end: "2026-10-03" },
  );
  assert.deepEqual(s.map((p) => p.day), ["2026-10-01", "2026-10-02", "2026-10-03"]);
  assert.equal(s[0].appStoreNew, 2); // 업데이트(7F)는 신규가 아니다
  assert.deepEqual([s[1].firstOpenAndroid, s[1].firstOpenIos, s[1].playerStarts, s[1].webFromInstagram], [5, 3, 4, 2]);
  assert.equal(s[2].adImpressions, 3);
  assert.equal(s[2].igViews, 11);
  assert.equal(s[1].igViews, 0);
  assert.equal(s[0].webSessions, 0);
});

test("캠페인 표는 기간 합으로, 많은 순으로, 앱은 네 번째 칸이 플랫폼", () => {
  const rows = [
    ga("web", "2026-10-01", "session_campaign", "instagram|bio|always|download", "sessions", 2),
    ga("web", "2026-10-02", "session_campaign", "instagram|bio|always|download", "sessions", 3),
    ga("web", "2026-10-02", "session_campaign", "(direct)|(none)|(direct)|", "sessions", 4),
    // 값에 / 가 들어가도 칸이 밀리지 않는다
    ga("web", "2026-10-02", "session_campaign", "event.example.com|referral|fall/2026|", "sessions", 1),
    ga("app", "2026-10-02", "first_user_campaign", "google-play|organic|(not set)|Android", "newUsers", 7),
  ];
  const r = { start: "2026-10-01", end: "2026-10-02" };
  assert.deepEqual(campaigns(rows, r, "web").map((c) => [c.source, c.content, c.sessions]), [
    ["instagram", "download", 5],
    ["(direct)", "", 4],
    ["event.example.com", "", 1],
  ]);
  assert.equal(campaigns(rows, r, "web")[2].campaign, "fall/2026");
  assert.deepEqual(campaigns(rows, r, "app"), [
    { source: "google-play", medium: "organic", campaign: "(not set)", content: "", platform: "Android", sessions: 7 },
  ]);
});

test("팀 개발 방문은 방문, 버튼 클릭, 채널, 소스 표에서 모두 빠진다", async () => {
  const { channelTable } = await import("./data.ts");
  const rows = [
    ga("web", "2026-10-02", "total", "", "sessions", 20),
    ga("web", "2026-10-02", "session_campaign", "localhost:5174|referral|(referral)|(not set)", "sessions", 5),
    ga("web", "2026-10-02", "session_campaign", "ig|social|(referral)|link_in_bio", "sessions", 4),
    ga("web", "2026-10-02", "session_campaign", "google|organic|(organic)|(not set)", "sessions", 6),
    ga("web", "2026-10-02", "session_campaign", "(direct)|(none)|(direct)|(not set)", "sessions", 5),
    ga("web", "2026-10-02", "event", "app_download_click", "eventCount", 4),
    ga("web", "2026-10-02", "download_source", "vercel.com|referral|(referral)", "eventCount", 1),
    ga("web", "2026-10-02", "download_source", "linktr.ee|referral|(referral)", "eventCount", 3),
    ga("web", "2026-10-02", "download_source", "linktr.ee|referral|(referral)", "sessions", 2),
    ga("web", "2026-10-02", "download_source", "vercel.com|referral|(referral)", "sessions", 1),
    ga("web", "2026-10-02", "download_page", "linktr.ee|referral|/download", "sessions", 1),
  ];
  const r = { start: "2026-10-01", end: "2026-10-03" };
  const s = dailySeries({ ...EMPTY, ga4: rows }, r);
  assert.equal(s[1].webSessions, 15);
  assert.equal(s[1].downloadClicks, 3);
  assert.deepEqual(channelTable(rows, r), [
    { channel: "인스타그램", sessions: 4, storeSessions: 2, linkSessions: 1 },
    { channel: "검색", sessions: 6, storeSessions: 0, linkSessions: 0 },
    { channel: "직접 입력과 QR", sessions: 5, storeSessions: 0, linkSessions: 0 },
  ]);
  assert.ok(campaigns(rows, r, "web").every((c) => c.source !== "localhost:5174"));
});

test("팔로워 증감은 기간 시작 전 마지막 기록과 기간 안 마지막 기록의 차이", async () => {
  const { followerSummary } = await import("./data.ts");
  const r = { start: "2026-10-05", end: "2026-10-11" };
  assert.equal(followerSummary(null, r), null);
  // 10/12 아침 기록이 10/11 끝의 수. 10/13 기록은 기간 밖
  assert.deepEqual(
    followerSummary(
      [
        { captured_on: "2026-10-04", followers: 79 },
        { captured_on: "2026-10-10", followers: 85 },
        { captured_on: "2026-10-12", followers: 90 },
        { captured_on: "2026-10-13", followers: 99 },
      ],
      r,
    ),
    { now: 90, nowDay: "2026-10-12", change: 11, changeFrom: "2026-10-04" },
  );
  // 기간 전 기록이 없으면 기간 안 첫 기록부터, 기록이 하루뿐이면 증감 없음
  assert.equal(followerSummary([{ captured_on: "2026-10-06", followers: 79 }, { captured_on: "2026-10-09", followers: 81 }], r).change, 2);
  assert.equal(followerSummary([{ captured_on: "2026-10-06", followers: 79 }], r).change, null);
});

test("게임 기록은 시작한 한국 날짜로 판 수와 인원을 센다", async () => {
  const { tally, summarize } = await import("./games.ts");
  const by = tally([
    { id: "7", startedAt: "2026-10-01T23:30:00+09:00", createdAt: "2026-10-02T00:10:00+09:00", totalPoliceCount: 2, totalRobberCount: 3 },
    { id: "7", startedAt: "2026-10-01T23:30:00+09:00", createdAt: "2026-10-02T00:10:00+09:00", totalPoliceCount: 2, totalRobberCount: 3 }, // 쪽 경계로 두 번 읽힘
    { startedAt: null, createdAt: "2026-10-01T15:00:00Z", totalPoliceCount: 1, totalRobberCount: 1 }, // 한국 10/2 0시
    { startedAt: "2026-09-25T12:00:00+09:00", createdAt: "2026-09-25T12:30:00+09:00", totalPoliceCount: 4, totalRobberCount: 4 },
  ]);
  const g = summarize(by, { start: "2026-10-01", end: "2026-10-02" }, { start: "2026-09-29", end: "2026-09-30" }, null);
  assert.deepEqual(g.current, { games: 2, players: 7 });
  assert.deepEqual(g.daily, [1, 1]);
  assert.deepEqual(g.previous, { games: 0, players: 0 });
});

test("게시물 추세: 이웃한 아침 기록의 차이를 앞날 몫으로, 빠진 날은 빈칸", async () => {
  const { dailyGains, earlyShare } = await import("./posts.ts");
  const snap = (day, views) => ({ day, views, reach: null, shares: null, saved: null, profileVisits: null, bioLinkClicks: null });
  const series = [snap("2026-10-06", 100), snap("2026-10-07", 160), snap("2026-10-09", 200), snap("2026-10-10", 198)];
  assert.deepEqual(dailyGains(series, "views"), {
    days: ["2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"],
    values: [60, null, null, 0], // 10/8 기록이 없어 10/7, 10/8 몫은 모름. 줄어든 날은 0
  });
  assert.deepEqual(dailyGains([snap("2026-10-06", 100)], "views"), { days: [], values: [] });
  // 10/5 에 올리고 10/6 아침부터 기록: 3일 안(10/8 아침까지 기록 중 마지막 10/7) 160 / 지금 198
  assert.equal(earlyShare(series, "2026-10-05", "views").toFixed(3), (160 / 198).toFixed(3));
  // 기록을 늦게 시작한 게시물은 처음 며칠 몫을 몰라 null
  assert.equal(earlyShare(series, "2026-09-20", "views"), null);
});
