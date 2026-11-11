/**
 * 검색 색인 현황의 저장과 알림 (#309). 서버 전용이다.
 *
 * 밖에 보내는 것(사이트맵 제출, IndexNow)은 운영 배포에서만 한다. 미리보기와 로컬은 운영과 같은 DB 를 써서,
 * 거기서 보내면 아직 없는 주소를 알리거나 기록이 섞인다. 보낸 것은 모두 search_actions 에 남긴다.
 */

import { db, selectAll } from "../metrics/db.ts";
import { SITEMAP_URL } from "./config.ts";
import { submitSitemap, writeToken } from "./google.ts";
import { indexNowKey, sendIndexNow } from "./indexnow.ts";
import type { ActionRow, InspectionRow, SearchRow, SitemapRow, TrackingRow } from "./view.ts";

export const canSend = () => process.env.VERCEL_ENV === "production";

/** 같은 사이트맵을 이 시간 안에 다시 제출하지 않는다(출시 조작과 같은 3분) */
const REPEAT_MS = 3 * 60_000;

async function log(action: string, urls: string[], status: "done" | "failed" | "skipped", actor: string, message?: string) {
  // 기록이 실패해도 알림 자체는 됐을 수 있다. 기록 실패로 동기화를 실패시키지 않는다
  await db().from("search_actions").insert({ action, urls, status, actor, message: message ?? null });
}

async function submittedRecently(): Promise<boolean> {
  const since = new Date(Date.now() - REPEAT_MS).toISOString();
  const { data } = await db().from("search_actions").select("id").eq("action", "sitemap").eq("status", "done").gte("created_at", since).limit(1);
  return (data ?? []).length > 0;
}

export type NotifyResult = { urls: number; sitemap: "done" | "skipped" | "failed"; indexnow: "done" | "skipped" | "failed"; message?: string };

/**
 * 새로 생기거나 바뀐 주소를 검색엔진에 알리고 따라가기 시작한다.
 * track 이 false 인 주소(모집글)는 알리기만 하고 구글 판정은 따라가지 않는다.
 */
export async function notifyUrls(
  items: { url: string; origin: string; track: boolean; isNew: boolean }[],
  actor: string,
): Promise<NotifyResult> {
  const urls = [...new Set(items.map((i) => i.url))];
  if (urls.length === 0) return { urls: 0, sitemap: "skipped", indexnow: "skipped" };
  if (!canSend()) return { urls: urls.length, sitemap: "skipped", indexnow: "skipped", message: "정식 사이트에서만 알려요." };

  const client = db();
  const now = new Date().toISOString();
  // 기록할 곳을 못 읽거나 못 쓰면 보내지 않는다. 보내 놓고 기록이 빠지면 다음 수집이 같은 주소를 또 새 주소로 본다
  const known = await client.from("search_tracking").select("url,origin,tracked").in("url", urls);
  if (known.error) throw new Error(`추적 읽기 실패: ${known.error.message}`);
  const has = new Map((known.data ?? []).map((r) => [r.url as string, r as { origin: string; tracked: boolean }]));
  // 처음 보는 주소는 따라가기 시작한다. 공개된 채로 슬러그만 바뀐 글도 구글에는 새 주소다
  const fresh = items.filter((i) => !has.has(i.url));
  if (fresh.length > 0) {
    const put = await client
      .from("search_tracking")
      .upsert(fresh.map((i) => ({ url: i.url, origin: i.origin, tracked: i.track, first_seen_at: now })), { onConflict: "url", ignoreDuplicates: true });
    if (put.error) throw new Error(`추적 저장 실패: ${put.error.message}`);
  }
  // 내렸다가 다시 공개한 글은 새로 공개된 것으로 보고 처음부터 다시 따라간다
  const again = items.filter((i) => i.isNew && i.track && has.has(i.url) && has.get(i.url)?.origin !== "baseline");
  if (again.length > 0) {
    const re = await client
      .from("search_tracking")
      .update({ tracked: true, first_seen_at: now, first_crawled_at: null, indexed_at: null, requested_at: null, requested_by: null, updated_at: now })
      .in("url", again.map((i) => i.url));
    if (re.error) throw new Error(`추적 다시 시작 실패: ${re.error.message}`);
  }

  let sitemap: NotifyResult["sitemap"] = "skipped";
  const messages: string[] = [];
  try {
    if (!(await submittedRecently())) {
      await submitSitemap(await writeToken(), SITEMAP_URL);
      sitemap = "done";
      await log("sitemap", urls, "done", actor);
    }
  } catch (e) {
    sitemap = "failed";
    const m = e instanceof Error ? e.message : String(e);
    messages.push(m);
    await log("sitemap", urls, "failed", actor, m);
  }

  let indexnow: NotifyResult["indexnow"] = "skipped";
  if (indexNowKey()) {
    try {
      await sendIndexNow(urls);
      indexnow = "done";
      await log("indexnow", urls, "done", actor);
    } catch (e) {
      indexnow = "failed";
      const m = e instanceof Error ? e.message : String(e);
      messages.push(m);
      await log("indexnow", urls, "failed", actor, m);
    }
  } else {
    messages.push("INDEXNOW_KEY 가 없어 빙·네이버에는 알리지 않았어요");
  }

  if (sitemap === "done" || indexnow === "done") {
    const done = await client.from("search_tracking").update({ notified_at: now, updated_at: now }).in("url", urls);
    if (done.error) messages.push(`알린 시각을 남기지 못했어요: ${done.error.message}`);
  }
  return { urls: urls.length, sitemap, indexnow, ...(messages.length ? { message: messages.join(" · ") } : {}) };
}

