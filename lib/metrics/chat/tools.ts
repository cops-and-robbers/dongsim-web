/**
 * 챗봇 도구 (#163). 모델은 이 여섯 개로만 데이터를 읽는다. SQL 은 쓰지 않는다.
 *
 * 계산은 전부 여기서 한다(합계, 차이, 증감률, 행사 전후). 모델이 산수를 하면 틀린 숫자를 자신 있게 말한다.
 * 결과마다 status(ok, no_data, unsupported)와 적용한 기간, 표본이 적은지를 붙인다.
 * 한 질문 안에서 같은 기간을 여러 번 물어도 집계는 한 번만 한다(Ctx 가 기억한다).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { tool } from "ai";
import { z } from "zod";
import { addDays, ymdRange } from "../dates.ts";
import { loadDashboard, previousRange, type Dashboard } from "../dashboard/data.ts";
import type { Week } from "../weekly/numbers.ts";
import { LOW_SAMPLE, METRICS, METRIC_KEYS, metricDef, type MetricKey } from "./catalog.ts";
import { loadServerDaily, serverNumbers, PARTICIPANTS_SINCE, type ServerDaily, type ServerNumbers } from "./server.ts";

export const DATA_FROM = "2026-04-01";
const MAX_DAYS = 366;

export type Ctx = {
  today: string;
  /** 집계 함수. 시험에서는 가짜를 넣는다 */
  dashboard: (range: Week, previous: Week) => Promise<Dashboard>;
  server: () => Promise<ServerDaily | null>;
  /** 모델에 보내지 않을 지표. 무료 등급(내용이 학습에 쓰임)에서는 광고 수익을 뺀다 */
  redact?: Set<MetricKey>;
};

export function makeCtx(opts: { client: SupabaseClient; apiBase?: string; token: string; today: string; redact?: Set<MetricKey> }): Ctx {
  const dash = new Map<string, Promise<Dashboard>>();
  let srv: Promise<ServerDaily | null> | null = null;
  return {
    today: opts.today,
    redact: opts.redact,
    dashboard: (r, p) => {
      const k = `${r.start}|${r.end}|${p.start}|${p.end}`;
      if (!dash.has(k)) dash.set(k, loadDashboard(opts.client, r, p));
      return dash.get(k)!;
    },
    server: () => (srv ??= opts.apiBase ? loadServerDaily(opts.apiBase, opts.token) : Promise.resolve(null)),
  };
}

type Unsupported = { status: "unsupported"; message: string };
const bad = (message: string): Unsupported => ({ status: "unsupported", message });

/** 기간이 쓸 수 있는가. 쓸 수 없으면 이유 */
export function checkRange(r: Week, today: string): string | null {
  const y = addDays(today, -1);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.start) || !/^\d{4}-\d{2}-\d{2}$/.test(r.end)) return "날짜는 YYYY-MM-DD 로 주세요";
  if (r.start > r.end) return "시작일이 종료일보다 늦어요";
  if (r.end > y) return `오늘 숫자는 아직 다 안 들어와서 어제(${y})까지만 볼 수 있어요`;
  if (r.start < DATA_FROM) return `${DATA_FROM} 부터 볼 수 있어요`;
  if (ymdRange(r.start, r.end).length > MAX_DAYS) return "한 번에 366일까지 볼 수 있어요";
  return null;
}

const round1 = (x: number) => Math.round(x * 10) / 10;
const pct = (a: number, b: number) => (b > 0 ? round1(((a - b) / b) * 100) : null);

/** 그 지표의 숫자가 이 기간에 다 들어왔나. 소스별 마지막 날 뒤나 첫날 앞이면 덜 들어온 것이다 */
function coverage(d: Dashboard, key: MetricKey, r: Week): string | null {
  const m = metricDef(key);
  if (m.source === "server") return r.end < PARTICIPANTS_SINCE && key === "games" ? `${PARTICIPANTS_SINCE} 전 판은 시험 판을 가릴 수 없어 섞여 있어요` : null;
  const last = d.freshness[m.source];
  const first = d.since[m.source];
  if (!last) return "아직 한 번도 안 들어왔어요";
  if (first && r.start < first) return `${first} 부터 숫자가 있어요`;
  if (r.end > last) return `${last} 까지만 들어왔어요`;
  return null;
}

