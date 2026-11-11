/**
 * 검색 색인 현황 매일 수집 (#309). GitHub Actions(metrics-collect.yml)가 05:43 에 /api/metrics/gsc 를 부른다.
 *
 * 1. 사이트맵 주소와 최근 검색에 나온 주소, 따라가는 주소를 구글 URL 검사로 판정받아 오늘 날짜로 남긴다
 * 2. 검색 실적(전체, 페이지, 검색어, 나라, 기기)을 최근 10일 다시 받는다. 구글이 2~3일 늦게 확정한다
 * 3. 사이트맵 상태를 남긴다
 * 4. 사이트맵을 어제까지 본 주소와 비교해 새 주소를 찾고, 검색엔진에 알린 뒤 따라가기 시작한다.
 *    처음 돌 때 있던 주소는 "추적 전부터 있던 주소"로만 남긴다(모두 새 주소로 보면 알림이 쏟아진다)
 */

import { db, replaceRange, selectAll } from "../metrics/db.ts";
import { addDays, todayIn } from "../metrics/dates.ts";
import { MAX_INSPECTIONS, SITE, TRACK_DAYS } from "./config.ts";
import { inspect, listSitemaps, readToken, searchAnalytics, type IndexStatus } from "./google.ts";
import { sitemapUrls } from "./sitemap.ts";
import { notifyUrls, type NotifyResult } from "./store.ts";
import { originOf, statusOf } from "./status.ts";

/** 검색 실적을 다시 받는 기간. 확정이 2~3일 늦어 지표 공통(7일)보다 길게 둔다 */
const REFETCH_DAYS = 10;
/** 처음 채울 때. 사이트를 검색에 낸 무렵부터 받는다(서치 콘솔은 16개월까지 둔다) */
const BACKFILL_FROM = "2026-04-01";
const BREAKDOWNS: { name: string; dimensions: string[] }[] = [
  { name: "total", dimensions: ["date"] },
  { name: "page", dimensions: ["date", "page"] },
  { name: "query", dimensions: ["date", "query"] },
  { name: "country", dimensions: ["date", "country"] },
  { name: "device", dimensions: ["date", "device"] },
];

/** 한 번에 몇 개씩 검사하나. 분당 600건 한도 안에서 5분 안에 끝나게 */
const CONCURRENCY = 4;

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        try {
          out[i] = { status: "fulfilled", value: await fn(items[i]) };
        } catch (e) {
          out[i] = { status: "rejected", reason: e };
        }
      }
    }),
  );
  return out;
}

const sameHost = (u: string) => {
  try {
    return new URL(u).host === new URL(SITE).host;
  } catch {
    return false;
  }
};

export type SearchResult = {
  ok: boolean;
  dry: boolean;
  day: string;
  inspected: number;
  failed: string[];
  searchRows: number;
  from: string;
  to: string;
  newUrls: number;
  notify?: NotifyResult;
  baseline?: number;
};

