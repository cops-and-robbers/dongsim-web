// 리포트 규칙 테스트 (#140). 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  REPORT_AFTER_MS,
  SPIKE_MIN_REACH,
  detectSpike,
  isContinuation,
  median,
  pickPostReports,
  pickTopGain,
  previousDay,
  standingOf,
} from "./rules.ts";

const H = 3_600_000;
const D = 24 * H;
const NOW = new Date("2026-10-10T00:00:00Z");

function post(id, ageMs, reach = 100, shares = 1) {
  return {
    id,
    permalink: `https://www.instagram.com/p/${id}/`,
    caption: null,
    mediaType: "CAROUSEL_ALBUM",
    productType: "FEED",
    postedAt: new Date(NOW.getTime() - ageMs).toISOString(),
    latest: reach === null ? null : { views: reach * 2, reach, shares, likes: 1, comments: 0, saved: 0 },
  };
}

test("중앙값", () => {
  assert.equal(median([]), null);
  assert.equal(median([5]), 5);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
});

test("게시물 리포트는 올린 지 3일 이상 7일 미만, 아직 안 보낸 것만 오래된 순으로", () => {
  const media = [
    post("new", 2 * D), // 아직 이르다
    post("edge", REPORT_AFTER_MS), // 딱 3일 - 보낸다
    post("six", 6 * D),
    post("old", 8 * D), // 기능을 켜기 전 옛 게시물 - 보내지 않는다
    post("sent", 4 * D),
    post("noData", 4 * D, null), // 누적값을 못 받은 게시물
  ];
  const picked = pickPostReports(media, NOW, new Set(["sent"]));
  assert.deepEqual(
    picked.map((m) => m.id),
    ["six", "edge"],
  );
});

test("순위는 같은 값이면 같은 등수, 비교 대상이 셋 미만이면 중앙값을 내지 않는다", () => {
  const a = post("a", 4 * D, 500);
  const media = [a, post("b", 9 * D, 500), post("c", 9 * D, 900), post("d", 9 * D, 100)];
  const s = standingOf(a, media, (m) => m.latest?.reach ?? null);
  assert.deepEqual(s, { total: 4, rank: 2, othersMedian: 500, othersCount: 3 });

  const few = standingOf(a, [a, post("b", 9 * D, 10)], (m) => m.latest?.reach ?? null);
  assert.equal(few.othersMedian, null);
  assert.equal(few.rank, 1);
});

// 계정 하루 지표. reaches 의 마지막이 가장 최근에 끝난 하루다
function days(reaches, lastEnd = new Date(NOW.getTime() - 17 * H)) {
  return reaches.map((reach, i) => {
    const end = new Date(lastEnd.getTime() - (reaches.length - 1 - i) * D);
    return {
      day: new Date(end.getTime() - 12 * H).toISOString().slice(0, 10),
      dayStart: new Date(end.getTime() - D).toISOString(),
      dayEnd: end.toISOString(),
      reach,
      views: null,
      profileViews: null,
      websiteClicks: null,
      accountsEngaged: null,
      totalInteractions: null,
    };
  });
}

const QUIET = [100, 120, 90, 110, 100, 130, 80, 100, 95, 105, 100, 115, 85, 100];

test("하루 도달이 평소의 3배 이상이고 300명 이상이면 급상승", () => {
  const spike = detectSpike(days([...QUIET, 600]), NOW);
  assert.ok(spike);
  assert.equal(spike.baseline, 100);
  assert.equal(spike.multiple, 6);
});

test("3배가 안 되면 알리지 않는다", () => {
  assert.equal(detectSpike(days([...QUIET, 290]), NOW), null);
});

test("평소가 적어 배수가 커도 300명이 안 되면 알리지 않는다", () => {
  const tiny = QUIET.map(() => 5);
  assert.equal(detectSpike(days([...tiny, SPIKE_MIN_REACH - 1]), NOW), null);
  assert.ok(detectSpike(days([...tiny, SPIKE_MIN_REACH]), NOW));
});

test("나중에 올린 게시물은 순위와 보통 게시물에서 뺀다", () => {
  const a = post("a", 4 * D, 300);
  const later = post("later", 1 * D, 5); // 올린 지 하루라 아직 작다
  const media = [a, later, post("b", 9 * D, 100), post("c", 9 * D, 200), post("d", 9 * D, 400)];
  const s = standingOf(a, media, (m) => m.latest?.reach ?? null);
  assert.deepEqual(s, { total: 4, rank: 2, othersMedian: 200, othersCount: 3 });
});

test("이어지는 날도 기준만 보면 급상승이다 - 한 번만 보내는 일은 보낸 기록이 맡는다", () => {
  assert.ok(detectSpike(days([...QUIET, 600, 700]), NOW));
});

