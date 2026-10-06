"use client";

import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useCompare } from "@/components/admin/metrics/compareContext";

/**
 * 지표 화면의 날짜별 추이 (#145).
 *
 * 규칙은 docs/admin-ui.md "차트" 에 있다. 요약하면
 * - 선은 2px 실선. 점선은 "예측, 아직 덜 들어옴"으로 읽혀서(Stripe, Plausible, GOV.UK) 쓰지 않는다
 * - 색은 차트 전용 토큰(--chart-1, --chart-2). 상태색(warning 등)은 좋다, 나쁘다를 뜻할 때만 쓴다
 * - 이전 기간은 회색 가는 선으로 겹친다. 이번 기간이 주인공이라 이전 기간은 뒤로 물러나 있다
 * - 세로축 눈금은 0, 5, 10 같은 반듯한 값으로 3~4칸. 마우스를 올리지 않아도 크기를 읽는다
 * - 숫자가 없는 날(아직 안 들어옴, 수집 전)은 0 으로 그리지 않고 선을 끊는다
 * - 높이는 px 로 고정하고 폭만 늘어난다. 같은 줄 차트는 높이가 같다
 * - 마우스는 올리면, 터치는 누르고 밀면, 키보드는 좌우 화살표로 그날 숫자를 본다
 *
 * 그라데이션 id 를 useId 로 만든다. 한 화면에 차트가 여럿이라 고정 id 면 겹친다.
 */

export type Series = { label: string; values: (number | null)[] };
export type Marker = { day: string; label: string; kind: "post" | "event" };

type Props = {
  days: string[]; // YYYY-MM-DD
  series: [Series] | [Series, Series];
  /** 이전 기간 값. 첫 번째 선과 같은 순서(이전 기간의 n번째 날)로 겹친다 */
  previous?: (number | null)[];
  /**
   * 그날 있었던 일. post 는 인스타 게시물(동그라미), event 는 우리가 적은 일정(마름모, 행사나 업데이트).
   * 색이 아니라 모양으로 가른다
   */
  markers?: Marker[];
  /** 툴팁 값 뒤에 붙는 단위 */
  unit?: string;
};

const W = 640;
const H = 168; // 그림 영역 높이(px). x축 글자 줄은 따로 18px
const PAD_TOP = 8;
const INNER_H = H - PAD_TOP;
const LINE = ["stroke-chart-1", "stroke-chart-2"] as const;
const KEY = ["bg-chart-1", "bg-chart-2"] as const;

const full = (v: number) => v.toLocaleString("ko-KR");
// 축 글자는 짧게: 1.2천, 3.4만
const compact = new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 });