export async function runSearch(opts: { dry: boolean; now?: Date; from?: string | "all" }): Promise<SearchResult> {
  const today = todayIn("Asia/Seoul", opts.now ?? new Date());
  const token = await readToken();
  const client = opts.dry ? null : db();

  // 2. 검색 실적. 날짜는 구글이 주는 미국 서부 날짜 그대로다
  const to = addDays(today, -1);
  const from = opts.from === "all" ? BACKFILL_FROM : (opts.from ?? addDays(to, -(REFETCH_DAYS - 1)));
  const searchRows: object[] = [];
  for (const b of BREAKDOWNS) {
    const rows = await searchAnalytics(token, { startDate: from, endDate: to, dimensions: b.dimensions, ...(b.name === "total" && { aggregationType: "byProperty" }) });
    for (const r of rows) {
      const [day, key = ""] = r.keys ?? [];
      if (!day) continue;
      searchRows.push({ day, breakdown: b.name, key, clicks: r.clicks, impressions: r.impressions, position: r.position });
    }
  }
  // 노출이 없는 날은 구글이 줄을 주지 않는다. 받은 마지막 날까지 빈 날을 0 으로 채워, 화면이 "아직 안 채운 날"과 헷갈리지 않게 한다
  const totalDays = new Set((searchRows as { day: string; breakdown: string }[]).filter((r) => r.breakdown === "total").map((r) => r.day));
  const lastDay = (searchRows as { day: string }[]).reduce((m, r) => (r.day > m ? r.day : m), "");
  for (let d = from; lastDay && d <= lastDay; d = addDays(d, 1)) {
    if (!totalDays.has(d)) searchRows.push({ day: d, breakdown: "total", key: "", clicks: 0, impressions: 0, position: 0 });
  }
  if (client) await replaceRange(client, "gsc_search_daily", {}, from, to, searchRows);

  // 1. 검사할 주소: 사이트맵, 최근 28일 검색에 나온 우리 주소, 따라가는 주소
  const inSitemap = await sitemapUrls();
  const sitemapSet = new Set(inSitemap);
  const recentPages = (
    await searchAnalytics(token, { startDate: addDays(to, -27), endDate: to, dimensions: ["page"] })
  )
    .map((r) => r.keys?.[0] ?? "")
    .filter(sameHost);
  const tracking = client
    ? await selectAll<{ url: string; origin: string; tracked: boolean; first_seen_at: string; first_crawled_at: string | null; indexed_at: string | null }>(
        (a, b) => client.from("search_tracking").select("url,origin,tracked,first_seen_at,first_crawled_at,indexed_at").order("url").range(a, b),
        "추적 읽기",
      )
    : [];
  // 화면(view.ts)과 같은 달력 날짜 기준. 처음 본 날이 오늘부터 30일 안이면 따라간다
  const trackSince = new Date(Date.parse(`${addDays(today, -TRACK_DAYS)}T00:00:00+09:00`)).toISOString();
  const following = tracking.filter((t) => t.tracked && t.first_seen_at >= trackSince).map((t) => t.url);
  const targets = [...new Set([...inSitemap, ...following, ...recentPages])].slice(0, MAX_INSPECTIONS);

  const results = await pool(targets, CONCURRENCY, (url) => inspect(token, url));
  const failed: string[] = [];
  const inspections: { url: string; status: IndexStatus; link: string | null }[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") inspections.push({ url: targets[i], ...r.value });
    else failed.push(`${targets[i]}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
  });
  // 전부 실패면(권한, 한도) 빈 판정을 남기지 않고 멈춘다. 어제 판정이 오늘 것처럼 보이는 편이 낫다
  if (inspections.length === 0 && targets.length > 0) throw new Error(`구글 판정을 하나도 받지 못했어요. ${failed[0] ?? ""}`);

  if (client) {
    // 지우고 넣지 않고 주소별로 덮어쓴다. 같은 날 다시 돌다 일부가 실패해도 먼저 받은 판정이 남는다
    const put = await client.from("gsc_inspection_daily").upsert(
      inspections.map(({ url, status: s, link }) => ({
        day: today,
        url,
        verdict: s.verdict ?? "",
        coverage_state: s.coverageState ?? "",
        indexing_state: s.indexingState ?? "",
        page_fetch_state: s.pageFetchState ?? "",
        robots_txt_state: s.robotsTxtState ?? "",
        last_crawl_time: s.lastCrawlTime ?? null,
        google_canonical: s.googleCanonical ?? null,
        user_canonical: s.userCanonical ?? null,
        in_sitemap: sitemapSet.has(url),
        crawled_as: s.crawledAs ?? null,
        link,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "day,url" },
    );
    if (put.error) throw new Error(`구글 판정 저장 실패: ${put.error.message}`);

    // 3. 사이트맵 상태
    const sitemaps = await listSitemaps(token);
    await replaceRange(
      client,
      "gsc_sitemap_daily",
      {},
      today,
      today,
      sitemaps.map((s) => ({
        day: today,
        path: s.path,
        last_submitted: s.lastSubmitted ?? null,
        last_downloaded: s.lastDownloaded ?? null,
        is_pending: !!s.isPending,
        errors: Number(s.errors ?? 0),
        warnings: Number(s.warnings ?? 0),
        submitted: (s.contents ?? []).reduce((a, c) => a + Number(c.submitted ?? 0), 0),
      })),
    );
  }

  // 4. 새 주소
  let newUrls = 0;
  let notify: NotifyResult | undefined;
  let baseline: number | undefined;
  if (client) {
    const known = new Set(tracking.map((t) => t.url));
    // 추적 전부터 있던 주소를 남긴 적이 있는지로 첫 수집을 가른다. 표가 비었는지로 가르면, 첫 수집 전에
    // 블로그 동기화나 "요청했어요"가 한 줄만 넣어도 사이트맵 전체가 새 주소로 알려진다
    if (!tracking.some((t) => t.origin === "baseline")) {
      const rest = inSitemap.filter((u) => !known.has(u));
      baseline = rest.length;
      const put = await client.from("search_tracking").upsert(rest.map((url) => ({ url, origin: "baseline", tracked: false })), { onConflict: "url", ignoreDuplicates: true });
      if (put.error) throw new Error(`추적 시작 기록 실패: ${put.error.message}`);
      // 사이트맵이 비어 baseline 줄이 하나도 없으면 다음 날 또 첫 수집이 된다. 사이트맵은 비면 위에서 멈춘다
    } else {
      const fresh = inSitemap.filter((u) => !known.has(u));
      newUrls = fresh.length;
      if (fresh.length > 0) {
        notify = await notifyUrls(
          fresh.map((url) => {
            const origin = originOf(url);
            // 모집글은 며칠 뒤 마감되는 짧은 페이지라 알리기만 한다
            return { url, origin, track: origin !== "meetup", isNew: true };
          }),
          "자동",
        );
      }
    }

    // 따라가는 주소의 진행을 판정으로 채운다
    const byUrl = new Map(inspections.map((x) => [x.url, x.status]));
    const now = new Date().toISOString();
    for (const t of tracking.filter((x) => x.tracked)) {
      const s = byUrl.get(t.url);
      if (!s) continue;
      const kind = statusOf({ verdict: s.verdict ?? "", coverageState: s.coverageState ?? "", indexingState: s.indexingState ?? "", pageFetchState: s.pageFetchState ?? "", robotsTxtState: s.robotsTxtState ?? "" }).kind;
      const crawled = s.lastCrawlTime && s.lastCrawlTime >= t.first_seen_at ? s.lastCrawlTime : null;
      await client
        .from("search_tracking")
        .update({
          last_kind: kind,
          last_checked_on: today,
          updated_at: now,
          ...(!t.first_crawled_at && crawled && { first_crawled_at: crawled }),
          ...(!t.indexed_at && kind === "indexed" && { indexed_at: now }),
        })
        .eq("url", t.url);
    }
  }

  return {
    // 몇 개가 한 번 실패한 것으로 크론을 실패시키지 않는다. 절반 넘게 실패하면 실패다
    ok: failed.length < inspections.length,
    dry: opts.dry,
    day: today,
    inspected: inspections.length,
    failed: failed.slice(0, 10),
    searchRows: searchRows.length,
    from,
    to,
    newUrls,
    ...(notify && { notify }),
    ...(baseline !== undefined && { baseline }),
  };
}