function values(d: Dashboard, s: ServerNumbers | null, keys: MetricKey[], which: "current" | "previous", redact?: Set<MetricKey>) {
  return Object.fromEntries(keys.map((k) => [k, redact?.has(k) ? null : metricDef(k).total(d, s, which)])) as Record<MetricKey, number | null>;
}
const REDACTED = "이 연결(무료 등급)에서는 보내지 않는 지표예요";

const ALL: MetricKey[] = METRICS.map((m) => m.key);

/** 기간 하나의 지표 합계 */
export async function metricsSummary(ctx: Ctx, r: Week, keys: MetricKey[] = ALL) {
  const why = checkRange(r, ctx.today);
  if (why) return bad(why);
  const [d, all] = await Promise.all([ctx.dashboard(r, previousRange(r)), ctx.server()]);
  const s = all ? serverNumbers(all, r, previousRange(r)) : null;
  const v = values(d, s, keys, "current", ctx.redact);
  return {
    status: "ok" as const,
    range: r,
    metrics: keys.map((k) => ({ key: k, label: metricDef(k).label, unit: metricDef(k).unit, value: v[k], lowSample: v[k] !== null && v[k]! < LOW_SAMPLE, coverage: ctx.redact?.has(k) ? REDACTED : coverage(d, k, r) })),
    notes: notes(d, s, r),
  };
}

/** 두 기간 비교. 차이와 증감률은 여기서 계산한다 */
export async function metricsCompare(ctx: Ctx, a: Week, b: Week, keys: MetricKey[] = ALL) {
  const why = checkRange(a, ctx.today) ?? checkRange(b, ctx.today);
  if (why) return bad(why);
  const [d, all] = await Promise.all([ctx.dashboard(a, b), ctx.server()]);
  const s = all ? serverNumbers(all, a, b) : null;
  const va = values(d, s, keys, "current", ctx.redact);
  const vb = values(d, s, keys, "previous", ctx.redact);
  return {
    status: "ok" as const,
    periodA: a,
    periodB: b,
    metrics: keys.map((k) => {
      const x = va[k], y = vb[k];
      const both = x !== null && y !== null;
      return {
        key: k,
        label: metricDef(k).label,
        unit: metricDef(k).unit,
        a: x,
        b: y,
        diff: both ? round1(x! - y!) : null,
        changePct: both ? pct(x!, y!) : null,
        lowSample: both && Math.min(x!, y!) < LOW_SAMPLE,
        coverage: ctx.redact?.has(k) ? REDACTED : (coverage(d, k, a) ?? coverage(d, k, b)),
      };
    }),
    notes: notes(d, s, a),
  };
}

function notes(d: Dashboard, s: ServerNumbers | null, r: Week): string[] {
  const out: string[] = [];
  if (d.play.window?.cut && d.play.until) out.push(`Google Play 설치는 ${d.play.until} 까지만 들어와서 두 기간 모두 같은 날 수로 잘라 셌어요`);
  if (s?.error) out.push(`게임 서버를 읽지 못했어요: ${s.error}. 게임, 가입 숫자는 비어 있어요`);
  if (!s) out.push("게임 서버 주소가 없어 게임, 가입 숫자는 비어 있어요");
  if (s && s.testGamesExcluded > 0) out.push(`관리자만 참가한 시험 판 ${s.testGamesExcluded}판을 뺐어요`);
  if (r.start < PARTICIPANTS_SINCE) out.push(`${PARTICIPANTS_SINCE} 전 판은 참가자 기록이 없어 시험 판이 섞여 있을 수 있어요`);
  return out;
}

