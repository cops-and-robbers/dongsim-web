/**
 * 챗봇 도구 (#163). 모델은 이 도구들로만 데이터를 읽는다. SQL 은 쓰지 않는다.
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
import { LOW_RATIO_DEN, LOW_SAMPLE, METRICS, METRIC_KEYS, metricDef, type MetricKey } from "./catalog.ts";
import { loadEventReport } from "../eventReportData.ts";
import { eunNeun } from "./josa.ts";
import type { MetricsEvent } from "../events.ts";
import { loadServerDaily, serverNumbers, PARTICIPANTS_SINCE, type ServerDaily, type ServerNumbers } from "../gameServer.ts";
import { loadEvents, loadStaffAccounts } from "../staff.ts";

import { DATA_FROM } from "./periods.ts";
export { DATA_FROM };
// 수집을 시작한 2026-04-01 부터 "전체"를 한 번에 볼 수 있게 두 해까지. 그보다 길면 주 단위 집계도 너무 길어진다
const MAX_DAYS = 731;

export type Ctx = {
  today: string;
  /** 집계 함수. 시험에서는 가짜를 넣는다 */
  dashboard: (range: Week, previous: Week) => Promise<Dashboard>;
  server: () => Promise<ServerDaily | null>;
  /** 모든 일정(행사 성적표가 평소 날에서 다른 행사 날을 뺄 때 쓴다). 표가 없으면 null */
  events: () => Promise<MetricsEvent[] | null>;
  /** 행사 성적표. 시험에서는 가짜를 넣는다 */
  eventReport: (event: MetricsEvent) => ReturnType<typeof loadEventReport>;
  /** 모델에 보내지 않을 지표. 무료 등급(내용이 학습에 쓰임)에서는 광고 수익을 뺀다 */
  redact?: Set<MetricKey>;
};

