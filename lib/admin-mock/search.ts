// 로컬에서 지표 "검색" 탭(#309)을 만져 보는 가짜 응답. dev 에서는 MSW 가 이 값으로 답해 서치 콘솔과 실제 기록에 닿지 않는다.
// 주소는 실제 사이트맵(2026-11-11)을 쓰고, 판정과 숫자는 화면 모양을 보려고 만든 값이다.
// 진짜 계산(buildSearchView)을 그대로 거쳐 화면과 서버가 어긋나지 않게 한다.
import { buildSearchView, type InspectionRow, type SearchRow, type TrackingRow, type ActionRow } from "@/lib/search/view";
import type { SearchResponse } from "@/app/api/admin/search/route";

const SITE = "https://copsandrobbers.app";
const DAY = 86_400_000;
const addDays = (ymd: string, n: number) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

type Plan = { path: string; coverage: string; crawlAgo: number | null; impressions: number; clicks: number; position: number; fetch?: string; fromDay?: number };

const PLAN: Plan[] = [
  { path: "/", coverage: "Submitted and indexed", crawlAgo: 1, impressions: 92, clicks: 19, position: 2.1 },
  { path: "/en", coverage: "Submitted and indexed", crawlAgo: 3, impressions: 14, clicks: 2, position: 6.4 },
  { path: "/ja", coverage: "Submitted and indexed", crawlAgo: 2, impressions: 21, clicks: 3, position: 5.2 },
  { path: "/blog/honey-tips", coverage: "Submitted and indexed", crawlAgo: 4, impressions: 48, clicks: 7, position: 7.9 },
  { path: "/blog/origin-story", coverage: "Submitted and indexed", crawlAgo: 9, impressions: 12, clicks: 1, position: 12.4 },
  { path: "/ja/blog/keidoro-rules", coverage: "Submitted and indexed", crawlAgo: 6, impressions: 33, clicks: 4, position: 9.6, fromDay: 9 },
  { path: "/ja/blog/korea-keidoro", coverage: "Submitted and indexed", crawlAgo: 5, impressions: 9, clicks: 1, position: 14.8 },
  { path: "/team", coverage: "Submitted and indexed", crawlAgo: 7, impressions: 6, clicks: 1, position: 8.3 },
  { path: "/online", coverage: "Submitted and indexed", crawlAgo: 2, impressions: 11, clicks: 2, position: 4.4 },
  { path: "/game", coverage: "Crawled - currently not indexed", crawlAgo: 1, impressions: 21, clicks: 2, position: 11.3 },
  { path: "/en/game", coverage: "Crawled - currently not indexed", crawlAgo: 2, impressions: 4, clicks: 0, position: 18.2 },
  { path: "/ja/game", coverage: "Crawled - currently not indexed", crawlAgo: 3, impressions: 2, clicks: 0, position: 21.5 },
  { path: "/blog", coverage: "Crawled - currently not indexed", crawlAgo: 5, impressions: 3, clicks: 0, position: 15.1 },
  { path: "/blog/joining-the-team", coverage: "Crawled - currently not indexed", crawlAgo: 8, impressions: 0, clicks: 0, position: 0, fromDay: 12 },
  { path: "/blog/seoul-game-town", coverage: "Crawled - currently not indexed", crawlAgo: 10, impressions: 5, clicks: 0, position: 16.7 },
  { path: "/blog/innocence-of-child", coverage: "Crawled - currently not indexed", crawlAgo: 12, impressions: 0, clicks: 0, position: 0 },
  { path: "/blog/out-in-the-world", coverage: "Crawled - currently not indexed", crawlAgo: 11, impressions: 1, clicks: 0, position: 22.0 },
  { path: "/blog/designer-first-footprint", coverage: "Crawled - currently not indexed", crawlAgo: 13, impressions: 0, clicks: 0, position: 0 },
  { path: "/blog/startup-story", coverage: "Crawled - currently not indexed", crawlAgo: 9, impressions: 2, clicks: 0, position: 19.4 },
  { path: "/blog/being-tricked-by-my-team", coverage: "Crawled - currently not indexed", crawlAgo: 14, impressions: 0, clicks: 0, position: 0 },
  { path: "/ja/blog/keidoro-group-guide", coverage: "Crawled - currently not indexed", crawlAgo: 6, impressions: 4, clicks: 0, position: 13.0 },
  { path: "/ja/blog/keidoro-dorokei-difference", coverage: "URL is unknown to Google", crawlAgo: null, impressions: 0, clicks: 0, position: 0, fromDay: 0 },
  { path: "/team/members", coverage: "Crawled - currently not indexed", crawlAgo: 15, impressions: 0, clicks: 0, position: 0 },
  { path: "/en/blog", coverage: "Crawled - currently not indexed", crawlAgo: 16, impressions: 0, clicks: 0, position: 0 },
  { path: "/community", coverage: "Discovered - currently not indexed", crawlAgo: null, impressions: 0, clicks: 0, position: 0 },
  { path: "/en/community", coverage: "Discovered - currently not indexed", crawlAgo: null, impressions: 0, clicks: 0, position: 0 },
  { path: "/ja/community", coverage: "Discovered - currently not indexed", crawlAgo: null, impressions: 0, clicks: 0, position: 0 },
  { path: "/ja/blog", coverage: "Discovered - currently not indexed", crawlAgo: null, impressions: 0, clicks: 0, position: 0 },
  { path: "/ja/g/23", coverage: "URL is unknown to Google", crawlAgo: null, impressions: 0, clicks: 0, position: 0, fromDay: 2 },
  { path: "/en/team", coverage: "Not found (404)", crawlAgo: 1, impressions: 3, clicks: 0, position: 9.0, fetch: "NOT_FOUND" },
  { path: "/ja/team", coverage: "Submitted and indexed", crawlAgo: 4, impressions: 2, clicks: 0, position: 7.7 },
];

