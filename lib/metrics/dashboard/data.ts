/**
 * 어드민 지표 화면의 데이터 (#145). 서버 라우트(/api/admin/metrics)만 부른다.
 *
 * 화면은 콘솔을 옮겨 놓지 않고 질문 몇 개에 답한다.
 * 1. 이 기간 어디서 와서 어디까지 갔나 - 인스타 → 웹 → 다운로드 버튼 → 설치 → 첫 실행 → 게임
 * 2. 날마다 어땠나 - 소스별 추이, 게시물을 올린 날 표시
 * 3. 어느 게시물, 어느 링크가 남겼나 - 게시물 표, 캠페인(UTM) 표
 * 4. 광고 - 노출, 노출률, 한 판당 노출, 수익
 *
 * 숫자를 합치는 규칙은 주간 리포트와 같다(weekly/numbers.ts) - 더해도 되는 숫자만 더한다.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { check, selectAll } from "../db.ts";
import { addDays, ymdRange } from "../dates.ts";
import { weeklyNumbers, type Week, type WeeklyInput, type WeeklyNumbers } from "../weekly/numbers.ts";

export type DailyPoint = {
  day: string;
  igViews: number;
  igProfileViews: number;
  igLinkClicks: number;
  webSessions: number;
  webFromInstagram: number;
  downloadClicks: number;
  appStoreNew: number;
  firstOpenAndroid: number;
  firstOpenIos: number;
  gameStarts: number;
  adImpressions: number;
  adEarningsMicros: number;
};

export type PostRow = {
  id: string;
  postedAt: string;
  productType: string;
  caption: string | null;
  permalink: string;
  views: number | null;
  reach: number | null;
  shares: number | null;
  profileVisits: number | null;
  bioLinkClicks: number | null;
};

export type CampaignRow = { source: string; medium: string; campaign: string; content: string; sessions: number };

export type Dashboard = {
  range: Week;
  previous: Week;
  totals: { current: WeeklyNumbers; previous: WeeklyNumbers };
  daily: DailyPoint[];
  posts: PostRow[];
  webCampaigns: CampaignRow[];
  appCampaigns: (CampaignRow & { platform: string })[];
  /** 마지막으로 숫자가 들어온 날. 화면에 "언제 기준인지" 적는다 */
  freshness: { instagram: string | null; ga4: string | null; appstore: string | null; admob: string | null };
};

/** 같은 길이의 바로 앞 기간 */
export function previousRange(r: Week): Week {
  const days = ymdRange(r.start, r.end).length;
  return { start: addDays(r.start, -days), end: addDays(r.start, -1) };
}

const isInstagram = (source: string) => /instagram/i.test(source);

/** 날마다 한 줄. 데이터가 없는 날도 0 으로 채워 차트가 끊기지 않게 한다 */
export function dailySeries(input: WeeklyInput, r: Week): DailyPoint[] {
  const byDay = new Map<string, DailyPoint>(
    ymdRange(r.start, r.end).map((day) => [
      day,
      {
        day,
        igViews: 0,
        igProfileViews: 0,
        igLinkClicks: 0,
        webSessions: 0,
        webFromInstagram: 0,
        downloadClicks: 0,
        appStoreNew: 0,
        firstOpenAndroid: 0,
        firstOpenIos: 0,
        gameStarts: 0,
        adImpressions: 0,
        adEarningsMicros: 0,
      },
    ]),
  );
  const at = (day: string) => byDay.get(day);
  for (const d of input.instagramDays) {
    const p = at(d.day);
    if (!p) continue;
    p.igViews += d.views ?? 0;
    p.igProfileViews += d.profileViews ?? 0;
    p.igLinkClicks += d.websiteClicks ?? 0;
  }
  for (const g of input.ga4) {
    const p = at(g.day);
    if (!p) continue;
    const [first, second] = g.key.split("/");
    if (g.property === "web" && g.breakdown === "total" && g.metric === "sessions") p.webSessions += g.value;
    if (g.property === "web" && g.breakdown === "session_campaign" && g.metric === "sessions" && isInstagram(first)) p.webFromInstagram += g.value;
    if (g.property === "web" && g.breakdown === "event" && g.key === "app_download_click" && g.metric === "eventCount") p.downloadClicks += g.value;
    if (g.property === "app" && g.breakdown === "event" && g.metric === "eventCount") {
      if (first === "first_open" && second === "Android") p.firstOpenAndroid += g.value;
      if (first === "first_open" && second === "iOS") p.firstOpenIos += g.value;
      if (first === "game_start") p.gameStarts += g.value;
    }
  }
  for (const s of input.appstoreSales) {
    const p = at(s.day);
    if (p && ["1", "1F", "1T"].includes(s.productType)) p.appStoreNew += s.units;
  }
  for (const a of input.admob) {
    const p = at(a.day);
    if (!p) continue;
    p.adImpressions += a.impressions;
    p.adEarningsMicros += a.earningsMicros;
  }
  return [...byDay.values()];
}

/** UTM 캠페인 표. 출처/매체/캠페인/버튼(/플랫폼) 키를 풀어 기간 합으로 */
export function campaigns(
  rows: WeeklyInput["ga4"],
  r: Week,
  property: "web" | "app",
): (CampaignRow & { platform: string })[] {
  const breakdown = property === "web" ? "session_campaign" : "first_user_campaign";
  const metric = property === "web" ? "sessions" : "newUsers";
  const sum = new Map<string, number>();
  for (const g of rows) {
    if (g.property !== property || g.breakdown !== breakdown || g.metric !== metric || g.day < r.start || g.day > r.end) continue;
    sum.set(g.key, (sum.get(g.key) ?? 0) + g.value);
  }
  return [...sum.entries()]
    .map(([key, sessions]) => {
      const [source = "", medium = "", campaign = "", content = ""] = key.split("/");
      // 앱 첫 실행은 버튼 대신 플랫폼이 네 번째 칸이다
      return property === "web"
        ? { source, medium, campaign, content, platform: "", sessions }
        : { source, medium, campaign, content: "", platform: content, sessions };
    })
    .sort((a, b) => b.sessions - a.sessions);
}

