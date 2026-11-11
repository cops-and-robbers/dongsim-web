/**
 * 지표 "검색" 탭에 내려줄 모양을 저장한 줄로 만든다 (#309). DB 를 읽지 않는 순수 함수라 테스트한다.
 *
 * 화면 순서(docs/search-indexing.md): 확인할 것 → 지금 상태 → 새 페이지 → 전체 페이지 → 기간 실적.
 */

import { KIND_ORDER, localeOf, pathOf, statusOf, type Kind, type Locale } from "./status.ts";
import { NEAR_PAGE_ONE, NUDGE_DAYS, TRACK_DAYS, isBrandQuery } from "./config.ts";
import { pageName } from "./names.ts";

export type InspectionRow = {
  day: string;
  url: string;
  verdict: string;
  coverage_state: string;
  indexing_state: string;
  page_fetch_state: string;
  robots_txt_state: string;
  last_crawl_time: string | null;
  google_canonical: string | null;
  user_canonical: string | null;
  in_sitemap: boolean;
  crawled_as: string | null;
  link: string | null;
};

export type TrackingRow = {
  url: string;
  origin: string;
  first_seen_at: string;
  tracked: boolean;
  notified_at: string | null;
  first_crawled_at: string | null;
  indexed_at: string | null;
  requested_at: string | null;
  requested_by: string | null;
};

export type ActionRow = { action: string; urls: string[]; status: string; actor: string; created_at: string };
export type SitemapRow = { day: string; path: string; last_submitted: string | null; last_downloaded: string | null; is_pending: boolean; errors: number; warnings: number; submitted: number };
export type SearchRow = { day: string; breakdown: string; key: string; clicks: number; impressions: number; position: number };

export type Level = "urgent" | "todo" | "info";
export type InboxItem = { level: Level; title: string; detail: string; paths: string[]; focus: "pages" | "new" };

export type HistoryEvent = { day: string; text: string; kind?: Kind; by?: string };

export type PageRow = {
  url: string;
  path: string;
  /** 사람이 부르는 이름. 블로그는 글 제목 */
  name: string;
  locale: Locale;
  kind: Kind;
  label: string;
  meaning: string;
  lastCrawl: string | null;
  inSitemap: boolean;
  googleCanonical: string | null;
  userCanonical: string | null;
  crawledAs: string | null;
  fetchState: string;
  indexingState: string;
  robotsState: string;
  link: string | null;
  clicks: number;
  impressions: number;
  requestedAt: string | null;
  requestedBy: string | null;
  history: HistoryEvent[];
};

export type Stage = "found" | "notified" | "crawled" | "indexed" | "shown";
export type NewPage = {
  url: string;
  path: string;
  name: string;
  locale: Locale;
  origin: string;
  firstSeen: string;
  ageDays: number;
  stage: Stage;
  notifiedAt: string | null;
  crawledAt: string | null;
  indexedAt: string | null;
  impressions: number;
  kind: Kind | null;
  label: string | null;
  /** 7일이 지나도 안 올라가 사람이 볼 차례 */
  stuck: boolean;
  requestedAt: string | null;
};

export type Totals = { clicks: number; impressions: number; position: number | null };
export type QueryRow = { query: string; clicks: number; impressions: number; position: number; brand: boolean; nearTop: boolean };

export type SearchView = {
  /** 마지막으로 구글 판정을 받은 날(한국 날짜). 없으면 아직 수집 전 */
  checkedOn: string | null;
  counts: Record<Kind, number>;
  total: number;
  /** 7일 전 색인된 수. 그날 기록이 없으면 null */
  indexedBefore: number | null;
  sitemap: { path: string; lastDownloaded: string | null; lastSubmitted: string | null; errors: number; warnings: number; submitted: number; isPending: boolean } | null;
  inbox: InboxItem[];
  newPages: NewPage[];
  pages: PageRow[];
  performance: {
    /** 구글이 숫자를 채운 마지막 날. 2~3일 늦다 */
    freshThrough: string | null;
    range: { start: string; end: string };
    previous: { start: string; end: string } | null;
    current: Totals;
    before: Totals | null;
    daily: { day: string; clicks: number; impressions: number }[];
    /** 비교 기간의 날마다 값. 이번 기간 n번째 날과 같은 자리에 둔다(차트 비교선) */
    previousDaily: { clicks: number; impressions: number }[] | null;
    queries: QueryRow[];
    brand: { clicks: number; impressions: number };
    other: { clicks: number; impressions: number };
  };
};

const DAY = 86_400_000;
/** 처음 본 날부터 오늘까지 달력으로 며칠. 시각이 아니라 한국 날짜로 센다(11월 3일에 본 주소는 11월 11일에 8일) */
const daysBetween = (fromIso: string, toYmd: string) => Math.round((Date.parse(`${toYmd}T00:00:00Z`) - Date.parse(`${seoulDay(fromIso)}T00:00:00Z`)) / DAY);
const addDays = (ymd: string, n: number) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const seoulDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso));