test("전날 기록이 있으면 이어지는 흐름이다", () => {
  assert.equal(previousDay("2026-09-14"), "2026-09-13");
  assert.equal(previousDay("2026-03-01"), "2026-02-28");
  assert.equal(isContinuation("2026-09-14", new Set(["2026-09-13"])), true);
  // 이틀 전 기록만 있으면 새 흐름이다 (사이에 평범한 날이 있었다)
  assert.equal(isContinuation("2026-09-14", new Set(["2026-09-12"])), false);
});

test("하루치가 오래전에 끝났으면(처음 켤 때 채운 옛 기록) 알리지 않는다", () => {
  const stale = days([...QUIET, 600], new Date(NOW.getTime() - 3 * D));
  assert.equal(detectSpike(stale, NOW), null);
});

test("직전 기록이 7일 미만이면 평소를 알 수 없어 알리지 않는다", () => {
  assert.equal(detectSpike(days([100, 100, 100, 100, 100, 100, 900]), NOW), null);
});

test("평소가 0명이면 1명으로 보고 계산하되 기준값은 0으로 남긴다", () => {
  const spike = detectSpike(days([...QUIET.map(() => 0), 400]), NOW);
  assert.ok(spike);
  assert.equal(spike.baseline, 0);
  assert.equal(spike.multiple, 400);
});

test("아직 끝나지 않은 하루는 보지 않는다", () => {
  const future = days([...QUIET, 600], new Date(NOW.getTime() + 5 * H));
  // 마지막 날이 아직 안 끝났으므로 그 전날(평범한 날)을 본다
  assert.equal(detectSpike(future, NOW), null);
});

// 급상승 하루: 9월 13일 0시(미국 서부) = 한국 9월 13일 오후 4시에 시작
const DAY_START = "2026-09-13T07:00:00.000Z";
const TODAY = "2026-09-15";
const rec = (capturedOn, capturedAt, views) => ({ capturedOn, capturedAt, views });
const media = (id, postedAt) => ({ id, permalink: `https://www.instagram.com/p/${id}/`, caption: null, mediaType: "IMAGE", productType: "FEED", postedAt });

test("가장 많이 늘어난 게시물은 그 하루가 시작되기 전 마지막 수집과 비교한다", () => {
  const history = new Map([
    // 9/13 9시(하루 시작 전), 9/14 9시(하루 도중), 9/15 9시(오늘)
    ["old", [rec(TODAY, "2026-09-15T00:00:00Z", 900), rec("2026-09-14", "2026-09-14T00:00:00Z", 850), rec("2026-09-13", "2026-09-13T00:00:00Z", 100)]],
    ["calm", [rec(TODAY, "2026-09-15T00:00:00Z", 500), rec("2026-09-14", "2026-09-14T00:00:00Z", 200), rec("2026-09-13", "2026-09-13T00:00:00Z", 190)]],
  ]);
  const top = pickTopGain([media("old", "2026-09-01T00:00:00Z"), media("calm", "2026-09-02T00:00:00Z")], history, DAY_START, TODAY);
  // 바로 전날과 비교했다면 calm(+300)을 짚었을 것이다
  assert.equal(top.media.id, "old");
  assert.equal(top.gained, 800);
  assert.equal(top.since, "2026-09-13T00:00:00Z");
});

test("기준 수집 뒤에 올린 새 게시물은 0회에서 시작한 것으로 센다", () => {
  const history = new Map([
    ["old", [rec(TODAY, "2026-09-15T00:00:00Z", 300), rec("2026-09-13", "2026-09-13T00:00:00Z", 100)]],
    // 9/13 오후 6시(한국)에 올려서 하루 시작 전 기록이 없다
    ["fresh", [rec(TODAY, "2026-09-15T00:00:00Z", 2500), rec("2026-09-14", "2026-09-14T00:00:00Z", 1800)]],
  ]);
  const top = pickTopGain([media("old", "2026-09-01T00:00:00Z"), media("fresh", "2026-09-13T09:00:00Z")], history, DAY_START, TODAY);
  assert.equal(top.media.id, "fresh");
  assert.equal(top.gained, 2500);
  assert.equal(top.since, "2026-09-13T09:00:00Z");
});

test("하루가 시작되기 전 수집이 하나도 없으면(처음 켠 직후) 짚지 않는다", () => {
  const history = new Map([["a", [rec(TODAY, "2026-09-15T00:00:00Z", 300), rec("2026-09-14", "2026-09-14T00:00:00Z", 100)]]]);
  assert.equal(pickTopGain([media("a", "2026-09-01T00:00:00Z")], history, DAY_START, TODAY), null);
});

test("오늘 숫자를 못 받은 게시물은 짚지 않는다", () => {
  const history = new Map([["a", [rec("2026-09-14", "2026-09-14T00:00:00Z", 999), rec("2026-09-13", "2026-09-13T00:00:00Z", 1)]]]);
  assert.equal(pickTopGain([media("a", "2026-09-01T00:00:00Z")], history, DAY_START, TODAY), null);
});
