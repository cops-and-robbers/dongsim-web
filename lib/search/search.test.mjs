import test from "node:test";
import assert from "node:assert/strict";
import { statusOf, localeOf, pathOf, originOf } from "./status.ts";
import { isBrandQuery } from "./config.ts";
import { indexNowBody } from "./indexnow.ts";
import { parseSitemap } from "./sitemap.ts";
import { buildSearchView, changes, performanceOf, weightedPosition } from "./view.ts";

const ok = { verdict: "PASS", coverageState: "Submitted and indexed", indexingState: "INDEXING_ALLOWED", pageFetchState: "SUCCESSFUL", robotsTxtState: "ALLOWED" };

test("판정 문장을 할 일이 다른 상태로 나눈다", () => {
  assert.equal(statusOf(ok).kind, "indexed");
  assert.equal(statusOf({ ...ok, verdict: "NEUTRAL", coverageState: "Crawled - currently not indexed" }).kind, "crawled");
  assert.equal(statusOf({ ...ok, verdict: "NEUTRAL", coverageState: "Discovered - currently not indexed", pageFetchState: "PAGE_FETCH_STATE_UNSPECIFIED" }).kind, "discovered");
  assert.equal(statusOf({ ...ok, verdict: "NEUTRAL", coverageState: "URL is unknown to Google", pageFetchState: "" }).kind, "unknown");
  assert.equal(statusOf({ ...ok, verdict: "NEUTRAL", coverageState: "Excluded by ‘noindex’ tag", indexingState: "BLOCKED_BY_META_TAG" }).kind, "excluded");
  assert.equal(statusOf({ ...ok, verdict: "NEUTRAL", coverageState: "Alternate page with proper canonical tag" }).kind, "excluded");
});

test("가져오기에 실패하면 사유 문장보다 먼저 오류로 본다", () => {
  const s = statusOf({ ...ok, verdict: "FAIL", coverageState: "Not found (404)", pageFetchState: "NOT_FOUND" });
  assert.deepEqual([s.kind, s.label], ["error", "찾을 수 없음(404)"]);
  assert.equal(statusOf({ ...ok, verdict: "FAIL", coverageState: "Server error (5xx)", pageFetchState: "" }).label, "서버 오류(5xx)");
  assert.equal(statusOf({ ...ok, robotsTxtState: "DISALLOWED", coverageState: "Blocked by robots.txt" }).kind, "error");
});

test("모르는 문장은 버리지 않고 그대로 보여 준다", () => {
  const s = statusOf({ ...ok, verdict: "NEUTRAL", coverageState: "Something new" });
  assert.deepEqual([s.kind, s.label], ["unknown", "Something new"]);
});

test("주소에서 언어, 경로, 출처를 읽는다", () => {
  assert.equal(localeOf("https://copsandrobbers.app/en/game"), "en");
  assert.equal(localeOf("https://copsandrobbers.app/ja"), "ja");
  assert.equal(localeOf("https://copsandrobbers.app/english"), "ko");
  assert.equal(pathOf("https://copsandrobbers.app/"), "/");
  assert.equal(pathOf("https://copsandrobbers.app/blog/a/"), "/blog/a");
  assert.equal(originOf("https://copsandrobbers.app/ja/blog/x"), "blog");
  assert.equal(originOf("https://copsandrobbers.app/en/g/22"), "meetup");
  assert.equal(originOf("https://copsandrobbers.app/team"), "page");
});

test("놀이 이름만으로는 앱 이름 검색으로 세지 않는다", () => {
  assert.equal(isBrandQuery("경찰과 도둑 앱"), true);
  assert.equal(isBrandQuery("경도앱 다운"), true);
  assert.equal(isBrandQuery("Cops and Robbers"), true);
  assert.equal(isBrandQuery("경찰과 도둑 규칙"), false);
  assert.equal(isBrandQuery("술래잡기 앱"), false);
});

test("IndexNow 에는 우리 사이트 주소만 중복 없이 보낸다", () => {
  const body = indexNowBody(["https://copsandrobbers.app/blog/a", "https://copsandrobbers.app/blog/a", "https://example.com/x", "주소 아님"], "abcdef12");
  assert.deepEqual(body.urlList, ["https://copsandrobbers.app/blog/a"]);
  assert.equal(body.host, "copsandrobbers.app");
  assert.equal(body.keyLocation, "https://copsandrobbers.app/indexnow-key.txt");
});