/** 날짜순 판정에서 상태가 바뀐 날만 남긴다 */
export function changes(rows: InspectionRow[]): HistoryEvent[] {
  const out: HistoryEvent[] = [];
  let last: string | null = null;
  for (const r of [...rows].sort((a, b) => a.day.localeCompare(b.day))) {
    const s = statusOf(toInspection(r));
    if (s.label !== last) out.push({ day: r.day, text: s.label, kind: s.kind });
    last = s.label;
  }
  return out;
}

const toInspection = (r: InspectionRow) => ({
  verdict: r.verdict,
  coverageState: r.coverage_state,
  indexingState: r.indexing_state,
  pageFetchState: r.page_fetch_state,
  robotsTxtState: r.robots_txt_state,
});

/** 노출수로 가중한 평균 게재순위. 노출이 없으면 null */
export function weightedPosition(rows: { impressions: number; position: number }[]): number | null {
  const imp = rows.reduce((a, r) => a + r.impressions, 0);
  if (imp === 0) return null;
  return rows.reduce((a, r) => a + r.position * r.impressions, 0) / imp;
}

function totals(rows: SearchRow[]): Totals {
  return {
    clicks: rows.reduce((a, r) => a + r.clicks, 0),
    impressions: rows.reduce((a, r) => a + r.impressions, 0),
    position: weightedPosition(rows),
  };
}

const ACTION_TEXT: Record<string, string> = {
  sitemap: "구글에 사이트맵 제출",
  indexnow: "빙·네이버 등에 알림(IndexNow)",
  requested: "서치 콘솔에서 색인 요청",
};

