/**
 * 인스타 Graph API 호출 (#140). "Instagram 로그인으로 API 설정" 방식의 토큰을 쓴다.
 *
 * 토큰은 주소의 쿼리로 실린다(인스타가 그렇게 받는다). 그래서 오류 메시지에
 * 주소를 절대 넣지 않는다 - 응답 JSON 이나 Actions 로그로 토큰이 샌다.
 *
 * 권한은 instagram_business_basic 과 instagram_business_manage_insights 둘뿐이다.
 * 댓글, DM, 게시 권한은 받지 않았다 (토큰이 새도 계정을 바꿀 수 없게).
 */

import type { AccountDay, Media, MediaMetrics, ProductType } from "./types.ts";

const BASE = "https://graph.instagram.com";
const VERSION = "v23.0";

export class InstagramApiError extends Error {
  readonly code: number | null;
  constructor(message: string, code: number | null) {
    super(message);
    this.name = "InstagramApiError";
    this.code = code;
  }
}

type Json = Record<string, unknown>;

async function getJson(url: string): Promise<Json> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  } catch (e) {
    // fetch 오류 메시지에는 주소가 들어갈 수 있어 이름만 남긴다
    throw new InstagramApiError(`인스타 요청 실패 (${e instanceof Error ? e.name : "unknown"})`, null);
  }
  const body = (await res.json().catch(() => ({}))) as Json;
  if (!res.ok) {
    const err = (body.error ?? {}) as { message?: string; code?: number };
    throw new InstagramApiError(err.message ?? `HTTP ${res.status}`, err.code ?? null);
  }
  return body;
}

function graphUrl(path: string, token: string, params: Record<string, string> = {}): string {
  const q = new URLSearchParams({ ...params, access_token: token });
  return `${BASE}/${VERSION}/${path}?${q}`;
}

type RawMedia = {
  id: string;
  permalink: string;
  caption?: string;
  media_type: string;
  media_product_type: string;
  timestamp: string;
};

/** 다음 쪽 주소에는 토큰이 이미 들어 있다. 끝없는 반복을 막으려고 쪽 수를 묶는다. */
const MAX_PAGES = 20;

/** 계정의 모든 피드와 릴스 게시물. 스토리는 24시간 뒤 사라져 여기 없다. */
export async function fetchAllMedia(token: string): Promise<Media[]> {
  const out: Media[] = [];
  let url: string | null = graphUrl("me/media", token, {
    fields: "id,permalink,caption,media_type,media_product_type,timestamp",
    limit: "50",
  });
  for (let page = 0; url && page < MAX_PAGES; page++) {
    const body = await getJson(url);
    for (const m of (body.data ?? []) as RawMedia[]) {
      // 광고 등 다른 종류가 섞여 와도 피드와 릴스만 다룬다
      if (m.media_product_type !== "FEED" && m.media_product_type !== "REELS") continue;
      out.push({
        id: m.id,
        permalink: m.permalink,
        caption: m.caption ?? null,
        mediaType: m.media_type,
        productType: m.media_product_type as ProductType,
        postedAt: new Date(m.timestamp).toISOString(),
      });
    }
    const paging = body.paging as { next?: string } | undefined;
    url = paging?.next ?? null;
  }
  return out;
}

/**
 * 종류마다 인스타가 주는 지표가 다르다 (2026-10 실측).
 * 릴스에 profile_visits, follows 를 물으면 요청 전체가 거절된다.
 */
const FEED_METRICS = [
  "views", "reach", "likes", "comments", "saved", "shares", "total_interactions",
  "profile_visits", "follows",
];
const REELS_METRICS = [
  "views", "reach", "likes", "comments", "saved", "shares", "total_interactions",
  "ig_reels_avg_watch_time", "ig_reels_video_view_total_time", "reels_skip_rate",
];

type InsightRow = { name: string; values?: { value: number }[]; total_value?: { value: number } };

function readInsights(body: Json): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of (body.data ?? []) as InsightRow[]) {
    const v = row.values?.[0]?.value ?? row.total_value?.value;
    if (typeof v === "number") map.set(row.name, v);
  }
  return map;
}

/**
 * 지표를 한 번에 묻고, 거절되면 하나씩 다시 묻는다. 인스타가 일부 게시물에서
 * 특정 지표를 빼는 일이 있어(예: 프로페셔널 전환 전 게시물), 하나 때문에 그
 * 게시물 전체를 잃지 않으려는 것이다.
 */
async function insightsOf(mediaId: string, metrics: string[], token: string): Promise<Map<string, number>> {
  try {
    return readInsights(await getJson(graphUrl(`${mediaId}/insights`, token, { metric: metrics.join(",") })));
  } catch (e) {
    if (!(e instanceof InstagramApiError) || e.code !== 100) throw e;
    const map = new Map<string, number>();
    for (const metric of metrics) {
      try {
        const one = readInsights(await getJson(graphUrl(`${mediaId}/insights`, token, { metric })));
        for (const [k, v] of one) map.set(k, v);
      } catch (inner) {
        if (!(inner instanceof InstagramApiError) || inner.code !== 100) throw inner;
      }
    }
    return map;
  }
}

/**
 * 프로필 링크 클릭 수. profile_activity 를 행동 종류로 쪼개야 나온다.
 * 아무도 누르지 않았으면 쪼갠 결과에 항목이 없으므로 0 이다.
 */
async function bioLinkClicksOf(mediaId: string, token: string): Promise<number | null> {
  try {
    const body = await getJson(
      graphUrl(`${mediaId}/insights`, token, {
        metric: "profile_activity",
        breakdown: "action_type",
        metric_type: "total_value",
      }),
    );
    const row = ((body.data ?? []) as {
      total_value?: { breakdowns?: { results?: { dimension_values: string[]; value: number }[] }[] };
    }[])[0];
    if (!row) return null;
    const results = row.total_value?.breakdowns?.[0]?.results ?? [];
    return results.find((r) => r.dimension_values.includes("bio_link_clicked"))?.value ?? 0;
  } catch (e) {
    if (e instanceof InstagramApiError && e.code === 100) return null;
    throw e;
  }
}