const QUERIES: [string, number, number, number][] = [
  ["경찰과 도둑 앱", 70, 21, 1.2],
  ["경도 앱", 40, 9, 1.8],
  ["경찰과 도둑 게임 규칙", 30, 2, 11.3],
  ["술래잡기 앱", 22, 0, 18.6],
  ["ケイドロ ルール", 18, 2, 9.4],
  ["경도 규칙", 15, 1, 8.7],
  ["밖에서 하는 단체 게임", 12, 0, 24.1],
  ["copsandrobbers", 6, 3, 1.0],
];

// 실제 글 제목(2026-11-11 사이트에서 읽음)
const TITLES = new Map([
  ["ko/honey-tips", "경찰과 도둑 총정리"],
  ["ko/origin-story", "나는 그저 경도가 하고 싶었다"],
  ["ko/joining-the-team", "“아아, 이건 태초의 이야기다.”"],
  ["ko/seoul-game-town", "서울게임타운, 우연을 기회로 바꾸다"],
  ["ko/innocence-of-child", "여러분의 동심은 무엇인가요?"],
  ["ko/out-in-the-world", "경찰과도둑을 세상에 처음 내보낸 날"],
  ["ko/designer-first-footprint", "교환학생 꿀팁 알려주러 갔다가 경도 디자이너로 납치당한 썰"],
  ["ko/startup-story", "경도로 창업하게 될 줄은 우리 엄마도 몰랐다"],
  ["ko/being-tricked-by-my-team", "“아아, 이건 내가 팀원들에게 속아 넘어간 이야기다.”"],
  ["ja/keidoro-rules", "ケイドロの基本ルールと、大人も盛り上がる遊び方"],
  ["ja/korea-keidoro", "韓国にもケイドロがある。「경도」が大人の間で再び広がっている"],
  ["ja/keidoro-group-guide", "大人数でケイドロをするときの準備 - 範囲・人数・時間の決め方"],
  ["ja/keidoro-dorokei-difference", "「ケイドロ」と「ドロケイ」、何が違う？"],
]);

let requested = new Map<string, { at: string; by: string }>();