export function buildSearchView(input: {
  today: string;
  inspections: InspectionRow[];
  tracking: TrackingRow[];
  actions: ActionRow[];
  sitemaps: SitemapRow[];
  search: SearchRow[];
  range: { start: string; end: string };
  previous: { start: string; end: string } | null;
  /** 블로그 글 제목. 키는 "언어/슬러그" */
  titles?: Map<string, string>;
}): SearchView {
  const { today, inspections, tracking, actions } = input;
  const checkedOn = inspections.reduce<string | null>((m, r) => (!m || r.day > m ? r.day : m), null);
  // 주소마다 가장 최근 판정을 쓴다. 그날 검사 몇 개가 실패해도 그 주소가 화면에서 사라지지 않게,
  // 다만 사흘 넘게 판정이 없는 주소(사이트맵에서 빠진 주소)는 뺀다
  const recentFrom = checkedOn ? addDays(checkedOn, -2) : "";
  const latestByUrl = new Map<string, InspectionRow>();
  for (const r of inspections) {
    if (r.day < recentFrom) continue;
    const cur = latestByUrl.get(r.url);
    if (!cur || r.day > cur.day) latestByUrl.set(r.url, r);
  }
  const latest = [...latestByUrl.values()];
  const byUrl = new Map<string, InspectionRow[]>();
  for (const r of inspections) byUrl.set(r.url, [...(byUrl.get(r.url) ?? []), r]);
  const track = new Map(tracking.map((t) => [t.url, t]));

  // 기간 안의 페이지별 실적. 검색 실적의 page 키는 전체 주소다
  const perf = new Map<string, { clicks: number; impressions: number }>();
  for (const r of input.search) {
    if (r.breakdown !== "page" || r.day < input.range.start || r.day > input.range.end) continue;
    const p = perf.get(r.key) ?? { clicks: 0, impressions: 0 };
    perf.set(r.key, { clicks: p.clicks + r.clicks, impressions: p.impressions + r.impressions });
  }

  const pages: PageRow[] = latest.map((r) => {
    const s = statusOf(toInspection(r));
    const t = track.get(r.url);
    const events: HistoryEvent[] = [
      ...changes(byUrl.get(r.url) ?? []),
      ...actions
        .filter((a) => a.status === "done" && a.urls.includes(r.url))
        .map((a) => ({ day: seoulDay(a.created_at), text: ACTION_TEXT[a.action] ?? a.action, by: a.actor })),
    ].sort((a, b) => a.day.localeCompare(b.day));
    return {
      url: r.url,
      path: pathOf(r.url),
      name: pageName(pathOf(r.url), localeOf(r.url), input.titles),
      locale: localeOf(r.url),
      kind: s.kind,
      label: s.label,
      meaning: s.meaning,
      lastCrawl: r.last_crawl_time,
      inSitemap: r.in_sitemap,
      googleCanonical: r.google_canonical,
      userCanonical: r.user_canonical,
      crawledAs: r.crawled_as,
      fetchState: r.page_fetch_state,
      indexingState: r.indexing_state,
      robotsState: r.robots_txt_state,
      link: r.link,
      clicks: perf.get(r.url)?.clicks ?? 0,
      impressions: perf.get(r.url)?.impressions ?? 0,
      requestedAt: t?.requested_at ?? null,
      requestedBy: t?.requested_by ?? null,
      history: events,
    };
  });
  // 손댈 일부터, 같은 상태 안에서는 노출이 많은 순
  pages.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || b.impressions - a.impressions || a.path.localeCompare(b.path));

  const counts = Object.fromEntries(KIND_ORDER.map((k) => [k, 0])) as Record<Kind, number>;
  for (const p of pages) counts[p.kind]++;

  const weekAgo = checkedOn ? addDays(checkedOn, -7) : null;
  const weekRows = weekAgo ? inspections.filter((r) => r.day === weekAgo) : [];
  const indexedBefore = weekRows.length > 0 ? weekRows.filter((r) => statusOf(toInspection(r)).kind === "indexed").length : null;

  const pageOf = new Map(pages.map((p) => [p.url, p]));
  const newPages: NewPage[] = tracking
    .filter((t) => t.tracked && daysBetween(t.first_seen_at, today) <= TRACK_DAYS)
    .map((t) => {
      const p = pageOf.get(t.url);
      const impressions = perf.get(t.url)?.impressions ?? 0;
      const indexed = !!t.indexed_at || p?.kind === "indexed";
      const stage: Stage = indexed && impressions > 0 ? "shown" : indexed ? "indexed" : t.first_crawled_at ? "crawled" : t.notified_at ? "notified" : "found";
      const ageDays = Math.max(0, daysBetween(t.first_seen_at, today));
      return {
        url: t.url,
        path: pathOf(t.url),
        name: pageName(pathOf(t.url), localeOf(t.url), input.titles),
        locale: localeOf(t.url),
        origin: t.origin,
        firstSeen: t.first_seen_at,
        ageDays,
        stage,
        notifiedAt: t.notified_at,
        crawledAt: t.first_crawled_at,
        indexedAt: t.indexed_at,
        impressions,
        kind: p?.kind ?? null,
        label: p?.label ?? null,
        stuck: !indexed && ageDays >= NUDGE_DAYS,
        requestedAt: t.requested_at,
      };
    })
    .sort((a, b) => Number(b.stuck) - Number(a.stuck) || b.firstSeen.localeCompare(a.firstSeen));

  const latestSitemapDay = input.sitemaps.reduce<string | null>((m, r) => (!m || r.day > m ? r.day : m), null);
  const sm = input.sitemaps.find((r) => r.day === latestSitemapDay && r.path.endsWith("/sitemap.xml")) ?? input.sitemaps.find((r) => r.day === latestSitemapDay) ?? null;
  const sitemap = sm
    ? { path: sm.path, lastDownloaded: sm.last_downloaded, lastSubmitted: sm.last_submitted, errors: sm.errors, warnings: sm.warnings, submitted: sm.submitted, isPending: sm.is_pending }
    : null;

  return {
    checkedOn,
    counts,
    total: pages.length,
    indexedBefore,
    sitemap,
    inbox: inboxOf({ today, checkedOn, pages, newPages, tracking, sitemap }),
    newPages,
    pages,
    performance: performanceOf(input.search, input.range, input.previous),
  };
}

export function inboxOf(x: {
  today: string;
  checkedOn: string | null;
  pages: PageRow[];
  newPages: NewPage[];
  tracking: TrackingRow[];
  sitemap: SearchView["sitemap"];
}): InboxItem[] {
  const out: InboxItem[] = [];
  const broken = x.pages.filter((p) => p.kind === "error" && p.inSitemap);
  if (broken.length > 0) {
    const first = broken[0];
    const since = first.history.filter((h) => h.kind).at(-1)?.day;
    out.push({
      level: "urgent",
      title: broken.length === 1 ? `${first.name}${first.locale === "ko" ? "" : ` (${first.locale === "en" ? "영어" : "일본어"})`} 페이지에 오류가 있어요` : `페이지 ${broken.length}개에 오류가 있어요`,
      detail: broken.length === 1 ? `${first.label}${since ? `, ${md(since)}에 처음 확인했어요` : ""}` : broken.slice(0, 3).map((p) => p.name).join(", "),
      paths: broken.map((p) => p.path),
      focus: "pages",
    });
  }
  if (x.sitemap && x.sitemap.errors > 0) {
    out.push({ level: "urgent", title: "사이트맵에 오류가 있어요", detail: `오류 ${x.sitemap.errors}개예요. 서치 콘솔 사이트맵 화면에서 확인해요.`, paths: [], focus: "pages" });
  }
  // 수집이 멈추면 아래 숫자가 모두 낡는다. 이틀 넘게 못 받았으면 알린다
  if (x.checkedOn && x.checkedOn < addDays(x.today, -2)) {
    out.push({ level: "todo", title: "이틀 넘게 새 숫자를 못 받았어요", detail: `${md(x.checkedOn)}까지 받은 숫자예요. 수집 기록을 확인해요.`, paths: [], focus: "pages" });
  }
  const stuck = x.newPages.filter((p) => p.stuck && !p.requestedAt);
  if (stuck.length > 0) {
    out.push({
      level: "todo",
      title: `새 페이지 ${stuck.length}개가 색인되지 않았어요`,
      detail: `${NUDGE_DAYS}일이 넘었어요. 서치 콘솔에서 색인을 요청할 수 있어요.`,
      paths: stuck.map((p) => p.path),
      focus: "new",
    });
  }
  const tracked = new Map(x.tracking.map((t) => [t.url, t]));
  const late = x.pages.filter((p) => {
    const t = tracked.get(p.url);
    return !!t?.tracked && p.kind !== "indexed" && p.kind !== "excluded" && daysBetween(t.first_seen_at, x.today) > TRACK_DAYS;
  });
  if (late.length > 0) {
    out.push({ level: "info", title: `${TRACK_DAYS}일 넘게 색인 안 된 페이지가 ${late.length}개예요`, detail: "내용을 보강하거나 다른 곳에서 링크를 걸어 볼 후보예요.", paths: late.map((p) => p.path), focus: "pages" });
  }
  return out;
}

