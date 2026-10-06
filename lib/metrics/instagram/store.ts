/**
 * 인스타 수집 저장소 (#140). 스키마는 supabase/migrations/0002_instagram_metrics.sql.
 *
 * 블로그 저장소(lib/blog/store.ts)와 같은 프로젝트를 service role 로 쓴다.
 * 이 테이블들은 anon 에 아무 권한이 없으므로 다른 키로는 읽히지 않는다.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AccountDay, Media, MediaMetrics } from "./types.ts";

export function db(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)가 없어요");
  return createClient(url, key, { auth: { persistSession: false } });
}

function check<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what} 실패: ${res.error.message}`);
  return res.data;
}

export type StoredToken = {
  accessToken: string;
  expiresAt: string | null;
  refreshedAt: string;
  seedHash: string;
};

export async function readToken(client: SupabaseClient, provider: string): Promise<StoredToken | null> {
  const row = check(
    await client
      .from("metrics_tokens")
      .select("access_token, expires_at, refreshed_at, seed_hash")
      .eq("provider", provider)
      .maybeSingle(),
    "토큰 읽기",
  ) as { access_token: string; expires_at: string | null; refreshed_at: string; seed_hash: string } | null;
  return row
    ? { accessToken: row.access_token, expiresAt: row.expires_at, refreshedAt: row.refreshed_at, seedHash: row.seed_hash }
    : null;
}

export async function writeToken(client: SupabaseClient, provider: string, token: StoredToken): Promise<void> {
  check(
    await client.from("metrics_tokens").upsert({
      provider,
      access_token: token.accessToken,
      expires_at: token.expiresAt,
      refreshed_at: token.refreshedAt,
      seed_hash: token.seedHash,
    }),
    "토큰 저장",
  );
}

export async function upsertMedia(client: SupabaseClient, media: Media[]): Promise<void> {
  if (media.length === 0) return;
  check(
    await client.from("instagram_media").upsert(
      media.map((m) => ({
        id: m.id,
        permalink: m.permalink,
        // 리포트에는 첫 줄만 쓴다. 긴 캡션 전체를 쌓아 둘 이유가 없다
        caption: m.caption ? m.caption.slice(0, 500) : null,
        media_type: m.mediaType,
        product_type: m.productType,
        posted_at: m.postedAt,
        updated_at: new Date().toISOString(),
      })),
    ),
    "게시물 저장",
  );
}

export type Snapshot = { mediaId: string; capturedOn: string; capturedAt: string; metrics: MediaMetrics };

export async function upsertSnapshots(client: SupabaseClient, rows: Snapshot[]): Promise<void> {
  if (rows.length === 0) return;
  check(
    await client.from("instagram_media_daily").upsert(
      rows.map((r) => ({
        media_id: r.mediaId,
        captured_on: r.capturedOn,
        captured_at: r.capturedAt,
        views: r.metrics.views,
        reach: r.metrics.reach,
        likes: r.metrics.likes,
        comments: r.metrics.comments,
        saved: r.metrics.saved,
        shares: r.metrics.shares,
        total_interactions: r.metrics.totalInteractions,
        profile_visits: r.metrics.profileVisits,
        follows: r.metrics.follows,
        bio_link_clicks: r.metrics.bioLinkClicks,
        avg_watch_ms: r.metrics.avgWatchMs,
        total_watch_ms: r.metrics.totalWatchMs,
        skip_rate: r.metrics.skipRate,
      })),
    ),
    "게시물 숫자 저장",
  );
}

type SnapshotRow = {
  media_id: string;
  captured_on: string;
  captured_at: string;
  views: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  saved: number | null;
  shares: number | null;
  total_interactions: number | null;
  profile_visits: number | null;
  follows: number | null;
  bio_link_clicks: number | null;
  avg_watch_ms: number | null;
  total_watch_ms: number | null;
  skip_rate: number | string | null; // numeric 은 문자열로 올 수 있다
};

function toSnapshot(r: SnapshotRow): Snapshot {
  return {
    mediaId: r.media_id,
    capturedOn: r.captured_on,
    capturedAt: r.captured_at,
    metrics: {
      views: r.views,
      reach: r.reach,
      likes: r.likes,
      comments: r.comments,
      saved: r.saved,
      shares: r.shares,
      totalInteractions: r.total_interactions,
      profileVisits: r.profile_visits,
      follows: r.follows,
      bioLinkClicks: r.bio_link_clicks,
      avgWatchMs: r.avg_watch_ms,
      totalWatchMs: r.total_watch_ms === null ? null : Number(r.total_watch_ms),
      skipRate: r.skip_rate === null ? null : Number(r.skip_rate),
    },
  };
}

/** 최근 며칠의 누적값. 게시물마다 최신과 그 직전을 고르는 데 쓴다. */
export async function recentSnapshots(client: SupabaseClient, sinceDate: string): Promise<Snapshot[]> {
  const rows = check(
    await client
      .from("instagram_media_daily")
      .select("*")
      .gte("captured_on", sinceDate)
      .order("captured_on", { ascending: false })
      // Supabase(PostgREST)는 한 번에 1,000줄까지 준다. 날짜 내림차순이라 넘치면 옛 날짜부터
      // 잘린다. 닷새치를 읽으므로 게시물이 200개를 넘으면 범위를 줄이거나 쪽을 나눠 읽는다
      .limit(1000),
    "게시물 숫자 읽기",
  ) as SnapshotRow[];
  return rows.map(toSnapshot);
}

