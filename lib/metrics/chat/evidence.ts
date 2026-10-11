/**
 * 답 아래에 붙이는 근거 그림 (#163). 모델이 쓴 글이 아니라 도구 결과를 그대로 그림으로 바꾼다.
 *
 * 분석 도구의 챗봇들(Mixpanel Spark, Amplitude, Metabase Metabot)은 답을 글이 아니라 차트로 먼저 주고,
 * 그 차트를 눌러 원래 보고서로 넘어가게 한다. 여기서도 같은 생각이다.
 * - 답의 사실(facts)이 인용한 도구 호출만 그림으로 만든다. 인용이 없으면 부른 도구 전부
 * - 비교와 합계는 답에 나온 숫자가 든 지표만 고른다(지표 22개를 다 늘어놓지 않는다). 하나도 안 맞으면 값이 있는 앞의 셋
 * - 그림마다 지표 화면에서 같은 기간, 같은 탭을 여는 대상(target)을 붙인다
 *
 * 화면 코드와 떼어 둔 순수 함수라 시험할 수 있다(evidence.test.mjs).
 */

import { addDays, ymdRange } from "../dates.ts";
import { matches, numbersIn } from "./verify.ts";

export type Range = { start: string; end: string };
export type Trace = { id: string; name: string; input: Record<string, unknown>; output: Record<string, unknown> };
type Ratio = { num: number; den: number };
type Metric = {
  key: string;
  label: string;
  unit: string;
  a?: number | null;
  b?: number | null;
  value?: number | null;
  diff?: number | null;
  diffPoints?: number | null;
  changePct?: number | null;
  lowSample?: boolean;
  num?: number;
  den?: number;
  aOf?: Ratio | null;
  bOf?: Ratio | null;
};

export type DashTab = "summary" | "instagram" | "traffic" | "store" | "app";
/** 지표 화면에서 열 곳. cmpFrom 은 비교 기간 첫날(바로 앞 같은 길이면 null) */
export type Target = { range: Range; cmpFrom: string | null; tab: DashTab };

export type Evidence = { id: string; target: Target | null; notes: string[] } & (
  | {
      kind: "compare";
      title: string | null;
      a: Range;
      b: Range;
      /** 비율 지표는 points(%p 차이)와 aOf(분자/분모), 개수 지표는 changePct */
      rows: { key: string; label: string; unit: string; a: number | null; b: number | null; changePct: number | null; points: number | null; aOf: Ratio | null; lowSample: boolean }[];
    }
  | { kind: "summary"; range: Range; rows: { key: string; label: string; unit: string; value: number | null; of: Ratio | null }[] }
  | {
      kind: "weekly";
      range: Range;
      unit: "week" | "month";
      buckets: Range[];
      events: { day: string; label: string }[];
      rows: { key: string; label: string; unit: string; total: number | null; values: (number | null)[] }[];
    }
  | { kind: "daily"; range: Range; label: string; unit: string; series: { day: string; value: number | null }[]; peak: { day: string; value: number } | null; total: number | null }
  | { kind: "bars"; range: Range; title: string; unit: string; country: boolean; rows: { label: string; value: number }[] }
  | { kind: "events"; range: Range; events: { day: string; label: string }[] }
);

const MAX_ROWS = 4;


/**
 * 서버 안내문 중 이 그림에 든 지표와 상관있는 것만, 날짜는 "10월 5일"로.
 * 안 그러면 App Store 만 묻는 답에 Google Play 안내가 붙는다
 */
function notesFor(all: unknown, keys: string[]): string[] {
  if (!Array.isArray(all)) return [];
  const play = keys.some((k) => k.startsWith("play_"));
  const server = keys.some((k) => k === "games" || k === "game_players" || k === "signups");
  return (all as string[])
    .filter((n) => (n.includes("Google Play") ? play : /게임|가입|운영진|시험 판/.test(n) ? server : true))
    .map((n) => n.replace(/(\d{4})-(\d{2})-(\d{2})\s?/g, (_, _y, m: string, d: string) => `${Number(m)}월 ${Number(d)}일`));
}
const MAX_BLOCKS = 2;