export function mockSearch(q: URLSearchParams): SearchResponse {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const from = q.get("from") ?? addDays(today, -28);
  const to = q.get("to") ?? addDays(today, -1);
  const pfrom = q.get("pfrom");
  const pto = q.get("pto");
  const iso = (ymd: string, h = 3) => `${ymd}T0${h}:00:00Z`;

  const inspections: InspectionRow[] = [];
  for (const p of PLAN) {
    for (let back = 13; back >= 0; back--) {
      const day = addDays(today, -back);
      // 일주일 전엔 덜 올라가 있었다: 지금 색인된 것 중 몇 개는 그때 "크롤링됨"
      const earlier = back >= 7 && ["/blog/origin-story", "/ja/blog/korea-keidoro", "/online"].includes(p.path);
      if (p.fromDay !== undefined && back > p.fromDay) continue;
      const coverage = earlier ? "Crawled - currently not indexed" : p.coverage;
      inspections.push({
        day,
        url: `${SITE}${p.path}`,
        verdict: coverage.startsWith("Submitted") ? "PASS" : coverage.startsWith("Not found") ? "FAIL" : "NEUTRAL",
        coverage_state: coverage,
        indexing_state: "INDEXING_ALLOWED",
        page_fetch_state: p.fetch && !earlier && back < 2 ? p.fetch : p.crawlAgo === null ? "PAGE_FETCH_STATE_UNSPECIFIED" : "SUCCESSFUL",
        robots_txt_state: "ALLOWED",
        last_crawl_time: p.crawlAgo === null ? null : iso(addDays(today, -p.crawlAgo - back)),
        google_canonical: p.path === "/blog" && back === 0 ? `${SITE}/blog?page=1` : p.crawlAgo === null ? null : `${SITE}${p.path}`,
        user_canonical: `${SITE}${p.path}`,
        in_sitemap: true,
        crawled_as: p.crawlAgo === null ? null : "MOBILE",
        link: null,
      });
    }
  }
  // 404 주소는 이틀 전까지 정상이었다
  for (const r of inspections) if (r.url.endsWith("/en/team") && r.page_fetch_state !== "NOT_FOUND") Object.assign(r, { coverage_state: "Submitted and indexed", verdict: "PASS" });

  const tracking: TrackingRow[] = [
    { url: `${SITE}/ja/blog/keidoro-rules`, origin: "blog", first_seen_at: iso(addDays(today, -9)), tracked: true, notified_at: iso(addDays(today, -9)), first_crawled_at: iso(addDays(today, -7)), indexed_at: iso(addDays(today, -4)), requested_at: null, requested_by: null },
    { url: `${SITE}/blog/joining-the-team`, origin: "blog", first_seen_at: iso(addDays(today, -12)), tracked: true, notified_at: iso(addDays(today, -12)), first_crawled_at: iso(addDays(today, -10)), indexed_at: null, requested_at: null, requested_by: null },
    { url: `${SITE}/ja/blog/keidoro-dorokei-difference`, origin: "blog", first_seen_at: iso(addDays(today, -1)), tracked: true, notified_at: iso(addDays(today, -1)), first_crawled_at: null, indexed_at: null, requested_at: null, requested_by: null },
    // 모집글은 알리기만 하고 따라가지 않는다
    { url: `${SITE}/ja/g/23`, origin: "meetup", first_seen_at: iso(addDays(today, -2)), tracked: false, notified_at: iso(addDays(today, -2)), first_crawled_at: null, indexed_at: null, requested_at: null, requested_by: null },
  ].map((t) => {
    const r = requested.get(t.url);
    return r ? { ...t, requested_at: r.at, requested_by: r.by } : t;
  });

  const actions: ActionRow[] = [
    { action: "sitemap", urls: [`${SITE}/ja/blog/keidoro-rules`], status: "done", actor: "블로그 동기화", created_at: iso(addDays(today, -9)) },
    { action: "indexnow", urls: [`${SITE}/ja/blog/keidoro-rules`], status: "done", actor: "블로그 동기화", created_at: iso(addDays(today, -9)) },
    { action: "sitemap", urls: [`${SITE}/blog/joining-the-team`], status: "done", actor: "블로그 동기화", created_at: iso(addDays(today, -12)) },
    { action: "indexnow", urls: [`${SITE}/blog/joining-the-team`], status: "done", actor: "블로그 동기화", created_at: iso(addDays(today, -12)) },
    ...[...requested.entries()].map(([url, r]) => ({ action: "requested", urls: [url], status: "done", actor: r.by, created_at: r.at })),
  ];

  // 검색 실적: 구글은 3일 늦다. 날마다 고르게 나누고 주말에 조금 더
  const fresh = addDays(today, -3);
  const search: SearchRow[] = [];
  const start = pfrom && pfrom < from ? pfrom : from;
  // 작은 숫자를 날마다 반올림하면 대부분 0 이 된다. 남는 몫을 다음 날로 넘겨 기간 합이 계획과 맞게 한다
  const carry = new Map<string, number>();
  const take = (key: string, amount: number) => {
    const v = (carry.get(key) ?? 0) + amount;
    const n = Math.floor(v);
    carry.set(key, v - n);
    return n;
  };
  for (let d = start; d <= to && d <= fresh; d = addDays(d, 1)) {
    const weekend = [0, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay());
    const scale = ((d >= from ? 1 : 0.8) * (weekend ? 1.4 : 0.85)) / 28;
    let clicks = 0;
    let impressions = 0;
    for (const p of PLAN) {
      const i = take(`i${p.path}`, p.impressions * scale);
      const c = Math.min(i, take(`c${p.path}`, p.clicks * scale));
      if (i === 0) continue;
      search.push({ day: d, breakdown: "page", key: `${SITE}${p.path}`, clicks: c, impressions: i, position: p.position });
      clicks += c;
      impressions += i;
    }
    for (const [query, imp, clk, position] of QUERIES) {
      const i = take(`qi${query}`, imp * scale);
      const c = Math.min(i, take(`qc${query}`, clk * scale));
      if (i === 0) continue;
      search.push({ day: d, breakdown: "query", key: query, clicks: c, impressions: i, position });
    }
    search.push({ day: d, breakdown: "total", key: "", clicks, impressions, position: 6.8 });
  }

  const view = buildSearchView({
    today,
    inspections,
    tracking,
    actions,
    sitemaps: [{ day: today, path: `${SITE}/sitemap.xml`, last_submitted: iso(addDays(today, -1)), last_downloaded: iso(addDays(today, -1), 9), is_pending: false, errors: 0, warnings: 0, submitted: 31 }],
    search,
    range: { start: from, end: to },
    previous: pfrom && pto ? { start: pfrom, end: pto } : null,
    titles: TITLES,
  });
  return { ...view, writable: true };
}

export function mockMarkRequested(url: string): { status: number; body: unknown } {
  requested.set(url, { at: new Date().toISOString(), by: "로컬 관리자" });
  return { status: 200, body: { ok: true } };
}

export function mockResetSearch() {
  requested = new Map();
}
