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
        ga("app", "2026-10-02", "event", "first_open/Android", "eventCount", 5),
        ga("app", "2026-10-02", "event", "first_open/iOS", "eventCount", 3),
        ga("app", "2026-10-02", "event", "game_start/iOS", "eventCount", 4),
        ga("web", "2026-10-02", "session_campaign", "instagram/bio/always/download", "sessions", 2),
        ga("web", "2026-10-02", "session_campaign", "google/organic/(organic)/", "sessions", 9),
        ga("web", "2026-09-30", "total", "", "sessions", 99), // 기간 밖
      ],
      appstoreSales: [{ day: "2026-10-01", productType: "1F", units: 2 }, { day: "2026-10-01", productType: "7F", units: 8 }],
      admob: [{ day: "2026-10-03", earningsMicros: 1000, matchedRequests: 4, impressions: 3 }],
    },
    { start: "2026-10-01", end: "2026-10-03" },
  );
  assert.deepEqual(s.map((p) => p.day), ["2026-10-01", "2026-10-02", "2026-10-03"]);
  assert.equal(s[0].appStoreNew, 2); // 업데이트(7F)는 신규가 아니다
  assert.deepEqual([s[1].firstOpenAndroid, s[1].firstOpenIos, s[1].gameStarts, s[1].webFromInstagram], [5, 3, 4, 2]);
  assert.equal(s[2].adImpressions, 3);
  assert.equal(s[0].webSessions, 0);
});

test("캠페인 표는 기간 합으로, 많은 순으로, 앱은 네 번째 칸이 플랫폼", () => {
  const rows = [
    ga("web", "2026-10-01", "session_campaign", "instagram/bio/always/download", "sessions", 2),
    ga("web", "2026-10-02", "session_campaign", "instagram/bio/always/download", "sessions", 3),
    ga("web", "2026-10-02", "session_campaign", "(direct)/(none)/(direct)/", "sessions", 4),
    ga("app", "2026-10-02", "first_user_campaign", "google-play/organic/(not set)/Android", "newUsers", 7),
  ];
  const r = { start: "2026-10-01", end: "2026-10-02" };
  assert.deepEqual(campaigns(rows, r, "web").map((c) => [c.source, c.content, c.sessions]), [
    ["instagram", "download", 5],
    ["(direct)", "", 4],
  ]);
  assert.deepEqual(campaigns(rows, r, "app"), [
    { source: "google-play", medium: "organic", campaign: "(not set)", content: "", platform: "Android", sessions: 7 },
  ]);
});