const fmtDay = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(m)}.${Number(d)}`;
};

/** 0 부터 max 를 덮는 반듯한 눈금(1, 2, 5 의 10 배수 간격)을 3~4칸으로. 횟수라 간격은 1 이상 */
export function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const rough = Math.max(1, max / 3);
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= rough) ?? 10 * mag;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

/** null 에서 끊어 여러 조각의 path 로 */
function pathOf(values: (number | null)[], x: (i: number) => number, y: (v: number) => number): string {
  let d = "";
  let pen = false;
  values.forEach((v, i) => {
    if (v === null) {
      pen = false;
      return;
    }
    d += `${pen ? "L" : "M"}${x(i)},${y(v)} `;
    pen = true;
  });
  return d.trim();
}

export function TrendChart({ days, series, previous, markers = [], unit = "" }: Props) {
  // 비교 문구와 비교 날짜는 화면 전체가 같아 컨텍스트로 받는다(#152)
  const cmp = useCompare();
  const gid = useId().replace(/:/g, "");
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const n = days.length;
  const all = [...series.flatMap((s) => s.values), ...(previous ?? [])].filter((v): v is number => v !== null);
  const ticks = niceTicks(Math.max(0, ...all));
  const top = ticks[ticks.length - 1];
  const xAt = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const yAt = (v: number) => PAD_TOP + INNER_H - (v / top) * INNER_H;
  const markerByDay = new Map<string, Marker[]>();
  for (const m of markers) markerByDay.set(m.day, [...(markerByDay.get(m.day) ?? []), m]);
  const kindsOn = (d: string) => new Set((markerByDay.get(d) ?? []).map((m) => m.kind));

  const pick = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || n === 0) return;
    const rel = (clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1)))));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setHover((h) => Math.max(0, Math.min(n - 1, (h ?? (e.key === "ArrowLeft" ? n : -1)) + (e.key === "ArrowLeft" ? -1 : 1))));
  };

  // x축 글자는 많아야 7개. 91일이면 2주 간격쯤이 된다
  const step = Math.max(1, Math.ceil(n / 7));
  const xTicks = days.map((d, i) => ({ d, i })).filter(({ i }) => i % step === 0);
  const hoverDay = hover === null ? null : days[hover];
  const hoverPosts = hoverDay ? (markerByDay.get(hoverDay) ?? []) : [];
  const hasPosts = days.some((d) => kindsOn(d).has("post"));
  const hasEvents = days.some((d) => kindsOn(d).has("event"));
  // 선이 하나뿐이고 비교선도 표시도 없으면 제목이 곧 범례라 따로 두지 않는다
  const legend = series.length === 2 || previous || hasPosts || hasEvents;

  // 화면 읽기용 한 줄: "조회 기간 합 934회, 가장 많은 날 10.2 212회"
  const summary =
    all.length === 0
      ? "숫자가 없어요"
      : series
          .map((s) => {
            const vals = s.values.map((v) => v ?? -1);
            const topAt = vals.indexOf(Math.max(...vals));
            const total = s.values.reduce<number>((a, v) => a + (v ?? 0), 0);
            return topAt < 0 || vals[topAt] < 0
              ? `${s.label} 숫자 없음`
              : `${s.label} 기간 합 ${full(total)}${unit}, 가장 많은 날 ${fmtDay(days[topAt])} ${full(vals[topAt])}${unit}`;
          })
          .join(". ");

  return (
    <figure>
      {legend && (
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-sd-fg-muted">
          {series.map((s, i) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span className={`h-0.5 w-3.5 rounded-full ${KEY[i]}`} />
              {s.label}
            </span>
          ))}
          {previous && (
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3.5 rounded-full bg-chart-prev" />
              {cmp.word}
            </span>
          )}
          {hasPosts && (
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sd-fg-subtle" />
              인스타 게시물
            </span>
          )}
          {hasEvents && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rotate-45 rounded-[1px] bg-sd-fg-muted" />
              일정
            </span>
          )}
        </div>
      )}
      <div className="flex gap-2">
        {/* 세로축 눈금 글자. 그림과 같은 높이에 맞춰 놓는다 */}
        <div className="relative w-8 shrink-0 text-right text-[11px] text-sd-fg-subtle tabular-nums" style={{ height: H }} aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2 leading-none" style={{ top: yAt(t) }}>
              {compact.format(t)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div
            ref={ref}
            className="relative touch-pan-y rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
            style={{ height: H }}
            onPointerMove={(e: PointerEvent) => pick(e.clientX)}
            onPointerDown={(e: PointerEvent) => pick(e.clientX)}
            onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
            onKeyDown={onKey}
            onBlur={() => setHover(null)}
            tabIndex={0}
            role="img"
            aria-label={summary}
          >
            <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" className="[stop-color:var(--chart-1)]" stopOpacity={0.12} />
                  <stop offset="100%" className="[stop-color:var(--chart-1)]" stopOpacity={0} />
                </linearGradient>
              </defs>
              {ticks.map((t) => (
                <line
                  key={t}
                  x1={0}
                  x2={W}
                  y1={yAt(t)}
                  y2={yAt(t)}
                  className={t === 0 ? "stroke-sd-line" : "stroke-sd-hairline"}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {/* 게시물 올린 날과 일정. 데이터보다 옅게 둬 선과 헷갈리지 않게 한다. 일정은 조금 더 진하게 */}
              {days.map((d, i) =>
                markerByDay.has(d) ? (
                  <line
                    key={`m-${d}`}
                    x1={xAt(i)}
                    x2={xAt(i)}
                    y1={PAD_TOP}
                    y2={PAD_TOP + INNER_H}
                    className={kindsOn(d).has("event") ? "stroke-sd-fg-subtle" : "stroke-sd-line"}
                    strokeWidth={1}
                    strokeDasharray="2 4"
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null,
              )}
              {previous && (
                <path
                  d={pathOf(previous, xAt, yAt)}
                  fill="none"
                  className="stroke-chart-prev"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {series.length === 1 &&
                pathOf(series[0].values, xAt, yAt)
                  .split(/(?=M)/)
                  .filter((seg) => seg.includes("L"))
                  .map((seg, k) => {
                    // 끊긴 조각마다 아래를 옅게 채운다(조각의 처음과 끝 x 로 닫는다)
                    const xs = [...seg.matchAll(/[ML]([\d.]+),/g)].map((m) => m[1]);
                    return (
                      <path
                        key={k}
                        d={`${seg} L${xs[xs.length - 1]},${PAD_TOP + INNER_H} L${xs[0]},${PAD_TOP + INNER_H} Z`}
                        fill={`url(#fill-${gid})`}
                      />
                    );
                  })}
              {series.map((s, i) => (
                <path
                  key={s.label}
                  d={pathOf(s.values, xAt, yAt)}
                  fill="none"
                  className={LINE[i]}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {hover !== null && (
                <line
                  x1={xAt(hover)}
                  x2={xAt(hover)}
                  y1={PAD_TOP}
                  y2={PAD_TOP + INNER_H}
                  className="stroke-sd-fg-subtle"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
            {/* 위쪽 표시와 짚은 날의 점. viewBox 가 늘어나도 모양이 안 찌그러지게 HTML 로 그린다 */}
            {days.map((d, i) =>
              markerByDay.has(d) ? (
                <span
                  key={`dot-${d}`}
                  className={`pointer-events-none absolute -translate-x-1/2 ${
                    kindsOn(d).has("event") ? "-top-1.5 h-2 w-2 rotate-45 rounded-[1px] bg-sd-fg-muted" : "-top-1 h-1.5 w-1.5 rounded-full bg-sd-fg-subtle"
                  }`}
                  style={{ left: `${(xAt(i) / W) * 100}%` }}
                />
              ) : null,
            )}
            {hover !== null &&
              series.map((s, i) =>
                s.values[hover] === null ? null : (
                  <span
                    key={`h-${s.label}`}
                    className={`pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-sd-surface ${KEY[i]}`}
                    style={{ left: `${(xAt(hover) / W) * 100}%`, top: yAt(s.values[hover] as number) }}
                  />
                ),
              )}
            {hover !== null && hoverDay && (
              <div
                className="pointer-events-none absolute z-10 min-w-[140px] max-w-[240px] rounded-lg border border-sd-line bg-sd-surface px-3 py-2 text-xs shadow-lg"
                style={{
                  left: `${(xAt(hover) / W) * 100}%`,
                  top: 0,
                  transform: `translate(${hover / Math.max(1, n - 1) < 0.25 ? "10px" : hover / Math.max(1, n - 1) > 0.75 ? "calc(-100% - 10px)" : "-50%"}, 0)`,
                }}
              >
                <div className="mb-1 text-sd-fg-subtle">{fmtDay(hoverDay)}</div>
                {series.map((s, i) => (
                  <Row key={s.label} keyClass={KEY[i]} label={s.label} value={s.values[hover]} unit={unit} />
                ))}
                {previous && (
                  <Row
                    keyClass="bg-chart-prev"
                    label={cmp.days[hover] ? `${cmp.word} ${fmtDay(cmp.days[hover])}` : `${cmp.word} 같은 날`}
                    value={previous[hover] ?? null}
                    unit={unit}
                  />
                )}
                {hoverPosts.map((m, i) => (
                  <div key={`${i}-${m.label}`} className="mt-1.5 truncate border-t border-sd-hairline pt-1.5 text-sd-fg-muted">
                    {m.kind === "event" ? "일정" : "게시물"}: {m.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="relative mt-1.5 h-4 text-[11px] text-sd-fg-subtle tabular-nums" aria-hidden>
            {xTicks.map(({ d, i }) => (
              <span
                key={d}
                // 맨 앞 글자는 왼쪽에 붙여 카드 밖으로 반쯤 나가지 않게 한다
                className={`absolute ${i === 0 ? "" : "-translate-x-1/2"}`}
                style={{ left: `${(xAt(i) / W) * 100}%` }}
              >
                {fmtDay(d)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}

/** 툴팁 한 줄. 사람은 선이 무엇인지 이미 알고 숫자를 찾으니 숫자를 굵게, 이름은 옅게 */
function Row({ keyClass, label, value, unit }: { keyClass: string; label: string; value: number | null; unit: string }) {
  return (
    <div className="mt-0.5 flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-sd-fg-muted">
        <span className={`h-0.5 w-3 rounded-full ${keyClass}`} />
        {label}
      </span>
      <span className="font-bold text-sd-fg tabular-nums">{value === null ? "-" : `${full(value)}${unit}`}</span>
    </div>
  );
}
