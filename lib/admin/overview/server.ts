/**
 * 개요 요약 API 의 계산 (docs/admin-ui.md "개요 카드"). 서버 전용이다.
 * 화면에 놓인 카드만 읽고, 카드 하나를 못 읽어도 나머지는 돌려준다.
 */
import { unstable_cache } from "next/cache";
import { readEventDays, readSettingsIndex } from "@/lib/event/server";
import { defaultSettings, normalize, readiness } from "@/lib/event/settings";
import { db } from "@/lib/metrics/db";
import { loadDashboard, type Dashboard, type DailyPoint } from "@/lib/metrics/dashboard/data";
import { engagementOf, smallReach } from "@/lib/metrics/dashboard/engagement";
import { addDays, todayIn } from "@/lib/metrics/dates";
import { releaseBoard } from "@/lib/release/server";
import { ANR_LIMIT, CRASH_LIMIT, daysLeft } from "@/lib/store-check/model";
import { manualDeadlines, playVitals } from "@/lib/store-check/server";
import { readDrafts, readImageDrafts } from "@/lib/store-page/server";
import { CARDS, type CardKey, type CardResult, type OverviewData, type RatioData, type TrendData } from "./cards";

const DAYS = 28;

// 지표 표는 새벽과 아침에 한 번씩 쌓인다. 어제 날짜가 같으면 한 시간 같은 값을 쓴다
const cachedDashboard = unstable_cache(
  (yesterday: string) => {
    const range = { start: addDays(yesterday, -(DAYS - 1)), end: yesterday };
    return loadDashboard(db(), range);
  },
  ["overview-metrics-v1"],
  { revalidate: 3600 },
);

const sum = (a: number[]) => a.reduce((n, x) => n + x, 0);
const minDay = (...days: (string | null)[]) => (days.some((d) => !d) ? null : (days as string[]).sort()[0]);

/** 7일 합과 그 앞 7일. 소스마다 들어온 마지막 날을 끝으로 잡는다(애플 페이지 조회는 며칠 늦다) */
function trend(d: Dashboard, pick: (p: DailyPoint) => number, until: string | null, unit: TrendData["unit"]): CardResult {
  if (!until) return { kind: "error", message: "아직 쌓인 값이 없어요." };
  const end = d.daily.findLastIndex((p) => p.day <= until);
  if (end < 6) return { kind: "error", message: "7일치가 아직 없어요." };
  const now = d.daily.slice(end - 6, end + 1).map(pick);
  const before = end >= 13 ? d.daily.slice(end - 13, end - 6).map(pick) : [];
  return { kind: "trend", total: sum(now), previous: before.length === 7 ? sum(before) : null, daily: now, previousDaily: before, until: d.daily[end].day, unit };
}

function ratio(now: { num: number; den: number }, before: { num: number; den: number } | null, unit: RatioData["unit"]): RatioData {
  return { kind: "ratio", num: now.num, den: now.den, previous: before && before.den > 0 ? before : null, unit };
}

/** 사이트 방문 중 스토어로 넘어간 비율. /download 로 바로 들어온 방문은 양쪽에서 뺀다 (lib/metrics/chat/catalog.ts site_conversion) */
const siteOf = (w: Dashboard["totals"]["current"]["web"]) => ({ num: Math.max(w.storeSessions - w.linkSessions, 0), den: Math.max(w.sessions - w.linkSessions, 0) });

function metricCard(key: CardKey, d: Dashboard): CardResult {
  const f = d.freshness;
  const now = d.totals.current;
  const before = d.totals.previous;
  switch (key) {
    case "newu":
      return trend(d, (p) => p.appStoreNew + p.firstOpenAndroid, minDay(f.appstore, f.ga4app), "count");
    case "ig":
      return trend(d, (p) => p.igViews, f.instagram, "count");
    case "views":
      return trend(d, (p) => p.appStorePageViews, f.appstorePage, "count");
    case "ad":
      return trend(d, (p) => p.adEarningsMicros / 1e6, f.admob, "usd");
    case "site":
      return ratio(siteOf(now.web), siteOf(before.web), "visits");
    case "fun":
      return ratio(now.cohort.activation, before.cohort.activation, "people");
    case "ret":
      return ratio(now.cohort.d1, before.cohort.d1, "people");
    case "d7":
      return ratio(now.cohort.d7, before.cohort.d7, "people");
    case "post": {
      const p = [...d.posts].sort((a, b) => b.postedAt.localeCompare(a.postedAt))[0];
      if (!p) return { kind: "error", message: "최근 4주에 올린 게시물이 없어요." };
      return { kind: "post", rate: engagementOf(p), reach: p.reach, postedAt: p.postedAt, permalink: p.permalink, small: smallReach(p) };
    }
    default:
      return { kind: "error", message: "모르는 카드예요." };
  }
}

const METRIC_KEYS: CardKey[] = ["newu", "ig", "views", "ad", "site", "fun", "ret", "d7", "post"];

const failed = (e: unknown, message: string): CardResult => {
  console.error("[overview]", message, e instanceof Error ? e.message : e);
  return { kind: "error", message };
};