function md(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}월 ${d}일`;
}

export function performanceOf(rows: SearchRow[], range: { start: string; end: string }, previous: { start: string; end: string } | null): SearchView["performance"] {
  const total = rows.filter((r) => r.breakdown === "total");
  const freshThrough = total.reduce<string | null>((m, r) => (!m || r.day > m ? r.day : m), null);
  // 구글은 2~3일 늦게 채운다. 이번 기간이 덜 찬 만큼 이전 기간도 잘라야 공평하게 비교한다
  const end = freshThrough && freshThrough < range.end ? freshThrough : range.end;
  const missing = Math.max(0, Math.round((Date.parse(`${range.end}T00:00:00Z`) - Date.parse(`${end}T00:00:00Z`)) / DAY));
  const prevEnd = previous ? addDays(previous.end, -missing) : null;
  const inRange = (r: SearchRow, s: string, e: string) => r.day >= s && r.day <= e;
  const cur = total.filter((r) => inRange(r, range.start, end));
  const prev = previous && prevEnd ? total.filter((r) => inRange(r, previous.start, prevEnd)) : null;

  const byQuery = new Map<string, SearchRow[]>();
  for (const r of rows) if (r.breakdown === "query" && inRange(r, range.start, range.end)) byQuery.set(r.key, [...(byQuery.get(r.key) ?? []), r]);
  const queries: QueryRow[] = [...byQuery.entries()]
    .map(([query, rs]) => {
      const t = totals(rs);
      const position = t.position ?? 0;
      return { query, clicks: t.clicks, impressions: t.impressions, position, brand: isBrandQuery(query), nearTop: position >= NEAR_PAGE_ONE.from && position <= NEAR_PAGE_ONE.to };
    })
    .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks)
    .slice(0, 100);
  const sum = (qs: QueryRow[]) => ({ clicks: qs.reduce((a, q) => a + q.clicks, 0), impressions: qs.reduce((a, q) => a + q.impressions, 0) });
  // 앱 이름 검색과 그 밖의 합은 화면에 보이는 100개가 아니라 받은 검색어 전부로 낸다
  const allQueries = [...byQuery.entries()].map(([query, rs]) => ({ query, ...totals(rs) }));
  const sumAll = (brand: boolean) => sum(allQueries.filter((q) => isBrandQuery(q.query) === brand).map((q) => ({ ...q, position: 0, brand, nearTop: false })));

  const byDay = new Map(cur.map((r) => [r.day, r]));
  const daily: { day: string; clicks: number; impressions: number }[] = [];
  for (let d = range.start; d <= end; d = addDays(d, 1)) daily.push({ day: d, clicks: byDay.get(d)?.clicks ?? 0, impressions: byDay.get(d)?.impressions ?? 0 });

  const prevByDay = new Map((prev ?? []).map((r) => [r.day, r]));
  const previousDaily =
    previous && prevEnd
      ? daily.map((_, i) => {
          const r = prevByDay.get(addDays(previous.start, i));
          return { clicks: r?.clicks ?? 0, impressions: r?.impressions ?? 0 };
        })
      : null;

  return {
    freshThrough,
    previousDaily,
    range: { start: range.start, end },
    previous: previous && prevEnd ? { start: previous.start, end: prevEnd } : null,
    current: totals(cur),
    before: prev ? totals(prev) : null,
    daily,
    queries,
    brand: sumAll(true),
    other: sumAll(false),
  };
}
