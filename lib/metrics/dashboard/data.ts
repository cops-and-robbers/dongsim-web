/**
 * 어드민 지표 화면의 데이터 (#145). 서버 라우트(/api/admin/metrics)만 부른다.
 *
 * 화면은 콘솔을 옮겨 놓지 않고 질문 몇 개에 답한다.
 * 1. 이 기간 어디서 와서 어디까지 갔나 - 인스타 → 웹 → 다운로드 버튼 → 설치 → 첫 실행 → 게임
 * 2. 날마다 어땠나 - 소스별 추이, 게시물을 올린 날 표시
 * 3. 게시물별, 들어온 경로별 숫자 - 게시물 표, 캠페인(UTM) 표
 * 4. 광고 - 노출, 노출률, 한 판당 노출, 수익
 *
 * 숫자를 합치는 규칙은 주간 리포트와 같다(weekly/numbers.ts) - 더해도 되는 숫자만 더한다.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { selectAll } from "../db.ts";
import type { Source } from "./sources.ts";
import { CHANNELS, channelOf, isInternal, type Channel } from "../channels.ts";
import { addDays, ymdRange } from "../dates.ts";
import { splitKey } from "../ga4/run.ts";
import { funnelData, type FunnelData } from "../funnel.ts";
import { fromInstagram, playWindow, shiftPt, weeklyNumbers, type Week, type WeeklyInput, type WeeklyNumbers } from "../weekly/numbers.ts";

export type DailyPoint = {
  day: string;
  igViews: number;
  igProfileViews: number;
  igLinkClicks: number;
  webSessions: number;
  webFromInstagram: number;
  downloadClicks: number;
  downloadClicksFromInstagram: number;
  appStoreNew: number;
  firstOpenAndroid: number;
  firstOpenIos: number;
  /** 게임 참가(사람 기준). 앱 이벤트는 참가자마다 찍혀 판 수가 아니다 */
  playerStarts: number;
  /** 하루 활성 사용자(Android+iOS) */
  dau: number;
  adImpressions: number;
  adEarningsMicros: number;
  /** Google Play 그날 처음 설치한 사람, 지운 사람(PT 날짜를 하루 뒤 한국 날짜로 옮겼다, #147) */
  playInstalls: number;
  playUninstalls: number;
  /** 앱이 깔려 있고 최근 30일 안에 켜진 Android 기기. 그날의 누적값이라 더하지 않는다 */
  playActiveDevices: number;
  /** 앱이 없는 사람 중 Play 스토어 등록정보를 본 사람 */
  playStoreVisitors: number;
  /** App Store 노출, 제품 페이지 조회(분석 리포트, 횟수) */
  appStoreImpressions: number;
  appStorePageViews: number;
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
  likes: number | null;
  comments: number | null;
  saved: number | null;
  follows: number | null;
  /** 인스타가 주는 상호작용 수(좋아요, 댓글, 저장, 공유 등). 반응률의 분자 */
  totalInteractions: number | null;
  profileVisits: number | null;
  bioLinkClicks: number | null;
  /** 매일 아침 수집 때 찍은 누적값(오래된 날부터). 게시물 상세의 추세 차트가 쓴다 */
  series: PostSnapshot[];
};

/** 게시물 하나의 그날 아침 누적값. day 는 찍은 한국 날짜 */
export type PostSnapshot = {
  day: string;
  views: number | null;
  reach: number | null;
  shares: number | null;
  saved: number | null;
  profileVisits: number | null;
  bioLinkClicks: number | null;
};

/** 채널별 방문과 그중 스토어로 넘어간 방문 (우리 팀 방문은 뺀다). 스토어 쪽은 한 방문에서 여러 번 눌러도 한 번 */
export type ChannelRow = { channel: Channel; sessions: number; storeSessions: number; linkSessions: number };

/** 백엔드 게임 기록으로 센 실제 판 수. 어드민 토큰으로만 읽혀 라우트가 따로 붙인다(games.ts) */
export type GamesBlock = {
  current: { games: number; players: number };
  previous: { games: number; players: number };
  /** daily[i] 는 range 의 i 번째 날 */
  daily: number[];
  previousDaily: number[];
  /** 읽다 막혔거나 너무 많아 끊었을 때 */
  error: string | null;
};

export type CampaignRow = { source: string; medium: string; campaign: string; content: string; sessions: number };

