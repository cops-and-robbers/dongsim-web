import test from "node:test";
import assert from "node:assert/strict";
import { dayOf, periods, toRows } from "./run.ts";

const MATERIAL = { id: "1793948096103141000", title: "앱아이콘", groupId: "g1", campaignId: "c1" };

test("당근 날짜는 한국 날짜로 읽는다", () => {
  assert.equal(dayOf("2026-11-09"), "2026-11-09");
  assert.equal(dayOf("2026-11-09T00:00:00+09:00"), "2026-11-09");
  assert.equal(dayOf("2026-11-08T15:00:00Z"), "2026-11-09");
});

test("모르는 날짜 모양이면 틀린 날에 넣지 않고 멈춘다", () => {
  assert.throws(() => dayOf("지난주"), /날짜를 읽지 못했어요/);
});

test("성과 줄에 소재 정보를 붙이고 문자열 비용을 숫자로 바꾼다", () => {
  assert.deepEqual(toRows([{ id: MATERIAL.id, duration: "2026-11-09", impression: 12, click: 2, cost: "180" }], [MATERIAL]), [
    { day: "2026-11-09", materialId: MATERIAL.id, campaignId: "c1", groupId: "g1", materialName: "앱아이콘", impressions: 12, clicks: 2, costWon: 180 },
  ]);
});

test("숫자가 빠진 칸은 0 으로 본다", () => {
  const [row] = toRows([{ id: MATERIAL.id, duration: "2026-11-09" }], [MATERIAL]);
  assert.deepEqual([row.impressions, row.clicks, row.costWon], [0, 0, 0]);
});

test("목록에 없는 소재의 성과나 읽을 수 없는 비용은 멈춘다", () => {
  assert.throws(() => toRows([{ id: "x", duration: "2026-11-09" }], [MATERIAL]), /목록에 없는 소재/);
  assert.throws(() => toRows([{ id: MATERIAL.id, duration: "2026-11-09", cost: "많음" }], [MATERIAL]), /비용을 읽지 못했어요/);
});

test("긴 기간은 31일씩 나눠 조회한다", () => {
  assert.deepEqual(periods("2026-11-06", "2026-11-09"), [{ from: "2026-11-06", to: "2026-11-09" }]);
  const long = periods("2026-11-01", "2027-01-05");
  assert.equal(long.length, 3);
  assert.deepEqual(long[0], { from: "2026-11-01", to: "2026-12-01" });
  assert.deepEqual(long[2], { from: "2027-01-02", to: "2027-01-05" });
});

test("광고가 나간 날의 광고 UTM 방문만 세고 비용과 나란히 모은다", async () => {
  const { weeklyNumbers } = await import("../weekly/numbers.ts");
  const week = { start: "2026-11-09", end: "2026-11-15" };
  const ga = (key, value, day = "2026-11-10") => ({ property: "web", day, breakdown: "session_campaign", key, metric: "sessions", value });
  const n = weeklyNumbers(
    {
      instagramDays: [],
      instagramPosts: [],
      appstoreSales: [],
      admob: [],
      ga4: [ga("daangn|keyword|daangn_2611_keyword", 4), ga("daangn|keyword|daangn_2611_keyword", 3, "2026-11-11"), ga("daangn|bizprofile|daangn_2610_search", 9), ga("daangn|keyword|daangn_2611_keyword", 7, "2026-11-08")],
      daangnAds: [
        { day: "2026-11-10", impressions: 10, clicks: 2, costWon: 180 },
        { day: "2026-11-08", impressions: 99, clicks: 9, costWon: 810 },
      ],
    },
    week,
  );
  assert.deepEqual(n.daangnAds, { impressions: 10, clicks: 2, costWon: 180, visits: 4 });
});