export function makeCtx(opts: { client: SupabaseClient; apiBase?: string; token: string; today: string; redact?: Set<MetricKey> }): Ctx {
  const dash = new Map<string, Promise<Dashboard>>();
  let srv: Promise<ServerDaily | null> | null = null;
  let evs: Promise<MetricsEvent[] | null> | null = null;
  // 운영진(ADMIN 권한 + 지표 화면의 운영진 계정)은 지표 화면, 행사 성적표와 똑같이 거른다(gameServer.ts)
  const server = () =>
    (srv ??= opts.apiBase
      ? loadStaffAccounts(opts.client)
          .catch(() => [])
          .then((staff) => loadServerDaily(opts.apiBase!, opts.token, staff.map((a) => a.userId)))
      : Promise.resolve(null));
  const events = () => (evs ??= loadEvents(opts.client));
  return {
    today: opts.today,
    redact: opts.redact,
    dashboard: (r, p) => {
      const k = `${r.start}|${r.end}|${p.start}|${p.end}`;
      if (!dash.has(k)) dash.set(k, loadDashboard(opts.client, r, p));
      return dash.get(k)!;
    },
    server,
    events,
    eventReport: async (event) => {
      const [s, all] = await Promise.all([server(), events()]);
      if (!s) throw new Error("게임 서버 주소가 없어 행사 게임을 읽지 못했어요");
      return loadEventReport(opts.client, event, all ?? [], s);
    },
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
  if (ymdRange(r.start, r.end).length > MAX_DAYS) return `한 번에 ${MAX_DAYS}일까지 볼 수 있어요`;
  return null;
}

const round1 = (x: number) => Math.round(x * 10) / 10;
const pct = (a: number, b: number) => (b > 0 ? round1(((a - b) / b) * 100) : null);

/** 그 지표의 숫자가 이 기간에 다 들어왔나. 소스별 마지막 날 뒤나 첫날 앞이면 덜 들어온 것이다 */
function coverage(d: Dashboard, key: MetricKey, r: Week): string | null {
  const m = metricDef(key);
  if (m.source === "server") return r.end < PARTICIPANTS_SINCE && key === "games" ? `${PARTICIPANTS_SINCE} 전 판은 운영진끼리 한 판을 가릴 수 없어 섞여 있어요` : null;
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

/** 비율 지표의 분자, 분모. 비율이 아니거나 가린 지표면 null */
function ratioOf(d: Dashboard, s: ServerNumbers | null, k: MetricKey, which: "current" | "previous", redact?: Set<MetricKey>) {
  const r = metricDef(k).ratio;
  return !r || redact?.has(k) ? null : r(d, s, which);
}

const ALL: MetricKey[] = METRICS.map((m) => m.key);

/** 기간 하나의 지표 합계 */
export async function metricsSummary(ctx: Ctx, r: Week, keys: MetricKey[] = ALL) {
  const why = checkRange(r, ctx.today);
  if (why) return bad(why);
  const [d, all] = await Promise.all([ctx.dashboard(r, previousRange(r)), ctx.server()]);
  const s = all ? serverNumbers(all, r, previousRange(r), ctx.today) : null;
  const v = values(d, s, keys, "current", ctx.redact);
  return {
    status: "ok" as const,
    range: r,
    metrics: keys.map((k) => {
      const ratio = ratioOf(d, s, k, "current", ctx.redact);
      return {
        key: k,
        label: metricDef(k).label,
        unit: metricDef(k).unit,
        value: v[k],
        ...(ratio && { num: ratio.num, den: ratio.den }),
        lowSample: ratio ? ratio.den < LOW_RATIO_DEN : v[k] !== null && v[k]! < LOW_SAMPLE,
        coverage: ctx.redact?.has(k) ? REDACTED : coverage(d, k, r),
      };
    }),
    notes: notes(d, s, r),
  };
}

/** 두 기간 비교. 차이와 증감률은 여기서 계산한다 */
/**
 * 두 기간의 날 수를 맞춘다. 긴 쪽의 끝을 잘라 짧은 쪽과 같게 한다.
 * "이번 주(6일) vs 지난주(7일)", "이번 달(10일) vs 지난달(30일)"을 그대로 더해 비교하면 덜 지난 쪽이 늘 줄어 보인다(2026-10-11 실험에서 잡음)
 */
export function alignLengths(a: Week, b: Week): { a: Week; b: Week; note: string | null } {
  const na = ymdRange(a.start, a.end).length;
  const nb = ymdRange(b.start, b.end).length;
  if (na === nb) return { a, b, note: null };
  const n = Math.min(na, nb);
  const cut = (w: Week) => ({ start: w.start, end: addDays(w.start, n - 1) });
  const A = na > n ? cut(a) : a;
  const B = nb > n ? cut(b) : b;
  return { a: A, b: B, note: `두 기간의 날 수가 달라(${na}일, ${nb}일) 앞에서부터 ${n}일씩으로 맞춰 비교했어요(${A.start}~${A.end}, ${B.start}~${B.end})` };
}

export async function metricsCompare(ctx: Ctx, a0: Week, b0: Week, keys: MetricKey[] = ALL) {
  const why = checkRange(a0, ctx.today) ?? checkRange(b0, ctx.today);
  if (why) return bad(why);
  const { a, b, note: aligned } = alignLengths(a0, b0);
  const [d, all] = await Promise.all([ctx.dashboard(a, b), ctx.server()]);
  const s = all ? serverNumbers(all, a, b, ctx.today) : null;
  const va = values(d, s, keys, "current", ctx.redact);
  const vb = values(d, s, keys, "previous", ctx.redact);
  return {
    status: "ok" as const,
    periodA: a,
    periodB: b,
    metrics: keys.map((k) => {
      const x = va[k], y = vb[k];
      const both = x !== null && y !== null;
      const ra = ratioOf(d, s, k, "current", ctx.redact);
      const rb = ratioOf(d, s, k, "previous", ctx.redact);
      // 비율끼리는 차이를 %p 로만 낸다. 23% 에서 25% 를 "8.7% 늘었다"고 하면 헷갈린다
      if (ra || rb)
        return {
          key: k,
          label: metricDef(k).label,
          unit: metricDef(k).unit,
          a: x,
          b: y,
          aOf: ra,
          bOf: rb,
          diffPoints: both ? round1(x! - y!) : null,
          changePct: null,
          lowSample: Math.min(ra?.den ?? 0, rb?.den ?? 0) < LOW_RATIO_DEN,
          coverage: ctx.redact?.has(k) ? REDACTED : (coverage(d, k, a) ?? coverage(d, k, b)),
        };
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
    notes: [...(aligned ? [aligned] : []), ...notes(d, s, a)],
  };
}

function notes(d: Dashboard, s: ServerNumbers | null, r: Week): string[] {
  const out: string[] = [];
  if (d.play.window?.cut && d.play.until) out.push(`Google Play 설치는 ${d.play.until} 까지만 들어와서 두 기간 모두 같은 날 수로 잘라 셌어요`);
  if (s?.error) out.push(`게임 서버를 읽지 못했어요: ${s.error}. 게임, 가입 숫자는 비어 있어요`);
  if (!s) out.push("게임 서버 주소가 없어 게임, 가입 숫자는 비어 있어요");
  if (s && s.staffGamesExcluded > 0) out.push(`운영진끼리 한 판 ${s.staffGamesExcluded}판을 뺐어요`);
  if (r.start < PARTICIPANTS_SINCE) out.push(`${PARTICIPANTS_SINCE} 전 판은 참가자 기록이 없어 운영진끼리 한 판이 섞여 있을 수 있어요`);
  return out;
}

/** 날짜별 값. 숫자가 아직 안 들어왔거나 모으기 전인 날은 0 이 아니라 null. d.daily 는 r 의 날짜 순서다 */
function seriesOf(d: Dashboard, all: ServerDaily | null, key: MetricKey, r: Week): { day: string; value: number | null }[] {
  const m = metricDef(key);
  const days = ymdRange(r.start, r.end);
  if (m.source === "server") {
    const col = m.daily as "games" | "game_players" | "signups" | "new_players";
    const field = col === "game_players" ? "players" : col === "new_players" ? "newPlayers" : col;
    return days.map((day) => ({ day, value: all && !all.error ? (all.daily.get(day)?.[field] ?? 0) : null }));
  }
  const last = d.freshness[m.source];
  const first = d.since[m.source];
  return days.map((day, i) => ({
    day,
    value: !last || day > last || (first && day < first) ? null : (d.daily[i]?.[m.daily as keyof (typeof d.daily)[number]] as number),
  }));
}

/** 지표 하나의 날짜별 값. 숫자가 아직 안 들어온 날은 0 이 아니라 null */
export async function metricsDaily(ctx: Ctx, key: MetricKey, r: Week) {
  const why = checkRange(r, ctx.today);
  if (why) return bad(why);
  const m = metricDef(key);
  if (ctx.redact?.has(key)) return bad(REDACTED);
  if (!m.daily) return bad(`${eunNeun(m.label)} 날짜별로는 볼 수 없어요. 기간 합계(metrics_summary)로 물어 주세요`);
  const [d, all] = await Promise.all([ctx.dashboard(r, previousRange(r)), ctx.server()]);
  const series = seriesOf(d, all, key, r);
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

/** 훑어보기에 넣는 지표: 날짜별로 있고 더할 수 있는 개수 지표. 비율, 평균은 주마다 더할 수 없어 뺀다 */
export const OVERVIEW_KEYS: MetricKey[] = METRICS.filter((m) => m.daily && m.additive).map((m) => m.key);
// 30주가 넘으면 달 단위로 묶는다. 주 단위로 지표 20개면 숫자가 600개를 넘어 읽기 어렵다
const WEEKLY_UNTIL = 30 * 7;
const MOVE_PCT = 50;
const MAX_MOVERS = 8;
const seoulDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso));

/** 기간을 주(월~일) 또는 달로 나눈다. 처음과 끝 칸은 기간에 걸친 날만이라 짧을 수 있다 */
export function bucketsOf(r: Week): { unit: "week" | "month"; buckets: (Week & { full: boolean })[] } {
  const days = ymdRange(r.start, r.end);
  const unit = days.length > WEEKLY_UNTIL ? "month" : "week";
  const keyOf = (day: string) => {
    if (unit === "month") return day.slice(0, 7);
    const dow = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
    return addDays(day, -dow);
  };
  const out: (Week & { full: boolean })[] = [];
  for (const day of days) {
    const last = out[out.length - 1];
    if (last && keyOf(last.start) === keyOf(day)) last.end = day;
    else out.push({ start: day, end: day, full: false });
  }
  for (const b of out) {
    const len = ymdRange(b.start, b.end).length;
    const whole = unit === "week" ? 7 : ymdRange(`${b.start.slice(0, 7)}-01`, addDays(`${addDays(`${b.start.slice(0, 7)}-28`, 4).slice(0, 7)}-01`, -1)).length;
    b.full = len === whole;
  }
  return { unit, buckets: out };
}

/**
 * 훑어보기. 긴 기간(전체, 몇 달)을 주나 달로 묶어 지표마다 흐름, 크게 움직인 칸, 그 칸의 일정과 게시물 수를 한 번에 준다.
 * 지표 전부를 날짜별로 모델에 넘기지 않는 이유: 모델이 수천 개 숫자를 직접 더하면 틀리고, 그 합은 도구 결과에 없어 검증도 못 한다.
 * 그래서 묶음과 합계, 변화율은 여기서 계산하고 모델은 고르고 설명만 한다
 */
export async function metricsOverview(ctx: Ctx, r: Week, keys: MetricKey[] = OVERVIEW_KEYS) {
  const why = checkRange(r, ctx.today);
  if (why) return bad(why);
  const use = keys.filter((k) => OVERVIEW_KEYS.includes(k) && !ctx.redact?.has(k));
  const [d, all] = await Promise.all([ctx.dashboard(r, previousRange(r)), ctx.server()]);
  const { unit, buckets } = bucketsOf(r);
  const index = new Map<string, number>();
  buckets.forEach((b, i) => ymdRange(b.start, b.end).forEach((day) => index.set(day, i)));
  // 칸마다 숫자가 빈 날이 있으면 그 칸은 덜 들어온 것이다(partial)
  const metrics = use.map((k) => {
    const sums: (number | null)[] = buckets.map(() => null);
    const holes = buckets.map(() => false);
    for (const p of seriesOf(d, all, k, r)) {
      const i = index.get(p.day)!;
      if (p.value === null) holes[i] = true;
      else sums[i] = (sums[i] ?? 0) + p.value;
    }
    const known = sums.filter((v): v is number => v !== null);
    return { key: k, label: metricDef(k).label, unit: metricDef(k).unit, total: known.length ? known.reduce((a, v) => a + v, 0) : null, values: sums, partial: holes };
  });
  const movers = metrics
    .flatMap((m) =>
      m.values.flatMap((v, i) => {
        const b = m.values[i - 1];
        if (i === 0 || v === null || b === null || b === undefined) return [];
        if (!buckets[i].full || !buckets[i - 1].full || m.partial[i] || m.partial[i - 1]) return [];
        if (Math.min(v, b) < LOW_SAMPLE) return [];
        const c = pct(v, b);
        return c !== null && Math.abs(c) >= MOVE_PCT ? [{ key: m.key, label: m.label, unit: m.unit, period: { start: buckets[i].start, end: buckets[i].end }, value: v, before: b, changePct: c }] : [];
      }),
    )
    .sort((x, y) => Math.abs(y.changePct) - Math.abs(x.changePct))
    .slice(0, MAX_MOVERS);
  const events = (d.events ?? []).filter((e) => e.day >= r.start && e.day <= r.end).map((e) => ({ day: e.day, label: e.label }));
  const posts = buckets.map(() => 0);
  for (const p of d.posts) {
    const i = index.get(seoulDay(p.postedAt));
    if (i !== undefined) posts[i]++;
  }
  const s = all ? serverNumbers(all, r, previousRange(r), ctx.today) : null;
  return {
    status: "ok" as const,
    range: r,
    unit,
    reading: `${unit === "week" ? "주(월~일)" : "달"}마다 더한 값이에요. 처음과 끝 칸은 기간에 걸친 날만 더해 짧을 수 있어요(full 이 false). partial 이 true 인 칸은 숫자가 덜 들어왔어요. movers 는 바로 앞 칸보다 ${MOVE_PCT}% 넘게 움직인 칸(둘 다 ${LOW_SAMPLE} 이상, 온전한 칸끼리)이에요. 같은 칸의 일정은 함께 나타난 것이지 원인이 아니에요`,
    buckets: buckets.map((b, i) => ({ start: b.start, end: b.end, full: b.full, posts: posts[i] })),
    metrics: metrics.map(({ key, label, unit: u, total, values, partial }) => ({ key, label, unit: u, total, values, partial: partial.some(Boolean) ? partial : undefined })),
    movers,
    events,
    notes: notes(d, s, r),
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

/**
 * 행사 하나의 성적표(달력에서 고른 행사 게임 기준). 같은 날 두 행사가 열려도 고른 게임으로 나눠 볼 수 있다.
 * 방문객은 두 가지로 준다: 판마다 더한 연인원(visitorsSum), 한 번이라도 나온 사람(uniqueVisitors)
 */
export async function eventReport(ctx: Ctx, eventId: number) {
  const all = await ctx.events();
  const event = all?.find((e) => e.id === eventId);
  if (!event) return bad("그 id 의 일정을 찾지 못했어요. events_list 로 id 를 먼저 확인해 주세요");
  if (event.category !== "event") return bad(`행사 일정이 아니에요(${event.label})`);
  if (event.day > addDays(ctx.today, -1)) return bad("아직 끝나지 않은 행사예요. 어제까지 끝난 행사만 볼 수 있어요");
  const r = await ctx.eventReport(event);
  const t = r.report.totals;
  const sameDay = (all ?? []).filter((e) => e.day === event.day && e.id !== event.id && e.category === "event").map((e) => ({ id: e.id, label: e.label }));
  return {
    status: "ok" as const,
    event: { id: event.id, day: event.day, label: event.label, startsAt: event.startsAt, endsAt: event.endsAt },
    sameDayEvents: sameDay,
    games: r.report.games.map((g) => ({ start: g.start, visitors: g.visitors, staff: g.staff, minutes: g.minutes, staffOnly: g.kind === "staff" })),
    totals: { games: t.games, gamesWithVisitors: t.withVisitors, staffOnlyGames: t.staffOnly, visitorsSum: t.visitors, uniqueVisitors: t.uniqueVisitors, staffSum: t.staff },
    day: r.report.metrics.map((m) => ({ key: m.key, label: m.label, unit: m.unit, value: m.value, usual: m.usual, pending: m.pending })),
    usualDays: r.report.baseline,
    notes: [
      ...(t.games === 0 && r.report.missing === 0 ? ["이 행사의 게임을 아직 고르지 않았어요. 지표 화면 달력에서 그날을 눌러 행사 게임을 고르면 행사별로 나눠 볼 수 있어요"] : []),
      ...(r.report.missing > 0 ? [`고른 게임 ${r.report.missing}판을 지금 게임 서버에서 찾지 못했어요`] : []),
      ...(r.report.noRoster ? [`${PARTICIPANTS_SINCE} 전 판이 섞여 누가 했는지 몰라 uniqueVisitors 는 비어 있고, 방문객은 끝까지 남은 인원이에요`] : []),
      ...(sameDay.length ? ["day 의 숫자(설치, 가입 등)는 그날 전체라 같은 날 다른 행사 몫이 섞여 있어요. 행사별로 나눌 수 있는 건 고른 게임과 방문객뿐이에요"] : []),
      ...(r.gamesError ? [`게임 서버를 읽지 못했어요: ${r.gamesError}`] : []),
      "usual 은 앞선 같은 요일 네 번(다른 행사 날 제외)의 평균이에요",
    ],
  };
}

const seoulDate = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso));

/** 기간 안에 올린 인스타 게시물(올린 날, 종류, 지금까지 누적 조회 등) */
export async function postsList(ctx: Ctx, r: Week) {
  const why = checkRange(r, ctx.today);
  if (why) return bad(why);
  const d = await ctx.dashboard(r, previousRange(r));
  const posts = d.posts
    .map((p) => ({
      day: seoulDate(p.postedAt),
      type: p.productType === "REELS" ? "릴스" : p.productType === "FEED" ? "피드" : p.productType,
      caption: (p.caption ?? "").replace(/\s+/g, " ").slice(0, 40),
      views: p.views,
      reach: p.reach,
      follows: p.follows,
    }))
    .sort((a, b) => a.day.localeCompare(b.day));
  return {
    status: posts.length ? ("ok" as const) : ("no_data" as const),
    period: r,
    posts,
    notes: ["views, reach, follows 는 올린 뒤 지금까지 쌓인 누적이에요. 올린 날 하루 몫이 아니에요"],
  };
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
    metrics_overview: tool({
      description:
        "긴 기간 훑어보기. 지표마다 주(30주 넘으면 달) 단위 흐름과 합계, 바로 앞 칸보다 크게 움직인 칸(movers), 그 기간 일정과 칸별 게시물 수. \"전체\", \"지금까지\", \"언제 가장 많았어\", \"추세\"를 물을 때 먼저 부른다",
      inputSchema: z.object({ period: range, metrics: z.array(z.enum(METRIC_KEYS)).optional().describe("필요한 지표만. 빼면 날짜별로 있는 개수 지표 전부") }),
      execute: async ({ period, metrics }, { toolCallId }) => withId(await metricsOverview(ctx, period, metrics), toolCallId),
    }),
    event_report: tool({
      description:
        "행사 성적표. 달력에서 고른 행사 게임 수, 방문객(연인원과 실제 사람 수), 그날 숫자와 평소(앞선 같은 요일). 행사 효과를 물으면 events_list 로 id 를 찾은 뒤 이걸 먼저 부른다. 같은 날 두 행사도 고른 게임으로 나눠 준다",
      inputSchema: z.object({ eventId: z.number().int().describe("events_list 의 id") }),
      execute: async ({ eventId }, { toolCallId }) => withId(await eventReport(ctx, eventId), toolCallId),
    }),
    posts_list: tool({
      description: "기간 안에 올린 인스타 게시물 목록(올린 날, 릴스/피드, 누적 조회). 게시물을 올린 날과 다른 지표를 맞춰 볼 때 쓴다",
      inputSchema: z.object({ period: range }),
      execute: async ({ period }, { toolCallId }) => withId(await postsList(ctx, period), toolCallId),
    }),
    event_window: tool({
      description: "행사 기간(day 부터 days 일)과 바로 앞 주 같은 요일을 비교. 같은 기간 다른 일정 겹침도 알려 준다. 원인이 아니라 같은 기간에 함께 나타난 변화다",
      inputSchema: z.object({ day: z.string().describe("행사 첫날 YYYY-MM-DD"), days: z.number().int().min(1).max(7).describe("행사 일수") }),
      execute: async ({ day, days }, { toolCallId }) => withId(await eventWindow(ctx, day, days), toolCallId),
    }),
  };
}
