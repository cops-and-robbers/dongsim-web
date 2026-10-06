// 주간 리포트 테스트 (#146). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildWeeklyReport } from "./messages.ts";
import { lastTwoWeeks, weeklyNumbers } from "./numbers.ts";

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
        { day: "2026-09-27", views: 999, profileViews: 9, websiteClicks: 9 }, // 전주
        { day: "2026-09-28", views: 100, profileViews: 5, websiteClicks: 1 },
        { day: "2026-10-04", views: 50, profileViews: null, websiteClicks: 2 },
      ],
      // 한국 날짜로 나눈다: 9/27 23:30 UTC 는 한국 9/28 08:30 이라 이번 주
      instagramPosts: [{ postedAt: "2026-09-27T23:30:00Z" }, { postedAt: "2026-09-27T10:00:00Z" }],
      ga4: [
        ga("web", "2026-09-30", "total", "", "sessions", 10),
        ga("web", "2026-09-30", "total", "", "activeUsers", 99), // 하루 사용자는 더하지 않는다
        ga("web", "2026-09-30", "session_campaign", "instagram/bio/always/download", "sessions", 3),
        ga("web", "2026-09-30", "session_campaign", "l.instagram.com/referral/(referral)/(not set)", "sessions", 2),
        ga("web", "2026-09-30", "session_campaign", "linktr.ee/referral/(referral)/(not set)", "sessions", 4),
        ga("web", "2026-09-30", "event", "app_download_click", "eventCount", 7),
        ga("app", "2026-09-30", "event", "first_open/Android", "eventCount", 5),
        ga("app", "2026-09-30", "event", "first_open/iOS", "eventCount", 4),
        ga("app", "2026-09-30", "event", "game_start/iOS", "eventCount", 6),
        ga("app", "2026-09-30", "event", "game_start/Android", "eventCount", 1),
        ga("app", "2026-09-30", "event", "game_over/iOS", "eventCount", 4),
      ],
      appstoreSales: [
        { day: "2026-10-01", productType: "1F", units: 3 },
        { day: "2026-10-01", productType: "3F", units: 9 }, // 재다운로드는 신규가 아니다
        { day: "2026-10-01", productType: "7F", units: 9 }, // 업데이트도
      ],
      admob: [{ day: "2026-10-02", earningsMicros: 230000, matchedRequests: 10, impressions: 5 }],
    },
    W,
  );
  assert.deepEqual(n, {
    instagram: { posts: 1, views: 150, profileViews: 5, linkClicks: 3 },
    web: { sessions: 10, fromInstagram: 5, downloadClicks: 7 },
    installs: { appStoreNew: 3, firstOpenAndroid: 5, firstOpenIos: 4 },
    game: { starts: 7, overs: 4 },
    ads: { impressions: 5, matchedRequests: 10, earningsMicros: 230000 },
  });
});

const ZERO = {
  instagram: { posts: 0, views: 0, profileViews: 0, linkClicks: 0 },
  web: { sessions: 0, fromInstagram: 0, downloadClicks: 0 },
  installs: { appStoreNew: 0, firstOpenAndroid: 0, firstOpenIos: 0 },
  game: { starts: 0, overs: 0 },
  ads: { impressions: 0, matchedRequests: 0, earningsMicros: 0 },
};

// 2026-09-28 주 실제 숫자 (각 소스에 직접 물어 대조함, 2026-10-06)
const LAST_WEEK = {
  instagram: { posts: 2, views: 1148, profileViews: 83, linkClicks: 8 },
  web: { sessions: 78, fromInstagram: 0, downloadClicks: 7 },
  installs: { appStoreNew: 39, firstOpenAndroid: 71, firstOpenIos: 43 },
  game: { starts: 141, overs: 106 },
  ads: { impressions: 116, matchedRequests: 216, earningsMicros: 464827 },
};

test("주간 리포트 문구", () => {
  const text = buildWeeklyReport(W, LAST_WEEK, { ...ZERO, installs: { appStoreNew: 10, firstOpenAndroid: 31, firstOpenIos: 13 } });
  const lines = text.split("\n");
  assert.equal(lines[0], "**지난주(9월 28일~10월 4일) 앱을 처음 연 사람은 114명이에요**");
  assert.equal(lines[1], "전주보다 70명 늘었어요.");
  assert.ok(lines.includes("- App Store 신규 다운로드 39건 (전주 10건)"));
  assert.ok(lines.includes("- 광고 노출률 54% (받은 광고 중 실제로 보인 비율)"));
  assert.ok(lines.includes("- 끝난 게임 한 판당 광고 노출 1.1회"));
  assert.ok(lines.includes("- 예상 광고 수익 $0.46 (전주 $0.00)"));
  assert.doesNotMatch(text, /[—–]/); // 긴 대시 (저장소 규칙)
  assert.ok(lines.every((l) => !l.startsWith("#")), "헤더(#)를 쓰지 않는다. 작은 글씨 -# 만 쓴다");
  assert.ok(text.length <= 2000);
});

test("광고 요청이나 끝난 게임이 없으면 비율 줄을 뺀다, 줄었으면 줄었다고 쓴다", () => {
  const text = buildWeeklyReport(W, { ...ZERO, installs: { appStoreNew: 0, firstOpenAndroid: 1, firstOpenIos: 0 } }, { ...ZERO, installs: { appStoreNew: 0, firstOpenAndroid: 4, firstOpenIos: 0 } });
  assert.match(text, /\n전주보다 3명 줄었어요\./);
  assert.doesNotMatch(text, /노출률|한 판당/);
});