export type Dashboard = {
  range: Week;
  previous: Week;
  totals: { current: WeeklyNumbers; previous: WeeklyNumbers };
  daily: DailyPoint[];
  /** 앞 기간 날짜별. 차트에 회색 선으로 겹친다 */
  previousDaily: DailyPoint[];
  posts: PostRow[];
  webCampaigns: CampaignRow[];
  appCampaigns: (CampaignRow & { platform: string })[];
  channels: { current: ChannelRow[]; previous: ChannelRow[] };
  /** 나라별 최초 설치(이 기간). App Store 최초 다운로드와 Google Play 최초 설치(들어온 날까지) */
  countries: { country: string; appStore: number; play: number }[];
  /** App Store 나라별 노출, 제품 페이지 조회(분석 리포트)와 최초 다운로드(판매 리포트) */
  appStoreTerritories: { country: string; impressions: number; pageViews: number; downloads: number }[];
  /**
   * Google Play 합계(#147). 3~7일 늦게 들어와 들어온 날까지 잘라 비교 기간도 같은 날 수로 셌다(numbers.ts playWindow).
   * 비정상 종료, 응답 없음, 평점은 파일이 더 빨리 채워져 자르지 않고 기간 전체다
   * until 은 들어온 마지막 날(한국 날짜). window 가 null 이면 이 기간엔 Play 숫자가 없다
   */
  play: {
    until: string | null;
    window: { current: Week; previous: Week; cut: boolean } | null;
    current: WeeklyNumbers["play"];
    previous: WeeklyNumbers["play"];
    /** 이 기간 비정상 종료가 난 버전(코드)과 횟수, 많은 순 */
    crashVersions: { code: string; crashes: number }[];
  };
  /** 인스타 팔로워 수. 0004 마이그레이션 전이거나 아직 기록이 없으면 null */
  followers: { now: number; nowDay: string; change: number | null; changeFrom: string | null } | null;
  /** 차트에 겹쳐 그릴 일정(행사, 업데이트). 0004 마이그레이션 전이면 null */
  events: { id: number; day: string; label: string }[] | null;
  games: GamesBlock | null;
  /** 신규 사용자 퍼널(funnel.ts). 화면이 플랫폼과 나라를 골라 pickFunnel 로 본다 */
  funnel: { current: FunnelData; previous: FunnelData };
  /** 마지막으로 숫자가 들어온 날(한국 날짜, 인스타는 shiftPt 로 옮긴 값). 화면에 "언제 기준인지" 적는다 */
  freshness: Record<Source, string | null>;
  /**
   * 소스마다 숫자가 있는 첫날(같은 기준). 이 앞과 freshness 뒤는 0 이 아니라 "숫자 없음"이다.
   * 화면은 그 구간을 0 으로 그리지 않고 선을 끊는다(인스타는 30일 전까지만 받을 수 있었다)
   */
  since: Record<Source, string | null>;
};

/** 같은 길이의 바로 앞 기간 */
export function previousRange(r: Week): Week {
  const days = ymdRange(r.start, r.end).length;
  return { start: addDays(r.start, -days), end: addDays(r.start, -1) };
}