/** 기간에 맞는 줄을 모두 읽는다. 앞 기간까지 한 번에 읽어 비교에 쓴다 */
export async function loadDashboard(client: SupabaseClient, range: Week): Promise<Dashboard> {
  const previous = previousRange(range);
  const from = previous.start;
  const to = range.end;
  // 긴 기간을 고르면 어느 표든 1,000줄을 넘을 수 있어 전부 쪽을 넘겨 읽는다 (db.ts selectAll)
  const [igDays, igMedia, ga4, sales, admob, fresh] = await Promise.all([
    selectAll((a, b) => client.from("instagram_account_daily").select("day, views, profile_views, website_clicks").gte("day", from).lte("day", to).order("day").range(a, b), "인스타 하루 지표 읽기"),
    selectAll((a, b) => client.from("instagram_media").select("id, posted_at, product_type, caption, permalink").gte("posted_at", `${addDays(from, -1)}T00:00:00Z`).lte("posted_at", `${addDays(to, 1)}T23:59:59Z`).order("posted_at").order("id").range(a, b), "게시물 읽기"),
    selectAll(
      (a, b) =>
        client.from("ga4_daily").select("property, day, breakdown, key, metric, value").gte("day", from).lte("day", to)
          .order("day").order("property").order("breakdown").order("key").order("metric").range(a, b),
      "GA4 읽기",
    ),
    selectAll((a, b) => client.from("appstore_sales_daily").select("day, product_type, units, country, device").gte("day", from).lte("day", to).order("day").order("country").order("product_type").order("device").range(a, b), "App Store 판매 읽기"),
    selectAll((a, b) => client.from("admob_daily").select("day, earnings_micros, matched_requests, impressions, platform, format, country").gte("day", from).lte("day", to).order("day").order("platform").order("format").order("country").range(a, b), "AdMob 읽기"),
    Promise.all([
      client.from("instagram_account_daily").select("day").order("day", { ascending: false }).limit(1).maybeSingle(),
      client.from("ga4_daily").select("day").order("day", { ascending: false }).limit(1).maybeSingle(),
      client.from("appstore_sales_daily").select("day").order("day", { ascending: false }).limit(1).maybeSingle(),
      client.from("admob_daily").select("day").order("day", { ascending: false }).limit(1).maybeSingle(),
    ]),
  ]);

  const media = igMedia as { id: string; posted_at: string; product_type: string; caption: string | null; permalink: string }[];
  const input: WeeklyInput = {
    instagramDays: (igDays as { day: string; views: number | null; profile_views: number | null; website_clicks: number | null }[]).map((r) => ({
      day: r.day,
      views: r.views,
      profileViews: r.profile_views,
      websiteClicks: r.website_clicks,
    })),
    instagramPosts: media.map((m) => ({ postedAt: m.posted_at })),
    ga4: ga4 as WeeklyInput["ga4"],
    appstoreSales: (sales as { day: string; product_type: string; units: number }[]).map((r) => ({ day: r.day, productType: r.product_type, units: r.units })),
    admob: (admob as { day: string; earnings_micros: number; matched_requests: number; impressions: number }[]).map((r) => ({
      day: r.day,
      earningsMicros: Number(r.earnings_micros),
      matchedRequests: Number(r.matched_requests),
      impressions: Number(r.impressions),
    })),
  };

  // 기간 안에 올린 게시물의 최신 누적값
  const inRange = media.filter((m) => {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(m.posted_at));
    return day >= range.start && day <= range.end;
  });
  type Snap = { media_id: string; views: number | null; reach: number | null; shares: number | null; profile_visits: number | null; bio_link_clicks: number | null };
  const latest = new Map<string, Snap>();
  if (inRange.length) {
    const snaps = check(
      await client
        .from("instagram_media_daily")
        .select("media_id, captured_on, views, reach, shares, profile_visits, bio_link_clicks")
        .in("media_id", inRange.map((m) => m.id))
        .order("captured_on", { ascending: false }),
      "게시물 숫자 읽기",
    ) as Snap[];
    for (const s of snaps) if (!latest.has(s.media_id)) latest.set(s.media_id, s);
  }
  const [fIg, fGa, fAs, fAd] = fresh.map((r) => (r.data as { day: string } | null)?.day ?? null);

  return {
    range,
    previous,
    totals: { current: weeklyNumbers(input, range), previous: weeklyNumbers(input, previous) },
    daily: dailySeries(input, range),
    posts: inRange.map((m) => {
      const s = latest.get(m.id);
      return {
        id: m.id,
        postedAt: m.posted_at,
        productType: m.product_type,
        caption: m.caption,
        permalink: m.permalink,
        views: s?.views ?? null,
        reach: s?.reach ?? null,
        shares: s?.shares ?? null,
        profileVisits: s?.profile_visits ?? null,
        bioLinkClicks: s?.bio_link_clicks ?? null,
      };
    }),
    webCampaigns: campaigns(input.ga4, range, "web").map(({ source, medium, campaign, content, sessions }) => ({ source, medium, campaign, content, sessions })),
    appCampaigns: campaigns(input.ga4, range, "app"),
    freshness: { instagram: fIg, ga4: fGa, appstore: fAs, admob: fAd },
  };
}