/** 지표 하나의 날짜별 값. 숫자가 아직 안 들어온 날은 0 이 아니라 null */
export async function metricsDaily(ctx: Ctx, key: MetricKey, r: Week) {
  const why = checkRange(r, ctx.today);
  if (why) return bad(why);
  const m = metricDef(key);
  if (ctx.redact?.has(key)) return bad(REDACTED);
  if (!m.daily) return bad(`${m.label} 은(는) 날짜별로는 볼 수 없어요. 기간 합계(metrics_summary)로 물어 주세요`);
  const [d, all] = await Promise.all([ctx.dashboard(r, previousRange(r)), ctx.server()]);
  const days = ymdRange(r.start, r.end);
  let series: { day: string; value: number | null }[];
  if (m.source === "server") {
    const col = m.daily as "games" | "game_players" | "signups";
    const field = col === "game_players" ? "players" : col;
    series = days.map((day) => ({ day, value: all && !all.error ? (all.daily.get(day)?.[field] ?? 0) : null }));
  } else {
    const last = d.freshness[m.source];
    const first = d.since[m.source];
    series = days.map((day, i) => ({
      day,
      value: !last || day > last || (first && day < first) ? null : (d.daily[i]?.[m.daily as keyof (typeof d.daily)[number]] as number),
    }));
  }
  const known = series.filter((p) => p.value !== null) as { day: string; value: number }[];
  const max = known.reduce<{ day: string; value: number } | null>((a, p) => (!a || p.value > a.value ? p : a), null);
  return {
    status: known.length ? ("ok" as const) : ("no_data" as const),
    metric: key,
    label: m.label,
    unit: m.unit,
    range: r,
    total: m.additive ? known.reduce((a, p) => a + p.value, 0) : null,
    peak: max,
    series,
  };
}

export const DIMENSIONS = ["country", "channel", "campaign", "appstore_way"] as const;

/** 나눠 보기. 많은 순 상위 10 */
export async function metricsBreakdown(ctx: Ctx, dimension: (typeof DIMENSIONS)[number], r: Week) {
  const why = checkRange(r, ctx.today);
  if (why) return bad(why);
  const d = await ctx.dashboard(r, previousRange(r));
  if (dimension === "country")
    return { status: "ok" as const, range: r, dimension, note: "나라별 최초 설치. App Store 최초 다운로드 + Google Play 최초 설치(들어온 날까지)", rows: d.countries.slice(0, 10) };
  if (dimension === "channel")
    return { status: "ok" as const, range: r, dimension, note: "사이트 방문을 들어온 길로. storeSessions 는 그중 스토어로 넘긴 방문", rows: d.channels.current };
  if (dimension === "campaign")
    return {
      status: "ok" as const,
      range: r,
      dimension,
      note: "UTM 캠페인별 세션. web 은 사이트, app 은 앱 첫 실행의 캠페인",
      web: d.webCampaigns.slice(0, 10),
      app: d.appCampaigns.slice(0, 10),
    };
  return {
    status: "ok" as const,
    range: r,
    dimension,
    note: "App Store 최초 다운로드를 받은 길. search 는 스토어 검색, web 은 웹 링크(행사 QR, 사이트 버튼), app 은 다른 앱 속 링크",
    current: d.appStoreWays.current,
  };
}

/** 일정(행사, 출시) */
export async function eventsList(ctx: Ctx, r: Week) {
  const why = checkRange(r, ctx.today);
  if (why) return bad(why);
  const d = await ctx.dashboard(r, previousRange(r));
  const events = (d.events ?? []).filter((e) => e.day >= r.start && e.day <= r.end);
  return { status: events.length ? ("ok" as const) : ("no_data" as const), range: r, events };
}

const EVENT_KEYS: MetricKey[] = ["appstore_new", "play_installs", "first_open_android", "first_open_ios", "web_sessions", "download_clicks", "ig_profile_views", "games", "game_players", "signups"];

/**
 * 행사 기간과 그 앞 같은 요일 기간 비교. 기준은 바로 앞 주의 같은 요일들이다(행사가 주말에 몰려 요일을 맞춘다).
 * 같은 기간에 다른 일정이 겹치면 함께 돌려준다. 이 결과는 "같은 기간에 함께 나타났다"까지만 말해 준다
 */