async function eventCards(keys: CardKey[]): Promise<Partial<Record<CardKey, CardResult>>> {
  const [days, index] = await Promise.all([readEventDays(), readSettingsIndex()]);
  const today = todayIn("Asia/Seoul");
  const next = days.filter((e) => e.day >= today).sort((a, b) => a.day.localeCompare(b.day))[0];
  const out: Partial<Record<CardKey, CardResult>> = {};
  if (!next) {
    const none: CardResult = { kind: "event", label: null, day: null, done: 0, total: 0, next: null, frames: 0, builtinFrame: true };
    for (const k of keys) out[k] = none;
    return out;
  }
  const settings = index.has(next.id) ? normalize(index.get(next.id), defaultSettings(next)) : defaultSettings(next);
  const checks = readiness(next, settings);
  const value: CardResult = {
    kind: "event",
    label: next.label,
    day: next.day,
    done: checks.filter((c) => c.level === "ok").length,
    total: checks.length,
    next: checks.find((c) => c.level !== "ok")?.title ?? null,
    frames: settings.kiosk.frames.length,
    builtinFrame: settings.kiosk.frames.length === 0,
  };
  for (const k of keys) out[k] = value;
  return out;
}

async function draftCard(): Promise<CardResult> {
  const [texts, images] = await Promise.all([readDrafts(), readImageDrafts()]);
  const ios = (texts ?? []).filter((d) => d.platform === "ios").length + (images ?? []).filter((d) => d.platform === "ios").length;
  const android = (texts ?? []).filter((d) => d.platform === "android").length + (images ?? []).filter((d) => d.platform === "android").length;
  const parts = [ios ? `App Store ${ios}칸` : "", android ? `Google Play ${android}칸` : ""].filter(Boolean);
  return { kind: "count", count: ios + android, detail: parts.length ? parts.join(", ") : null };
}

async function dueCard(): Promise<CardResult> {
  const now = new Date();
  const open = (await manualDeadlines(now)).filter((c) => c.level !== "ok" && c.due).sort((a, b) => a.due!.localeCompare(b.due!));
  const first = open[0];
  return { kind: "due", title: first?.title ?? null, due: first?.due ?? null, daysLeft: first?.due ? daysLeft(first.due, now) : null, open: open.length };
}

async function stageCard(): Promise<CardResult> {
  const board = await releaseBoard();
  return {
    kind: "stage",
    tracks: [board.ios, board.android].map((t) => (t.ok ? { platform: t.platform, label: t.status.label, tone: t.status.tone, live: t.live?.version ?? null } : { platform: t.platform, label: "읽지 못했어요", tone: "bad", live: null })),
    next: board.next.tone === "turn" || board.next.tone === "bad" ? { title: board.next.title, reason: board.next.reason, tone: board.next.tone } : null,
  };
}

async function vitalCards(keys: CardKey[]): Promise<Partial<Record<CardKey, CardResult>>> {
  const v = await playVitals();
  const out: Partial<Record<CardKey, CardResult>> = {};
  if (keys.includes("crash")) out.crash = { kind: "limit", rate: v.crashRate, limit: CRASH_LIMIT };
  if (keys.includes("anr")) out.anr = { kind: "limit", rate: v.anrRate, limit: ANR_LIMIT };
  return out;
}

/** 화면에 놓인 서버 카드만 계산한다 */
export async function overview(keys: CardKey[]): Promise<OverviewData> {
  const want = keys.filter((k) => CARDS[k].source === "server");
  const has = (...k: CardKey[]) => k.filter((x) => want.includes(x));
  const cards: OverviewData["cards"] = {};
  const jobs: Promise<unknown>[] = [];

  const metrics = has(...METRIC_KEYS);
  if (metrics.length)
    jobs.push(
      cachedDashboard(addDays(todayIn("Asia/Seoul"), -1))
        .then((d) => metrics.forEach((k) => (cards[k] = metricCard(k, d))))
        .catch((e) => metrics.forEach((k) => (cards[k] = failed(e, "지표를 읽지 못했어요.")))),
    );
  const vitals = has("crash", "anr");
  if (vitals.length) jobs.push(vitalCards(vitals).then((r) => Object.assign(cards, r)).catch((e) => vitals.forEach((k) => (cards[k] = failed(e, "Google Play 상태를 읽지 못했어요.")))));
  const events = has("ev", "frame");
  if (events.length) jobs.push(eventCards(events).then((r) => Object.assign(cards, r)).catch((e) => events.forEach((k) => (cards[k] = failed(e, "행사를 읽지 못했어요.")))));
  if (has("draft").length) jobs.push(draftCard().then((r) => void (cards.draft = r)).catch((e) => void (cards.draft = failed(e, "초안을 읽지 못했어요."))));
  if (has("chk").length) jobs.push(dueCard().then((r) => void (cards.chk = r)).catch((e) => void (cards.chk = failed(e, "점검 기한을 읽지 못했어요."))));
  if (has("rel").length) jobs.push(stageCard().then((r) => void (cards.rel = r)).catch((e) => void (cards.rel = failed(e, "출시 상태를 읽지 못했어요."))));

  await Promise.all(jobs);
  return { cards, readAt: new Date().toISOString() };
}