/**
 * 날마다 한 줄. 데이터가 없는 날도 0 으로 채워 차트가 끊기지 않게 한다.
 * 인스타 계정 지표는 PT 날짜라 하루 뒤 한국 날짜에 놓는다(numbers.ts shiftPt). App Store 판매는 한국 날짜 그대로다(#154).
 * 합계(weeklyNumbers)와 같은 날에 놓아야 차트를 더한 값과 위 숫자가 맞는다
 */
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
        downloadClicksFromInstagram: 0,
        appStoreNew: 0,
        firstOpenAndroid: 0,
        firstOpenIos: 0,
        playerStarts: 0,
        dau: 0,
        adImpressions: 0,
        adEarningsMicros: 0,
        playInstalls: 0,
        playUninstalls: 0,
        playActiveDevices: 0,
        playStoreVisitors: 0,
        appStoreImpressions: 0,
        appStorePageViews: 0,
      },
    ]),
  );
  const at = (day: string) => byDay.get(day);
  for (const d of input.instagramDays) {
    const p = at(shiftPt(d.day));
    if (!p) continue;
    p.igViews += d.views ?? 0;
    p.igProfileViews += d.profileViews ?? 0;
    p.igLinkClicks += d.websiteClicks ?? 0;
  }
  for (const g of input.ga4) {
    const p = at(g.day);
    if (!p) continue;
    const [first] = splitKey(g.key);
    if (g.property === "web" && g.breakdown === "total" && g.metric === "sessions") p.webSessions += g.value;
    // 우리 팀 개발 방문은 방문과 버튼 클릭에서 뺀다(weeklyNumbers 와 같은 규칙)
    if (g.property === "web" && g.breakdown === "session_campaign" && g.metric === "sessions" && isInternal(first)) p.webSessions -= g.value;
    if (g.property === "web" && g.breakdown === "download_source" && g.metric === "eventCount" && isInternal(first)) p.downloadClicks -= g.value;
    if (g.property === "app" && g.breakdown === "platform" && g.metric === "activeUsers") p.dau += g.value;
    // 첫 실행은 테스트 기기를 뺀 줄로(weeklyNumbers 와 같은 규칙, #157)
    if (g.property === "app" && g.breakdown === "first_open_country" && g.metric === "eventCount") {
      if (first === "Android") p.firstOpenAndroid += g.value;
      if (first === "iOS") p.firstOpenIos += g.value;
    }
    if (g.property === "web" && g.breakdown === "session_campaign" && g.metric === "sessions" && fromInstagram(first)) p.webFromInstagram += g.value;
    if (g.property === "web" && g.breakdown === "download_source" && g.metric === "eventCount" && fromInstagram(first)) p.downloadClicksFromInstagram += g.value;
    if (g.property === "web" && g.breakdown === "event" && g.key === "app_download_click" && g.metric === "eventCount") p.downloadClicks += g.value;
    if (g.property === "app" && g.breakdown === "event" && g.metric === "eventCount") {
      if (first === "game_start") p.playerStarts += g.value;
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
  // Play 는 PT 날짜라 하루 뒤로 옮긴다(numbers.ts 와 같은 규칙). 스토어 등록정보는 나라 축을 더한 값이 전체다
  for (const r of input.play ?? []) {
    const p = at(shiftPt(r.day));
    if (!p) continue;
    if (r.report === "installs" && r.dim === "overview") {
      if (r.metric === "user_installs") p.playInstalls += r.value;
      if (r.metric === "user_uninstalls") p.playUninstalls += r.value;
      if (r.metric === "active_devices") p.playActiveDevices = r.value;
    }
    if (r.report === "store" && r.dim === "country" && r.metric === "visitors") p.playStoreVisitors += r.value;
  }
  for (const e of input.appstoreEngagement ?? []) {
    const p = at(e.day);
    if (!p) continue;
    if (e.event === "Impression") p.appStoreImpressions += e.counts;
    if (e.event === "Page view") p.appStorePageViews += e.counts;
  }
  return [...byDay.values()];
}

/** UTM 캠페인 표. 출처|매체|캠페인|버튼(|플랫폼) 키를 풀어 기간 합으로 */
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
    if (property === "web" && isInternal(splitKey(g.key)[0])) continue;
    sum.set(g.key, (sum.get(g.key) ?? 0) + g.value);
  }
  return [...sum.entries()]
    .map(([key, sessions]) => {
      const [source = "", medium = "", campaign = "", content = ""] = splitKey(key);
      // 앱 첫 실행은 버튼 대신 플랫폼이 네 번째 칸이다
      return property === "web"
        ? { source, medium, campaign, content, platform: "", sessions }
        : { source, medium, campaign, content: "", platform: content, sessions };
    })
    .sort((a, b) => b.sessions - a.sessions);
}

/** 채널별 방문과 스토어로 넘어간 방문. 둘 다 0 인 채널은 뺀다 */
export function channelTable(rows: WeeklyInput["ga4"], r: Week): ChannelRow[] {
  const by = new Map<Channel, ChannelRow>(CHANNELS.map((c) => [c, { channel: c, sessions: 0, storeSessions: 0, linkSessions: 0 }]));
  for (const g of rows) {
    if (g.property !== "web" || g.day < r.start || g.day > r.end) continue;
    const [source = "", medium = ""] = splitKey(g.key);
    if (isInternal(source)) continue;
    const row = by.get(channelOf(source, medium));
    if (!row) continue;
    if (g.breakdown === "session_campaign" && g.metric === "sessions") row.sessions += g.value;
    if (g.breakdown === "download_source" && g.metric === "sessions") row.storeSessions += g.value;
    // download_page 의 key 는 출처|매체|페이지. /download 에서 넘어간 방문(들어오자마자 넘어간 방문)
    if (g.breakdown === "download_page" && g.metric === "sessions" && splitKey(g.key)[2] === "/download") row.linkSessions += g.value;
  }
  return [...by.values()].filter((c) => c.sessions > 0 || c.storeSessions > 0);
}