/** 블로그 동기화 한 번의 결과. 크론 결과는 다른 곳에 남지 않아 여기 남긴다. 실패해도 동기화는 그대로 끝낸다 */
export async function recordSyncRun(r: { ok: boolean; published: string[]; updated: string[]; unpublished: string[]; removed: string[]; failed: number }) {
  try {
    await db().from("blog_sync_runs").insert(r);
  } catch {
    // 표가 아직 없거나 DB 가 잠깐 안 되면 기록만 빠진다
  }
}

/** 서치 콘솔에서 색인을 요청했다는 기록. 요청 자체는 API 가 없어 사람이 한다 */
export async function markRequested(url: string, actor: string): Promise<void> {
  const client = db();
  const now = new Date().toISOString();
  const { data } = await client.from("search_tracking").select("url").eq("url", url).maybeSingle();
  if (data) {
    const { error } = await client.from("search_tracking").update({ requested_at: now, requested_by: actor, updated_at: now }).eq("url", url);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client.from("search_tracking").insert({ url, origin: "page", tracked: false, requested_at: now, requested_by: actor });
    if (error) throw new Error(error.message);
  }
  await log("requested", [url], "done", actor);
}

/** 화면에 필요한 줄. 구글 판정은 60일, 실적은 이번과 비교 기간을 읽는다 */
export async function loadSearchRows(today: string, from: string, to: string) {
  const client = db();
  const since = new Date(Date.parse(`${today}T00:00:00Z`) - 60 * 86_400_000).toISOString().slice(0, 10);
  const [inspections, tracking, actions, sitemaps, search] = await Promise.all([
    selectAll<InspectionRow>(
      (a, b) =>
        client
          .from("gsc_inspection_daily")
          .select("day,url,verdict,coverage_state,indexing_state,page_fetch_state,robots_txt_state,last_crawl_time,google_canonical,user_canonical,in_sitemap,crawled_as,link")
          .gte("day", since)
          .order("day")
          .range(a, b),
      "구글 판정 읽기",
    ),
    selectAll<TrackingRow>(
      (a, b) => client.from("search_tracking").select("url,origin,first_seen_at,tracked,notified_at,first_crawled_at,indexed_at,requested_at,requested_by").order("url").range(a, b),
      "추적 읽기",
    ),
    selectAll<ActionRow>(
      (a, b) => client.from("search_actions").select("action,urls,status,actor,created_at").gte("created_at", `${since}T00:00:00Z`).order("created_at").range(a, b),
      "알림 기록 읽기",
    ),
    selectAll<SitemapRow>(
      (a, b) => client.from("gsc_sitemap_daily").select("day,path,last_submitted,last_downloaded,is_pending,errors,warnings,submitted").gte("day", since).order("day").range(a, b),
      "사이트맵 읽기",
    ),
    selectAll<SearchRow>(
      (a, b) =>
        client
          .from("gsc_search_daily")
          .select("day,breakdown,key,clicks,impressions,position")
          .in("breakdown", ["total", "page", "query"])
          .gte("day", from)
          .lte("day", to)
          .order("day")
          .range(a, b),
      "검색 실적 읽기",
    ),
  ]);
  return { inspections, tracking, actions, sitemaps, search };
}

/** 표가 아직 없을 때(SQL 을 실행하기 전) 나는 오류인지 */
export const isMissingTable = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  return /(gsc_|search_tracking|search_actions)/.test(m) && /does not exist|schema cache/.test(m);
};