test("사이트맵에서 주소만 뽑는다", () => {
  const xml = `<?xml version="1.0"?><urlset><url><loc>https://copsandrobbers.app/</loc><lastmod>2026-11-01</lastmod></url><url><loc>https://copsandrobbers.app/blog/a&amp;b</loc></url></urlset>`;
  assert.deepEqual(parseSitemap(xml), ["https://copsandrobbers.app/", "https://copsandrobbers.app/blog/a&b"]);
});

const row = (day, url, coverage, extra = {}) => ({
  day,
  url,
  verdict: coverage.startsWith("Submitted") ? "PASS" : "NEUTRAL",
  coverage_state: coverage,
  indexing_state: "INDEXING_ALLOWED",
  page_fetch_state: "SUCCESSFUL",
  robots_txt_state: "ALLOWED",
  last_crawl_time: null,
  google_canonical: null,
  user_canonical: null,
  in_sitemap: true,
  crawled_as: "MOBILE",
  link: null,
  ...extra,
});

test("상태가 바뀐 날만 남긴다", () => {
  const u = "https://copsandrobbers.app/game";
  const h = changes([row("2026-11-03", u, "Crawled - currently not indexed"), row("2026-11-01", u, "Discovered - currently not indexed"), row("2026-11-02", u, "Discovered - currently not indexed")]);
  assert.deepEqual(h.map((x) => [x.day, x.text]), [["2026-11-01", "발견됨, 색인 안 됨"], ["2026-11-03", "크롤링됨, 색인 안 됨"]]);
});

test("평균 게재순위는 노출수로 가중한다", () => {
  assert.equal(weightedPosition([{ impressions: 9, position: 1 }, { impressions: 1, position: 11 }]), 2);
  assert.equal(weightedPosition([]), null);
});

const base = {
  today: "2026-11-20",
  actions: [],
  sitemaps: [{ day: "2026-11-20", path: "https://copsandrobbers.app/sitemap.xml", last_submitted: null, last_downloaded: null, is_pending: false, errors: 0, warnings: 0, submitted: 3 }],
  search: [],
  range: { start: "2026-10-24", end: "2026-11-19" },
  previous: { start: "2026-09-26", end: "2026-10-23" },
};

test("손댈 일부터 놓고, 사이트맵 주소 오류와 7일 넘은 새 페이지를 확인할 것에 올린다", () => {
  const home = "https://copsandrobbers.app/";
  const team = "https://copsandrobbers.app/en/team";
  const post = "https://copsandrobbers.app/blog/new";
  const v = buildSearchView({
    ...base,
    inspections: [
      row("2026-11-20", home, "Submitted and indexed"),
      row("2026-11-20", team, "Not found (404)", { verdict: "FAIL", page_fetch_state: "NOT_FOUND" }),
      row("2026-11-20", post, "Crawled - currently not indexed"),
      row("2026-11-13", home, "Crawled - currently not indexed"),
    ],
    tracking: [
      { url: post, origin: "blog", first_seen_at: "2026-11-10T03:00:00Z", tracked: true, notified_at: "2026-11-10T03:00:00Z", first_crawled_at: "2026-11-12T00:00:00Z", indexed_at: null, requested_at: null, requested_by: null },
    ],
  });
  assert.deepEqual(v.pages.map((p) => p.kind), ["error", "crawled", "indexed"]);
  assert.equal(v.counts.indexed, 1);
  assert.equal(v.indexedBefore, 0);
  assert.deepEqual(v.inbox.map((i) => i.level), ["urgent", "todo"]);
  assert.match(v.inbox[0].title, /팀 소개 \(영어\)/);
  assert.equal(v.newPages[0].stage, "crawled");
  assert.equal(v.newPages[0].stuck, true);
});

test("요청했다고 남긴 새 페이지는 다시 부르지 않는다", () => {
  const post = "https://copsandrobbers.app/blog/new";
  const v = buildSearchView({
    ...base,
    inspections: [row("2026-11-20", post, "Crawled - currently not indexed")],
    tracking: [{ url: post, origin: "blog", first_seen_at: "2026-11-10T03:00:00Z", tracked: true, notified_at: null, first_crawled_at: null, indexed_at: null, requested_at: "2026-11-18T00:00:00Z", requested_by: "찬빈" }],
  });
  assert.equal(v.inbox.length, 0);
  assert.equal(v.pages[0].requestedBy, "찬빈");
});