/** 지표 키가 지표 화면의 어느 탭에 있나 */
export function tabOf(key: string): DashTab {
  if (key.startsWith("ig_")) return "instagram";
  if (key.startsWith("web_") || key.startsWith("download_")) return "traffic";
  if (key.startsWith("appstore_") || key.startsWith("play_")) return "store";
  return "app";
}

const isRange = (x: unknown): x is Range => !!x && typeof (x as Range).start === "string" && typeof (x as Range).end === "string";

/** b 가 a 바로 앞 같은 길이면 지표 화면 기본 비교(이전 기간)라 따로 적지 않는다 */
function cmpFromOf(a: Range, b: Range): string | null {
  const len = ymdRange(a.start, a.end).length;
  return b.start === addDays(a.start, -len) && b.end === addDays(a.start, -1) ? null : b.start;
}

/** 답에 나온 숫자가 든 지표만. 없으면 값이 있는 앞의 셋 */
function pick<T extends Metric>(rows: T[], said: number[]): T[] {
  const has = (m: T) =>
    [m.a, m.b, m.value, m.changePct, m.diff, m.diffPoints, m.num, m.den, m.aOf?.num, m.aOf?.den].some((v) => typeof v === "number" && said.some((x) => matches(x, v)));
  const hit = rows.filter(has);
  const withValue = rows.filter((m) => [m.a, m.b, m.value].some((v) => typeof v === "number"));
  return (hit.length ? hit : withValue.slice(0, 3)).slice(0, MAX_ROWS);
}