export async function fetchMediaMetrics(media: Media, token: string): Promise<MediaMetrics> {
  const isReels = media.productType === "REELS";
  const map = await insightsOf(media.id, isReels ? REELS_METRICS : FEED_METRICS, token);
  const get = (k: string) => map.get(k) ?? null;
  return {
    views: get("views"),
    reach: get("reach"),
    likes: get("likes"),
    comments: get("comments"),
    saved: get("saved"),
    shares: get("shares"),
    totalInteractions: get("total_interactions"),
    profileVisits: isReels ? null : get("profile_visits"),
    follows: isReels ? null : get("follows"),
    bioLinkClicks: isReels ? null : await bioLinkClicksOf(media.id, token),
    avgWatchMs: isReels ? get("ig_reels_avg_watch_time") : null,
    totalWatchMs: isReels ? get("ig_reels_video_view_total_time") : null,
    skipRate: isReels ? get("reels_skip_rate") : null,
  };
}

const ACCOUNT_METRICS = [
  "reach", "views", "profile_views", "website_clicks", "accounts_engaged", "total_interactions",
];

/**
 * 계정 하루 지표를 since~until 사이의 끝난 하루마다 받는다 (인스타는 30일까지만 허용).
 *
 * 하루의 경계는 인스타가 정한다(미국 서부 자정). 시간대 계산을 우리가 하지 않고,
 * 하루 단위 도달 시계열이 주는 시각들을 그대로 경계로 쓴다 - 서머타임이 바뀌는
 * 날(23시간이나 25시간)도 인스타와 어긋나지 않는다.
 *
 * 주의: 시계열의 end_time 은 이름과 달리 그 값이 속한 하루가 "시작하는" 시각이다.
 * 진행 중인 오늘 치가 이미 지난 시각으로 찍혀 오고, 10월 2일 게시물의 도달이
 * 10월 2일 0시(미국 서부) 칸에 잡히는 것으로 확인했다 (2026-10-06 실측).
 *
 * 새 지표(views 등)는 하루씩 total_value 로만 준다. 하루 E 의 값은
 * since=직전 하루의 시작+1초, until=E 로 물어야 시계열 값과 정확히 같다. since 를
 * 1초라도 당기면 이틀치가 합쳐져 온다 (같은 날 실측 - 9월 13일 2,152명이 3,708명으로
 * 잡혔다). "E-24시간"으로 계산하지 않는 이유가 이것이다 - 23시간인 서머타임 시작일에는
 * 그 값이 직전 경계보다 한 시간 앞서 이틀치가 합쳐진다. 그래서 시계열을 하루 더
 * 앞에서부터 받아, 맨 앞 칸은 경계로만 쓴다.
 */
export async function fetchAccountDays(token: string, since: Date, until: Date): Promise<AccountDay[]> {
  const sec = (ms: number) => String(Math.floor(ms / 1000));
  const series = await getJson(
    graphUrl("me/insights", token, {
      metric: "reach",
      period: "day",
      since: sec(since.getTime() - 86_400_000),
      until: sec(until.getTime()),
    }),
  );
  const starts = ((series.data as { values?: { end_time: string }[] }[] | undefined)?.[0]?.values ?? [])
    .map((v) => new Date(v.end_time).getTime())
    .sort((a, b) => a - b);

  const days: AccountDay[] = [];
  for (let i = 1; i < starts.length; i++) {
    const start = starts[i];
    // 다음 칸이 있으면 그것이 이 하루의 끝이다. 마지막 칸은 하루 뒤로 잡는다
    const end = i + 1 < starts.length ? starts[i + 1] : start + 86_400_000;
    // 아직 끝나지 않은 오늘은 값이 계속 바뀌므로 받지 않는다
    if (end > until.getTime()) continue;
    const body = await getJson(
      graphUrl("me/insights", token, {
        metric: ACCOUNT_METRICS.join(","),
        period: "day",
        metric_type: "total_value",
        since: sec(starts[i - 1] + 1000),
        until: sec(start),
      }),
    );
    const map = readInsights(body);
    const get = (k: string) => map.get(k) ?? null;
    days.push({
      // 미국 서부 자정에서 반나절 뒤의 날짜가 그 하루의 날짜다 (시간대 계산 없이 안전하다)
      day: new Date(start + 12 * 3_600_000).toISOString().slice(0, 10),
      dayStart: new Date(start).toISOString(),
      dayEnd: new Date(end).toISOString(),
      reach: get("reach"),
      views: get("views"),
      profileViews: get("profile_views"),
      websiteClicks: get("website_clicks"),
      accountsEngaged: get("accounts_engaged"),
      totalInteractions: get("total_interactions"),
    });
  }
  return days;
}

/**
 * 토큰 연장. 만든 지 24시간이 지났고 아직 만료 전인 토큰만 연장된다.
 * 연장하면 다시 60일짜리가 된다.
 */
export async function refreshToken(token: string): Promise<{ token: string; expiresAt: string }> {
  const q = new URLSearchParams({ grant_type: "ig_refresh_token", access_token: token });
  const body = await getJson(`${BASE}/refresh_access_token?${q}`);
  const next = body.access_token;
  const expiresIn = body.expires_in;
  if (typeof next !== "string" || typeof expiresIn !== "number") {
    throw new InstagramApiError("토큰 연장 응답이 예상과 달라요", null);
  }
  return { token: next, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
}
