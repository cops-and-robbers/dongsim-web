/**
 * 주간 리포트 한 번 (#146). 매주 월요일 오전 GitHub Actions(weekly-report.yml)가 부른다.
 *
 * 수집은 하지 않는다. 매일 수집(#140, #142, #143)이 쌓아 둔 테이블에서 지난주와
 * 그 전주를 읽어 더하고, 디스코드로 한 번 보낸다. 같은 주는 두 번 보내지 않는다.
 */

import { sendDiscord } from "../discord.ts";
import { check, db } from "../db.ts";
import { addDays, todayIn } from "../dates.ts";
import { claimNotification, releaseNotification } from "../instagram/store.ts";
import { buildWeeklyReport } from "./messages.ts";
import { lastTwoWeeks, weeklyNumbers, type WeeklyInput } from "./numbers.ts";

export type WeeklyResult = {
  ok: boolean;
  dry: boolean;
  week: { start: string; end: string };
  status: "sent" | "preview" | "already_sent" | "failed";
  content: string;
  error?: string;
};

export async function runWeekly(opts: { dry: boolean; now?: Date; webhookUrl?: string }): Promise<WeeklyResult> {
  const now = opts.now ?? new Date();
  const client = db();
  const { current, previous } = lastTwoWeeks(todayIn("Asia/Seoul", now));
  const from = previous.start;
  const to = current.end;

  const [igDays, igPosts, ga4, sales, admob] = await Promise.all([
    client.from("instagram_account_daily").select("day, views, profile_views, website_clicks").gte("day", from).lte("day", to),
    // 게시물은 한국 날짜로 나눈다. 앞뒤 하루씩 넉넉히 읽고 numbers 가 거른다
    client.from("instagram_media").select("posted_at").gte("posted_at", `${addDays(from, -1)}T00:00:00Z`).lte("posted_at", `${addDays(to, 1)}T23:59:59Z`),
    client.from("ga4_daily").select("property, day, breakdown, key, metric, value").gte("day", from).lte("day", to).in("breakdown", ["total", "session_campaign", "event"]).limit(20000),
    client.from("appstore_sales_daily").select("day, product_type, units").gte("day", from).lte("day", to),
    client.from("admob_daily").select("day, earnings_micros, matched_requests, impressions").gte("day", from).lte("day", to),
  ]);

  const input: WeeklyInput = {
    instagramDays: (check(igDays, "인스타 하루 지표 읽기") as { day: string; views: number | null; profile_views: number | null; website_clicks: number | null }[]).map((r) => ({
      day: r.day,
      views: r.views,
      profileViews: r.profile_views,
      websiteClicks: r.website_clicks,
    })),
    instagramPosts: (check(igPosts, "인스타 게시물 읽기") as { posted_at: string }[]).map((r) => ({ postedAt: r.posted_at })),
    ga4: check(ga4, "GA4 읽기") as WeeklyInput["ga4"],
    appstoreSales: (check(sales, "App Store 판매 읽기") as { day: string; product_type: string; units: number }[]).map((r) => ({
      day: r.day,
      productType: r.product_type,
      units: r.units,
    })),
    admob: (check(admob, "AdMob 읽기") as { day: string; earnings_micros: number; matched_requests: number; impressions: number }[]).map((r) => ({
      day: r.day,
      earningsMicros: Number(r.earnings_micros),
      matchedRequests: Number(r.matched_requests),
      impressions: Number(r.impressions),
    })),
  };
  const content = buildWeeklyReport(current, weeklyNumbers(input, current), weeklyNumbers(input, previous));
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