/** 오늘(한국 날짜) 팔로워 수. 같은 날 다시 돌면 덮어쓴다 */
export async function upsertFollowers(client: SupabaseClient, capturedOn: string, f: { followers: number; follows: number | null }): Promise<void> {
  check(
    await client
      .from("instagram_followers")
      .upsert({ captured_on: capturedOn, followers: f.followers, follows: f.follows, captured_at: new Date().toISOString() }, { onConflict: "captured_on" }),
    "팔로워 수 저장",
  );
}

export async function upsertAccountDays(client: SupabaseClient, days: AccountDay[]): Promise<void> {
  if (days.length === 0) return;
  check(
    await client.from("instagram_account_daily").upsert(
      days.map((d) => ({
        day: d.day,
        day_start: d.dayStart,
        day_end: d.dayEnd,
        reach: d.reach,
        views: d.views,
        profile_views: d.profileViews,
        website_clicks: d.websiteClicks,
        accounts_engaged: d.accountsEngaged,
        total_interactions: d.totalInteractions,
        updated_at: new Date().toISOString(),
      })),
    ),
    "계정 하루 지표 저장",
  );
}

/** 날짜 오름차순. 급상승 판단의 입력이다. */
export async function accountDaysSince(client: SupabaseClient, sinceDate: string): Promise<AccountDay[]> {
  const rows = check(
    await client
      .from("instagram_account_daily")
      .select("day, day_start, day_end, reach, views, profile_views, website_clicks, accounts_engaged, total_interactions")
      .gte("day", sinceDate)
      .order("day", { ascending: true }),
    "계정 하루 지표 읽기",
  ) as {
    day: string;
    day_start: string;
    day_end: string;
    reach: number | null;
    views: number | null;
    profile_views: number | null;
    website_clicks: number | null;
    accounts_engaged: number | null;
    total_interactions: number | null;
  }[];
  return rows.map((r) => ({
    day: r.day,
    dayStart: new Date(r.day_start).toISOString(),
    dayEnd: new Date(r.day_end).toISOString(),
    reach: r.reach,
    views: r.views,
    profileViews: r.profile_views,
    websiteClicks: r.website_clicks,
    accountsEngaged: r.accounts_engaged,
    totalInteractions: r.total_interactions,
  }));
}

/** 가장 최근에 저장한 계정 하루. 없으면 처음 켠 것이다. */
export async function latestAccountDay(client: SupabaseClient): Promise<string | null> {
  const row = check(
    await client.from("instagram_account_daily").select("day").order("day", { ascending: false }).limit(1).maybeSingle(),
    "계정 하루 지표 읽기",
  ) as { day: string } | null;
  return row?.day ?? null;
}

export async function sentKeys(client: SupabaseClient, kind: string): Promise<Set<string>> {
  const rows = check(
    await client.from("metrics_notifications").select("key").eq("kind", kind),
    "보낸 알림 읽기",
  ) as { key: string }[];
  return new Set(rows.map((r) => r.key));
}

/**
 * 보내기 전에 자리를 잡는다. 이미 있으면 false - 다른 실행이 보냈거나 보내는 중이다.
 * 같은 날 크론과 수동 실행이 겹쳐도 메시지가 두 번 가지 않게 하는 장치다.
 */
export async function claimNotification(client: SupabaseClient, kind: string, key: string): Promise<boolean> {
  const res = await client.from("metrics_notifications").insert({ kind, key });
  if (!res.error) return true;
  // 23505 = 기본 키 중복
  if (res.error.code === "23505") return false;
  throw new Error(`알림 자리 잡기 실패: ${res.error.message}`);
}

/** 전송이 실패하면 자리를 돌려놓아 다음 실행이 다시 보내게 한다. */
export async function releaseNotification(client: SupabaseClient, kind: string, key: string): Promise<void> {
  check(await client.from("metrics_notifications").delete().eq("kind", kind).eq("key", key), "알림 자리 되돌리기");
}