/** 기간에 맞는 줄을 모두 읽는다. 앞 기간까지 한 번에 읽어 비교에 쓴다 */
/**
 * previous 는 비교 기간(#152). 안 주면 바로 앞 같은 길이. 비교 기간은 늘 지금 기간보다 앞이라
 * (calendar.ts compareError) 비교 기간 첫날부터 지금 기간 끝까지 한 번에 읽는다
 */
export async function loadDashboard(client: SupabaseClient, range: Week, previous: Week = previousRange(range)): Promise<Dashboard> {
  const from = previous.start;
  const to = range.end;
  // 인스타(PT 날짜)는 하루 뒤로 옮겨 쓰므로 하루 앞부터 읽는다
  const ptFrom = addDays(from, -1);
  // 긴 기간을 고르면 어느 표든 1,000줄을 넘을 수 있어 전부 쪽을 넘겨 읽는다 (db.ts selectAll)
  // 0004 마이그레이션 전이면 테이블이 없다. 그 칸만 비우고 화면은 그대로 그린다
  const optional = async <T>(read: () => Promise<T>): Promise<T | null> => {
    try {
      return await read();
    } catch {
      return null;
    }
  };
  // Play 는 PT 날짜를 하루 뒤로 옮겨 쓰고, 기간 첫날 전날의 설치 기기 수도 보므로 이틀 앞부터 읽는다
  const playFrom = addDays(from, -2);
  const [igDays, igMedia, ga4, sales, admob, fresh, followerRows, eventRows, playRows, playCountryRows, engagementRows] = await Promise.all([
    selectAll((a, b) => client.from("instagram_account_daily").select("day, views, profile_views, website_clicks").gte("day", ptFrom).lte("day", to).order("day").range(a, b), "인스타 하루 지표 읽기"),
    selectAll((a, b) => client.from("instagram_media").select("id, posted_at, product_type, caption, permalink").gte("posted_at", `${addDays(from, -1)}T00:00:00Z`).lte("posted_at", `${addDays(to, 1)}T23:59:59Z`).order("posted_at").order("id").range(a, b), "게시물 읽기"),
    selectAll(
      (a, b) =>
        client.from("ga4_daily").select("property, day, breakdown, key, metric, value").gte("day", from).lte("day", to)
          .order("day").order("property").order("breakdown").order("key").order("metric").range(a, b),
      "GA4 읽기",
    ),
    selectAll((a, b) => client.from("appstore_sales_daily").select("day, product_type, units, country, device").gte("day", from).lte("day", to).order("day").order("country").order("product_type").order("device").range(a, b), "App Store 판매 읽기"),
    selectAll((a, b) => client.from("admob_daily").select("day, earnings_micros, matched_requests, impressions, platform, format, country").gte("day", from).lte("day", to).order("day").order("platform").order("format").order("country").range(a, b), "AdMob 읽기"),
    // 소스마다 마지막 날과 첫날. GA4 는 사이트와 앱을 따로(시작일이 다르다)
    Promise.all(
      (
        [
          ["instagram_account_daily", null],
          ["ga4_daily", "web"],
          ["ga4_daily", "app"],
          ["appstore_sales_daily", null],
          ["admob_daily", null],
        ] as const
      ).flatMap(([table, property]) =>
        [false, true].map((ascending) => {
          const q = client.from(table).select("day");
          return (property ? q.eq("property", property) : q).order("day", { ascending }).limit(1).maybeSingle();
        }),
      ),
    ),
    optional(() =>
      selectAll<{ captured_on: string; followers: number }>(
        (a, b) => client.from("instagram_followers").select("captured_on, followers").lte("captured_on", addDays(to, 1)).order("captured_on").range(a, b),
        "팔로워 읽기",
      ),
    ),
    optional(() =>
      selectAll<{ id: number; day: string; label: string }>(
        (a, b) => client.from("metrics_events").select("id, day, label").gte("day", from).lte("day", to).order("day").order("id").range(a, b),
        "일정 읽기",
      ),
    ),
    // 0005 마이그레이션 전이면 테이블이 없다. Play 칸만 비운다
    optional(() =>
      selectAll<PlayRow>(
        (a, b) =>
          client
            .from("play_daily")
            .select("report, dim, key, day, metric, value")
            .or("dim.eq.overview,and(report.eq.store,dim.eq.country),and(report.eq.crashes,dim.eq.app_version)")
            .gte("day", playFrom)
            .lte("day", to)
            .order("day")
            .order("report")
            .order("dim")
            .order("key")
            .order("metric")
            .range(a, b),
        "Play 읽기",
      ),
    ),
    // 나라별 설치. 나라 축은 줄이 많아(나라마다 활성 기기 수가 매일 있다) 설치 지표만 따로 읽는다
    optional(() =>
      selectAll<PlayRow>(
        (a, b) =>
          client
            .from("play_daily")
            .select("report, dim, key, day, metric, value")
            .eq("report", "installs")
            .eq("dim", "country")
            .eq("metric", "user_installs")
            .gte("day", addDays(range.start, -1))
            .lte("day", to)
            .order("day")
            .order("key")
            .range(a, b),
        "Play 나라별 설치 읽기",
      ),
    ),
    // App Store 노출, 제품 페이지 조회(분석 리포트). 칸이 잘게 나뉘어 하루 70줄 남짓이다
    selectAll<{ day: string; dims: Record<string, string>; counts: number | null; unique_counts: number | null }>(
      (a, b) =>
        client
          .from("appstore_analytics_daily")
          .select("day, dims, counts, unique_counts")
          .eq("report", "engagement")
          .gte("day", from)
          .lte("day", to)
          .order("day")
          .order("dims_key")
          .range(a, b),
      "App Store 분석 읽기",
    ),
  ]);

  // Play, App Store 분석 리포트의 첫날과 마지막 날. Play 는 PT 라 화면에 쓸 때 하루 뒤로 옮긴다
  const edge = async (table: string, filters: Record<string, string>, ascending: boolean): Promise<string | null> => {
    let q = client.from(table).select("day");
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    const res = await q.order("day", { ascending }).limit(1).maybeSingle();
    return res.error ? null : ((res.data as { day: string } | null)?.day ?? null);
  };
  const [playLast, playFirst, storeLast, storeFirst, asaLast, asaFirst] = await Promise.all([
    edge("play_daily", { report: "installs", dim: "overview", metric: "user_installs" }, false),
    edge("play_daily", { report: "installs", dim: "overview", metric: "user_installs" }, true),
    edge("play_daily", { report: "store", dim: "country" }, false),
    edge("play_daily", { report: "store", dim: "country" }, true),
    edge("appstore_analytics_daily", { report: "engagement" }, false),
    edge("appstore_analytics_daily", { report: "engagement" }, true),
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
    play: playRows ?? [],
    appstoreEngagement: engagementRows.map((r) => ({ day: r.day, event: r.dims.Event ?? "", counts: Number(r.counts ?? 0), uniqueCounts: Number(r.unique_counts ?? 0) })),
  };
  const playUntil = playLast ? shiftPt(playLast) : null;
  const pw = playWindow(range, previous, playUntil);
  const emptyPlay = weeklyNumbers({ ...input, play: [] }, range).play;
  // 비정상 종료와 평점 파일은 설치 파일보다 빨리 채워진다(2026-10-07: 설치 9/30, 비정상 종료 10/3).
  // 설치가 들어온 날로 자르면 그 사이 비정상 종료가 빠져서 이 둘은 기간 전체로 센다
  const playOf = (w: Week | undefined, whole: Week) => {
    const cut = w ? weeklyNumbers(input, w).play : emptyPlay;
    const full = weeklyNumbers(input, whole).play;
    return { ...cut, crashes: full.crashes, anrs: full.anrs, ratingTotal: full.ratingTotal };
  };

  // 기간 안에 올린 게시물의 최신 누적값
  const inRange = media.filter((m) => {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(m.posted_at));
    return day >= range.start && day <= range.end;
  });
  type Snap = {
    media_id: string;
    captured_on: string;
    views: number | null;
    reach: number | null;
    shares: number | null;
    likes: number | null;
    comments: number | null;
    saved: number | null;
    follows: number | null;
    total_interactions: number | null;
    profile_visits: number | null;
    bio_link_clicks: number | null;
  };
  const latest = new Map<string, Snap>();
  const seriesOf = new Map<string, PostSnapshot[]>();
  if (inRange.length) {
    // 게시물 하나가 날마다 한 줄씩 쌓여 13주면 1,000줄을 넘는다. 끝까지 읽는다
    const snaps = await selectAll<Snap>(
      (a, b) =>
        client
          .from("instagram_media_daily")
          .select("media_id, captured_on, views, reach, shares, likes, comments, saved, follows, total_interactions, profile_visits, bio_link_clicks")
          .in("media_id", inRange.map((m) => m.id))
          .order("captured_on", { ascending: false })
          .order("media_id")
          .range(a, b),
      "게시물 숫자 읽기",
    );
    for (const s of snaps) {
      if (!latest.has(s.media_id)) latest.set(s.media_id, s);
      const list = seriesOf.get(s.media_id) ?? [];
      list.push({
        day: s.captured_on,
        views: s.views,
        reach: s.reach,
        shares: s.shares,
        saved: s.saved,
        profileVisits: s.profile_visits,
        bioLinkClicks: s.bio_link_clicks,
      });
      seriesOf.set(s.media_id, list);
    }
  }
  const [fIg, sIg, fWeb, sWeb, fApp, sApp, fAs, sAs, fAd, sAd] = fresh.map((r) => (r.data as { day: string } | null)?.day ?? null);
  // 차트와 같은 날짜로 보이게 인스타(PT 날짜)도 한국 날짜로 옮겨 적는다
  const kst = (day: string | null) => (day ? shiftPt(day) : null);

  return {
    range,
    previous,
    totals: { current: weeklyNumbers(input, range), previous: weeklyNumbers(input, previous) },
    daily: dailySeries(input, range),
    previousDaily: dailySeries(input, previous),
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
        likes: s?.likes ?? null,
        comments: s?.comments ?? null,
        saved: s?.saved ?? null,
        follows: s?.follows ?? null,
        totalInteractions: s?.total_interactions ?? null,
        profileVisits: s?.profile_visits ?? null,
        bioLinkClicks: s?.bio_link_clicks ?? null,
        // 읽을 때 최신순이라 뒤집어 오래된 날부터
        series: [...(seriesOf.get(m.id) ?? [])].reverse(),
      };
    }),
    webCampaigns: campaigns(input.ga4, range, "web").map(({ source, medium, campaign, content, sessions }) => ({ source, medium, campaign, content, sessions })),
    appCampaigns: campaigns(input.ga4, range, "app"),
    channels: { current: channelTable(input.ga4, range), previous: channelTable(input.ga4, previous) },
    countries: countryTable(sales as { day: string; product_type: string; units: number; country: string }[], playCountryRows ?? [], range),
    appStoreTerritories: territoryTable(engagementRows, sales as { day: string; product_type: string; units: number; country: string }[], range),
    play: {
      until: playUntil,
      window: pw,
      current: playOf(pw?.current, range),
      previous: playOf(pw?.previous, previous),
      crashVersions: crashVersions(playRows ?? [], range),
    },
    followers: followerSummary(followerRows, range),
    events: eventRows,
    games: null,
    funnel: { current: funnelData(input.ga4, range, fApp), previous: funnelData(input.ga4, previous, fApp) },
    freshness: { instagram: kst(fIg), ga4web: fWeb, ga4app: fApp, appstore: fAs, admob: fAd, play: kst(playLast), playStore: kst(storeLast), appstorePage: asaLast },
    since: { instagram: kst(sIg), ga4web: sWeb, ga4app: sApp, appstore: sAs, admob: sAd, play: kst(playFirst), playStore: kst(storeFirst), appstorePage: asaFirst },
  };
}