test("구글 판정이 이틀 넘게 끊기면 알린다", () => {
  const v = buildSearchView({ ...base, inspections: [row("2026-11-16", "https://copsandrobbers.app/", "Submitted and indexed")], tracking: [] });
  assert.match(v.inbox[0].title, /새 숫자를 못 받았어요/);
});

test("구글이 덜 채운 날만큼 이전 기간도 잘라 비교한다", () => {
  const total = (day, clicks) => ({ day, breakdown: "total", key: "", clicks, impressions: clicks * 10, position: 5 });
  const p = performanceOf(
    [total("2026-11-01", 3), total("2026-11-02", 4), total("2026-10-25", 1), total("2026-10-26", 2), total("2026-10-27", 9)],
    { start: "2026-11-01", end: "2026-11-03" },
    { start: "2026-10-25", end: "2026-10-27" },
  );
  assert.equal(p.freshThrough, "2026-11-02");
  assert.deepEqual(p.range, { start: "2026-11-01", end: "2026-11-02" });
  assert.deepEqual(p.previous, { start: "2026-10-25", end: "2026-10-26" });
  assert.equal(p.current.clicks, 7);
  assert.equal(p.before.clicks, 3);
});

test("검색어는 노출순, 8~20위와 앱 이름 검색을 표시한다", () => {
  const q = (key, impressions, position) => ({ day: "2026-11-01", breakdown: "query", key, clicks: 1, impressions, position });
  const p = performanceOf([q("경찰과 도둑 규칙", 30, 11), q("경찰과 도둑 앱", 70, 1.2)], { start: "2026-11-01", end: "2026-11-01" }, null);
  assert.deepEqual(p.queries.map((x) => [x.query, x.brand, x.nearTop]), [["경찰과 도둑 앱", true, false], ["경찰과 도둑 규칙", false, true]]);
  assert.deepEqual(p.brand, { clicks: 1, impressions: 70 });
});

test("그날 검사가 몇 개 실패해도 전날 판정으로 주소를 남긴다", () => {
  const a = "https://copsandrobbers.app/";
  const b = "https://copsandrobbers.app/en/team";
  const v = buildSearchView({
    ...base,
    inspections: [row("2026-11-19", a, "Submitted and indexed"), row("2026-11-19", b, "Not found (404)", { verdict: "FAIL", page_fetch_state: "NOT_FOUND" }), row("2026-11-20", a, "Submitted and indexed")],
    tracking: [],
  });
  assert.equal(v.total, 2);
  assert.equal(v.inbox[0].level, "urgent");
});

test("사흘 넘게 판정이 없는 주소는 뺀다", () => {
  const v = buildSearchView({
    ...base,
    inspections: [row("2026-11-16", "https://copsandrobbers.app/old", "Submitted and indexed"), row("2026-11-20", "https://copsandrobbers.app/", "Submitted and indexed")],
    tracking: [],
  });
  assert.deepEqual(v.pages.map((p) => p.path), ["/"]);
});

test("새 페이지의 나이는 한국 달력 날짜로 센다", () => {
  const post = "https://copsandrobbers.app/blog/new";
  const mk = (first) =>
    buildSearchView({
      ...base,
      today: "2026-11-11",
      inspections: [row("2026-11-11", post, "Crawled - currently not indexed")],
      tracking: [{ url: post, origin: "blog", first_seen_at: first, tracked: true, notified_at: null, first_crawled_at: null, indexed_at: null, requested_at: null, requested_by: null }],
    }).newPages[0];
  assert.equal(mk("2026-11-10T14:00:00Z").ageDays, 1); // 한국 11월 10일 23시에 본 주소는 다음 날 1일째
  assert.equal(mk("2026-11-10T16:00:00Z").ageDays, 0); // 한국 11월 11일 01시는 오늘
  assert.equal(mk("2026-11-04T05:00:00Z").ageDays, 7);
  assert.equal(mk("2026-11-04T05:00:00Z").stuck, true);
});

test("주소 대신 사람이 부르는 이름을 쓴다", async () => {
  const { pageName } = await import("./names.ts");
  assert.equal(pageName("/", "ko"), "홈");
  assert.equal(pageName("/en/game", "en"), "하는 법");
  assert.equal(pageName("/blog/honey-tips", "ko", new Map([["ko/honey-tips", "경찰과 도둑 총정리"]])), "경찰과 도둑 총정리");
  assert.equal(pageName("/blog/new-post", "ko"), "new post");
  assert.equal(pageName("/ja/g/23", "ja"), "모집글 23");
  assert.equal(pageName("/somewhere", "ko"), "/somewhere");
});
