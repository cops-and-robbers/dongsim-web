/**
 * 주간 리포트 한 번 (#146). 매주 월요일 오전 GitHub Actions(weekly-report.yml)가 부른다.
 *
 * 수집은 하지 않는다. 매일 수집(#140, #142, #143)이 쌓아 둔 테이블에서 지난주와
 * 그 전주를 읽어 더하고, 디스코드로 한 번 보낸다. 같은 주는 두 번 보내지 않는다.
 */

import { sendDiscord } from "../discord.ts";
import { db, selectAll } from "../db.ts";
import { addDays, todayIn } from "../dates.ts";
import { claimNotification, releaseNotification } from "../instagram/store.ts";
import { buildWeeklyReport } from "./messages.ts";
import { lastTwoWeeks, playWindow, shiftPt, weeklyNumbers, type WeeklyInput } from "./numbers.ts";
import { runGa4 } from "../ga4/run.ts";
import { runAppStore } from "../appstore/run.ts";

export type WeeklyResult = {
  ok: boolean;
  dry: boolean;
  week: { start: string; end: string };
  status: "sent" | "preview" | "already_sent" | "failed";
  content: string;
  error?: string;
};

export async function runWeekly(opts: { dry: boolean; now?: Date; webhookUrl?: string; skipRefresh?: boolean }): Promise<WeeklyResult> {
  const now = opts.now ?? new Date();
  const client = db();
  const { current, previous } = lastTwoWeeks(todayIn("Asia/Seoul", now));
  const from = previous.start;
  const to = current.end;
  // 인스타 계정 지표(PT 날짜)는 하루 뒤로 옮겨 한국 주에 맞춘다(numbers.ts shiftPt).
  // 그래서 하루 앞부터 읽는다
  const ptFrom = addDays(from, -1);

  // 월요일 아침 수집(5시 43분)은 일요일 GA4 숫자가 덜 들어온 채다. 보내기 직전에 최근 8일을 한 번 더 받아
  // 그 사이 들어온 몫을 채운다. 실패해도 리포트는 보내고, 이미 쌓인 숫자로 계산한다
  // App Store 판매도 한국 날짜라(#154) 일요일 치가 새벽 수집 때는 아직 없을 수 있어 한 번 더 받는다
  if (!opts.skipRefresh) {
    await runGa4({ dry: false, now, from: addDays(current.end, -7) }).catch(() => null);
    await runAppStore({ dry: false, now, from: addDays(current.end, -7), salesOnly: true }).catch(() => null);
  }

  // 전부 끝까지 쪽을 넘겨 읽는다(db.ts selectAll). Supabase 는 한 번에 1,000줄까지만 주고,
  // 잘려도 오류가 없어 합계가 조용히 틀린다. GA4 는 2주만 읽어도 1,000줄 가까이 된다
  const [igDays, igPosts, ga4, sales, admob, play] = await Promise.all([
    selectAll<{ day: string; views: number | null; profile_views: number | null; website_clicks: number | null }>(
      (a, b) =>
        client.from("instagram_account_daily").select("day, views, profile_views, website_clicks").gte("day", ptFrom).lte("day", to).order("day").range(a, b),
      "인스타 하루 지표 읽기",
    ),
    // 게시물은 한국 날짜로 나눈다. 앞뒤 하루씩 넉넉히 읽고 numbers 가 거른다
    selectAll<{ posted_at: string }>(
      (a, b) =>
        client
          .from("instagram_media")
          .select("posted_at")
          .gte("posted_at", `${addDays(from, -1)}T00:00:00Z`)
          .lte("posted_at", `${addDays(to, 1)}T23:59:59Z`)
          .order("posted_at")
          .order("id")
          .range(a, b),
      "인스타 게시물 읽기",
    ),
    selectAll<WeeklyInput["ga4"][number]>(
      (a, b) =>
        client
          .from("ga4_daily")
          .select("property, day, breakdown, key, metric, value")
          .gte("day", from)
          .lte("day", to)
          .in("breakdown", ["total", "session_campaign", "event", "download_source", "download_page", "platform", "retention", "activation"])
          .order("day")
          .order("property")
          .order("breakdown")
          .order("key")
          .order("metric")
          .range(a, b),
      "GA4 읽기",
    ),
    selectAll<{ day: string; product_type: string; units: number }>(
      (a, b) =>
        client
          .from("appstore_sales_daily")
          .select("day, product_type, units")
          .gte("day", from)
          .lte("day", to)
          .order("day")
          .order("country")
          .order("product_type")
          .order("device")
          .range(a, b),
      "App Store 판매 읽기",
    ),
    selectAll<{ day: string; earnings_micros: number; matched_requests: number; impressions: number }>(
      (a, b) =>
        client
          .from("admob_daily")
          .select("day, earnings_micros, matched_requests, impressions")
          .gte("day", from)
          .lte("day", to)
          .order("day")
          .order("platform")
          .order("format")
          .order("country")
          .range(a, b),
      "AdMob 읽기",
    ),
    // Google Play 설치(#147). PT 날짜라 하루 앞부터 읽고 numbers 가 하루 뒤로 옮긴다. 0005 전이면 테이블이 없어 비운다
    selectAll<NonNullable<WeeklyInput["play"]>[number]>(
      (a, b) =>
        client
          .from("play_daily")
          .select("report, dim, key, day, metric, value")
          .eq("report", "installs")
          .eq("dim", "overview")
          .gte("day", ptFrom)
          .lte("day", to)
          .order("day")
          .order("metric")
          .range(a, b),
      "Play 읽기",
    ).catch(() => []),
  ]);

  const input: WeeklyInput = {
    instagramDays: igDays.map((r) => ({
      day: r.day,
      views: r.views,
      profileViews: r.profile_views,
      websiteClicks: r.website_clicks,
    })),
    instagramPosts: igPosts.map((r) => ({ postedAt: r.posted_at })),
    ga4,
    appstoreSales: sales.map((r) => ({
      day: r.day,
      productType: r.product_type,
      units: r.units,
    })),
    admob: admob.map((r) => ({
      day: r.day,
      earningsMicros: Number(r.earnings_micros),
      matchedRequests: Number(r.matched_requests),
      impressions: Number(r.impressions),
    })),
    play,
  };
  const thisWeek = weeklyNumbers(input, current);
  const lastWeek = weeklyNumbers(input, previous);
  // 받은 날에는 판매가 없어도 표시 줄이 남는다(appstore/run.ts withMarker). 일요일 줄이 없으면 리포트가 아직
  // 안 나온 것이라, 6일과 7일을 견주지 않게 두 주 모두 월~토로 센다
  const appStoreUntilSaturday = !sales.some((r) => r.day === current.end);
  if (appStoreUntilSaturday) {
    const toSaturday = (w: typeof current) => ({ start: w.start, end: addDays(w.end, -1) });
    thisWeek.installs.appStoreNew = weeklyNumbers(input, toSaturday(current)).installs.appStoreNew;
    lastWeek.installs.appStoreNew = weeklyNumbers(input, toSaturday(previous)).installs.appStoreNew;
  }
  // Play 는 3~7일 늦게 들어와 월요일 아침엔 지난주가 다 없다. 들어온 날까지 두 주를 같은 날 수로 자른다
  const playLast = play.filter((r) => r.metric === "user_installs").map((r) => r.day).sort().at(-1);
  const pw = playWindow(current, previous, playLast ? shiftPt(playLast) : null);
  const playInstalls = pw
    ? { now: weeklyNumbers(input, pw.current).play.installs, before: weeklyNumbers(input, pw.previous).play.installs, days: pw.cut ? (Date.parse(pw.current.end) - Date.parse(pw.current.start)) / 86_400_000 + 1 : 7 }
    : null;
  const content = buildWeeklyReport(current, thisWeek, lastWeek, { appStoreUntilSaturday, playInstalls });
  const base = { dry: opts.dry, week: current, content };

  if (opts.dry) return { ok: true, status: "preview", ...base };
  const webhookUrl = opts.webhookUrl ?? process.env.DISCORD_INSTAGRAM_WEBHOOK_URL;
  if (!webhookUrl) throw new Error("DISCORD_INSTAGRAM_WEBHOOK_URL 환경변수가 없어요");
  if (!(await claimNotification(client, "weekly_report", current.start))) return { ok: true, status: "already_sent", ...base };
  try {
    // 같은 웹후크를 쓰되 이름만 바꿔 인스타 리포트와 구분한다
    await sendDiscord(webhookUrl, content, { username: "주간 리포트" });
    return { ok: true, status: "sent", ...base };
  } catch (e) {
    await releaseNotification(client, "weekly_report", current.start).catch(() => {});
    return { ok: false, status: "failed", error: e instanceof Error ? e.message : String(e), ...base };
  }
}