type PlayRow = { report: string; dim: string; key: string; day: string; metric: string; value: number };

/**
 * 나라별 최초 설치. App Store 최초 다운로드(판매 날짜는 한국 날짜와 맞는다, #154)와
 * Google Play 최초 설치(PT 날짜를 하루 뒤로, 들어온 날까지)를 나라 코드로 합친다
 */
export function countryTable(
  rows: { day: string; product_type: string; units: number; country: string }[],
  playRows: PlayRow[],
  r: Week,
): Dashboard["countries"] {
  const by = new Map<string, { appStore: number; play: number }>();
  const add = (country: string, k: "appStore" | "play", n: number) => {
    const o = by.get(country) ?? { appStore: 0, play: 0 };
    o[k] += n;
    by.set(country, o);
  };
  for (const s of rows) {
    if (s.day < r.start || s.day > r.end || !["1", "1F", "1T"].includes(s.product_type)) continue;
    add(s.country, "appStore", s.units);
  }
  for (const p of playRows) {
    const day = shiftPt(p.day);
    if (day < r.start || day > r.end || p.report !== "installs" || p.dim !== "country" || p.metric !== "user_installs") continue;
    // ZZ 는 Play 가 나라를 모를 때 쓰는 코드다
    add(p.key === "ZZ" ? "" : p.key, "play", p.value);
  }
  return [...by.entries()]
    .map(([country, v]) => ({ country, ...v }))
    .sort((a, b) => b.appStore + b.play - (a.appStore + a.play));
}