function one(t: Trace, said: number[]): Evidence | null {
  const o = t.output;
  if (o.status !== "ok") return null;
  const base = { id: t.id, notes: [] as string[] };
  if (Array.isArray(o.metrics) && Array.isArray(o.buckets) && isRange(o.range)) {
    // 훑어보기: 답에 나온 숫자(합계나 어느 칸 값)가 든 지표 둘까지, 없으면 합계가 있는 앞의 둘
    type Row = { key: string; label: string; unit: string; total: number | null; values: (number | null)[] };
    const all = o.metrics as Row[];
    const hit = all.filter((m) => [m.total, ...m.values].some((v) => typeof v === "number" && said.some((x) => matches(x, v))));
    const rows = (hit.length ? hit : all.filter((m) => m.total !== null)).slice(0, 2).map(({ key, label, unit, total, values }) => ({ key, label, unit, total, values }));
    if (!rows.length) return null;
    return {
      ...base,
      notes: notesFor(o.notes, rows.map((r) => r.key)),
      kind: "weekly",
      range: o.range,
      unit: o.unit === "month" ? "month" : "week",
      buckets: (o.buckets as Range[]).map(({ start, end }) => ({ start, end })),
      events: Array.isArray(o.events) ? (o.events as { day: string; label: string }[]) : [],
      rows,
      target: { range: o.range, cmpFrom: null, tab: tabOf(rows[0].key) },
    };
  }
  if (Array.isArray(o.metrics) && isRange(o.periodA) && isRange(o.periodB)) {
    const rows = pick(o.metrics as Metric[], said).map((m) => ({
      key: m.key,
      label: m.label,
      unit: m.unit,
      a: m.a ?? null,
      b: m.b ?? null,
      changePct: m.changePct ?? null,
      points: m.diffPoints ?? null,
      aOf: m.aOf ?? null,
      lowSample: !!m.lowSample,
    }));
    if (!rows.length) return null;
    const event = isRange(o.eventPeriod);
    return {
      ...base,
      notes: notesFor(o.notes, rows.map((r) => r.key)),
      kind: "compare",
      title: event ? "행사 기간과 앞 주 같은 요일" : null,
      a: o.periodA,
      b: o.periodB,
      rows,
      target: { range: o.periodA, cmpFrom: cmpFromOf(o.periodA, o.periodB), tab: tabOf(rows[0].key) },
    };
  }
  if (Array.isArray(o.metrics) && isRange(o.range)) {
    const rows = pick(o.metrics as Metric[], said).map((m) => ({ key: m.key, label: m.label, unit: m.unit, value: m.value ?? null, of: typeof m.den === "number" ? { num: m.num ?? 0, den: m.den } : null }));
    if (!rows.length) return null;
    return { ...base, notes: notesFor(o.notes, rows.map((r) => r.key)), kind: "summary", range: o.range, rows, target: { range: o.range, cmpFrom: null, tab: tabOf(rows[0].key) } };
  }
  if (Array.isArray(o.series) && isRange(o.range)) {
    return {
      ...base,
      kind: "daily",
      range: o.range,
      label: String(o.label ?? ""),
      unit: String(o.unit ?? ""),
      series: o.series as { day: string; value: number | null }[],
      peak: (o.peak as { day: string; value: number } | null) ?? null,
      total: typeof o.total === "number" ? o.total : null,
      target: { range: o.range, cmpFrom: null, tab: tabOf(String(o.metric ?? "")) },
    };
  }
  if (isRange(o.range) && typeof o.dimension === "string") {
    const r = o.range;
    const bars = (title: string, unit: string, rows: { label: string; value: number }[], tab: DashTab, country = false): Evidence => ({
      ...base,
      kind: "bars",
      range: r,
      title,
      unit,
      country,
      rows: rows.filter((x) => x.value > 0).sort((x, y) => y.value - x.value).slice(0, 5),
      target: { range: r, cmpFrom: null, tab },
    });
    if (o.dimension === "country") {
      const rows = (o.rows as { country: string; appStore: number; play: number }[]).map((x) => ({ label: x.country, value: x.appStore + x.play }));
      return bars("나라별 최초 설치", "건", rows, "store", true);
    }
    if (o.dimension === "channel") return bars("들어온 길별 사이트 방문", "회", (o.rows as { channel: string; sessions: number }[]).map((x) => ({ label: x.channel, value: x.sessions })), "traffic");
    if (o.dimension === "campaign") {
      const rows = (o.web as { source: string; campaign: string; sessions: number }[]).map((x) => ({ label: x.campaign && x.campaign !== "(not set)" ? x.campaign : x.source, value: x.sessions }));
      return bars("캠페인별 사이트 방문", "회", rows, "traffic");
    }
    if (o.dimension === "appstore_way") {
      const w = o.current as { search: number; web: number; app: number; other: number };
      const rows = [
        { label: "스토어 검색", value: w.search },
        { label: "웹 링크(사이트, QR)", value: w.web },
        { label: "다른 앱 링크", value: w.app },
        { label: "그 밖", value: w.other },
      ];
      return bars("App Store 최초 다운로드를 받은 길", "건", rows, "store");
    }
  }
  if (Array.isArray(o.events) && isRange(o.range)) {
    return { ...base, kind: "events", range: o.range, events: (o.events as { day: string; label: string }[]).slice(0, 6), target: { range: o.range, cmpFrom: null, tab: "summary" } };
  }
  return null;
}

/** 답이 인용한 도구 결과를 그림 재료로. 답에 나온 숫자로 지표를 고른다 */
export function evidenceOf(traces: Trace[], answer: { headline: { text: string; refs: string[] }; facts: { text: string; refs: string[] }[] }): Evidence[] {
  const said = numbersIn([answer.headline.text, ...answer.facts.map((f) => f.text)].join(" "));
  const cited = new Set([...answer.headline.refs, ...answer.facts.flatMap((f) => f.refs)]);
  const used = traces.filter((t) => cited.has(t.id));
  const pool = used.length ? used : traces;
  // 같은 도구를 같은 입력으로 두 번 부른 것은 하나만
  const seen = new Set<string>();
  const out: Evidence[] = [];
  for (const t of pool) {
    const k = `${t.name}:${JSON.stringify(t.input)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const e = one(t, said);
    if (e) out.push(e);
    if (out.length === MAX_BLOCKS) break;
  }
  return out;
}