export async function eventWindow(ctx: Ctx, day: string, days: number) {
  const n = Math.min(Math.max(Math.round(days || 1), 1), 7);
  const event = { start: day, end: addDays(day, n - 1) };
  const base = { start: addDays(day, -7), end: addDays(day, n - 1 - 7) };
  const cmp = await metricsCompare(ctx, event, base, EVENT_KEYS);
  if (cmp.status !== "ok") return cmp;
  const d = await ctx.dashboard(event, base);
  const overlap = (w: Week) => (d.events ?? []).filter((e) => e.day >= w.start && e.day <= w.end);
  return { ...cmp, eventPeriod: event, baselinePeriod: base, eventsInEventPeriod: overlap(event), eventsInBaseline: overlap(base), reading: "행사 기간과 앞 주 같은 요일을 나란히 둔 것이에요. 원인을 말해 주지는 않아요" };
}

const range = z.object({
  start: z.string().describe("YYYY-MM-DD, 한국 날짜"),
  end: z.string().describe("YYYY-MM-DD, 한국 날짜, 어제까지"),
});
const metricList = z.array(z.enum(METRIC_KEYS)).optional().describe("필요한 지표만. 빼면 전부");

/** 모델에게 주는 도구. 실행 결과에 호출 id 를 붙여 답변이 인용할 수 있게 한다 */
export function chatTools(ctx: Ctx) {
  const withId = <T extends object>(r: T, id: string) => ({ toolCallId: id, ...r });
  return {
    metrics_summary: tool({
      description: "한 기간의 지표 합계. 설치, 첫 실행, 사이트, 인스타, 스토어, 광고, 게임 서버(판 수, 참가 인원, 가입)",
      inputSchema: z.object({ period: range, metrics: metricList }),
      execute: async ({ period, metrics }, { toolCallId }) => withId(await metricsSummary(ctx, period, metrics), toolCallId),
    }),
    metrics_compare: tool({
      description: "두 기간 비교. 차이(diff)와 증감률(changePct, %)을 계산해 준다. 증감률은 직접 계산하지 말고 이 값을 쓴다",
      inputSchema: z.object({ periodA: range.describe("볼 기간"), periodB: range.describe("비교할 기간"), metrics: metricList }),
      execute: async ({ periodA, periodB, metrics }, { toolCallId }) => withId(await metricsCompare(ctx, periodA, periodB, metrics), toolCallId),
    }),
    metrics_daily: tool({
      description: "지표 하나의 날짜별 값과 가장 높았던 날(peak). 아직 안 들어온 날은 null",
      inputSchema: z.object({ metric: z.enum(METRIC_KEYS), period: range }),
      execute: async ({ metric, period }, { toolCallId }) => withId(await metricsDaily(ctx, metric, period), toolCallId),
    }),
    metrics_breakdown: tool({
      description: "나눠 보기. country(나라별 설치), channel(사이트 유입 경로), campaign(UTM 캠페인), appstore_way(App Store 다운로드를 받은 길)",
      inputSchema: z.object({ dimension: z.enum(DIMENSIONS), period: range }),
      execute: async ({ dimension, period }, { toolCallId }) => withId(await metricsBreakdown(ctx, dimension, period), toolCallId),
    }),
    events_list: tool({
      description: "기간 안의 일정(오프라인 행사, 앱 출시, 업데이트). 행사 효과를 볼 때 먼저 부른다",
      inputSchema: z.object({ period: range }),
      execute: async ({ period }, { toolCallId }) => withId(await eventsList(ctx, period), toolCallId),
    }),
    event_window: tool({
      description: "행사 기간(day 부터 days 일)과 바로 앞 주 같은 요일을 비교. 같은 기간 다른 일정 겹침도 알려 준다. 원인이 아니라 같은 기간에 함께 나타난 변화다",
      inputSchema: z.object({ day: z.string().describe("행사 첫날 YYYY-MM-DD"), days: z.number().int().min(1).max(7).describe("행사 일수") }),
      execute: async ({ day, days }, { toolCallId }) => withId(await eventWindow(ctx, day, days), toolCallId),
    }),
  };
}