/**
 * App Store 나라별 노출, 제품 페이지 조회(분석 리포트, 횟수)와 최초 다운로드(판매 리포트).
 * 분석 리포트는 사용자 5명 미만 칸을 애플이 빼서, 작은 나라는 노출이 실제보다 적거나 0 으로 보인다
 */
export function territoryTable(
  engagement: { day: string; dims: Record<string, string>; counts: number | null }[],
  sales: { day: string; product_type: string; units: number; country: string }[],
  r: Week,
): Dashboard["appStoreTerritories"] {
  const by = new Map<string, { impressions: number; pageViews: number; downloads: number }>();
  const row = (c: string) => {
    const o = by.get(c) ?? { impressions: 0, pageViews: 0, downloads: 0 };
    by.set(c, o);
    return o;
  };
  for (const e of engagement) {
    if (e.day < r.start || e.day > r.end) continue;
    const o = row(e.dims.Territory ?? "");
    if (e.dims.Event === "Impression") o.impressions += Number(e.counts ?? 0);
    if (e.dims.Event === "Page view") o.pageViews += Number(e.counts ?? 0);
  }
  // 분석 리포트가 있는 날만 다운로드를 더한다. 노출이 없는 날의 다운로드까지 넣으면 나라별 비율이 부풀려진다
  const days = new Set(engagement.filter((e) => e.day >= r.start && e.day <= r.end).map((e) => e.day));
  for (const s of sales) {
    if (!days.has(s.day) || !["1", "1F", "1T"].includes(s.product_type)) continue;
    row(s.country).downloads += s.units;
  }
  return [...by.entries()].map(([country, v]) => ({ country, ...v })).sort((a, b) => b.impressions - a.impressions);
}

/** 이 기간 비정상 종료가 난 버전 코드와 횟수 */
export function crashVersions(rows: PlayRow[], r: Week): { code: string; crashes: number }[] {
  const by = new Map<string, number>();
  for (const p of rows) {
    const day = shiftPt(p.day);
    if (p.report !== "crashes" || p.dim !== "app_version" || p.metric !== "crashes" || day < r.start || day > r.end) continue;
    by.set(p.key, (by.get(p.key) ?? 0) + p.value);
  }
  return [...by.entries()].map(([code, crashes]) => ({ code, crashes })).sort((a, b) => b.crashes - a.crashes);
}

/**
 * 팔로워 수와 이 기간의 증감. 기록은 매일 아침 수집 때 찍혀서, D 일 아침 기록은 D-1 일이 끝났을 때의 수다.
 * 그래서 기간 [S, E] 의 증감은 S 아침 기록(없으면 그 뒤 첫 기록)과 E+1 아침 기록(없으면 그 전 마지막 기록)의 차이다
 */
export function followerSummary(rows: { captured_on: string; followers: number }[] | null, r: Week): Dashboard["followers"] {
  if (!rows) return null;
  const upto = rows.filter((x) => x.captured_on <= addDays(r.end, 1));
  const last = upto.at(-1);
  if (!last) return null;
  const before = upto.filter((x) => x.captured_on <= r.start).at(-1) ?? upto.find((x) => x.captured_on >= r.start);
  const base = before && before.captured_on !== last.captured_on ? before : null;
  return { now: last.followers, nowDay: last.captured_on, change: base ? last.followers - base.followers : null, changeFrom: base?.captured_on ?? null };
}
