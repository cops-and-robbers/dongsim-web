"use client";

import { useId, useRef, useState, type MouseEvent } from "react";

/**
 * 지표 화면의 날짜별 추이 (#145).
 *
 * charts.tsx 의 LineTrend 와 같은 모양에, 이 화면에 필요한 두 가지를 더했다.
 * - 선 두 개까지 (예: Android 와 iOS). 둘째 선은 AreaTrend 와 같이 앰버 점선이라
 *   색을 못 구분해도 모양으로 갈린다
 * - 게시물을 올린 날 표시. 그날 숫자가 튀었는지 눈으로 바로 잇는다
 *
 * 그라데이션 id 를 useId 로 만든다. 한 화면에 차트가 여럿이라 고정 id 면 겹친다.
 */

export type Series = { label: string; values: number[] };

type Props = {
  days: string[]; // YYYY-MM-DD
  series: [Series] | [Series, Series];
  /** 게시물을 올린 날(한국 날짜)과 첫 줄 */
  markers?: { day: string; label: string }[];
  /** 툴팁의 값 뒤에 붙는 단위 */
  unit?: string;
  format?: (v: number) => string;
};

const W = 640;
const H = 180;
const PAD_X = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 8;
const INNER_H = H - PAD_TOP - PAD_BOTTOM;

const fmtDay = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(m)}.${Number(d)}`;
};

export function TrendChart({ days, series, markers = [], unit = "", format = (v) => v.toLocaleString("ko-KR") }: Props) {
  const gid = useId().replace(/:/g, "");
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const n = days.length;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const xAt = (i: number) => (n === 1 ? W / 2 : PAD_X + (i / (n - 1)) * (W - PAD_X * 2));
  const yAt = (v: number) => PAD_TOP + INNER_H - (v / max) * INNER_H;
  const path = (values: number[]) => values.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(v)}`).join(" ");
  const markerByDay = new Map<string, string[]>();
  for (const m of markers) markerByDay.set(m.day, [...(markerByDay.get(m.day) ?? []), m.label]);

  const onMove = (e: MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || n === 0) return;
    const rel = (e.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1)))));
  };

  // 눈금 글자는 많아야 7개. 90일이면 2주 간격쯤이 된다
  const step = Math.max(1, Math.ceil(n / 7));
  const ticks = days.map((d, i) => ({ d, i })).filter(({ i }) => i % step === 0);
  const hoverDay = hover === null ? null : days[hover];
  const hoverPosts = hoverDay ? (markerByDay.get(hoverDay) ?? []) : [];

  return (
    <div>
      {series.length === 2 && (
        <div className="mb-2 flex gap-4 text-[12px] text-sd-fg-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-accent" />
            {series[0].label}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0 w-4 border-t-2 border-dashed border-sd-warning" />
            {series[1].label}
          </span>
        </div>
      )}
      <div
        ref={ref}
        className="relative"
        style={{ height: H }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`${series.map((s) => s.label).join(", ")} 날짜별 추이`}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className="[stop-color:var(--color-accent)]" stopOpacity={0.18} />
              <stop offset="100%" className="[stop-color:var(--color-accent)]" stopOpacity={0} />
            </linearGradient>
          </defs>
          {[0.5, 1].map((f) => (
            <line
              key={f}
              x1={PAD_X}
              x2={W - PAD_X}
              y1={PAD_TOP + INNER_H * f}
              y2={PAD_TOP + INNER_H * f}
              className="stroke-sd-hairline"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {days.map((d, i) =>
            markerByDay.has(d) ? (
              <line
                key={d}
                x1={xAt(i)}
                x2={xAt(i)}
                y1={PAD_TOP}
                y2={PAD_TOP + INNER_H}
                className="stroke-sd-fg-subtle"
                strokeWidth={1}
                strokeDasharray="3 4"
                vectorEffect="non-scaling-stroke"
              />
            ) : null,
          )}
          {n > 1 && (
            <path
              d={`${path(series[0].values)} L${xAt(n - 1)},${PAD_TOP + INNER_H} L${xAt(0)},${PAD_TOP + INNER_H} Z`}
              fill={`url(#fill-${gid})`}
            />
          )}
          <path
            d={path(series[0].values)}
            fill="none"
            className="stroke-accent"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {series[1] && (
            <path
              d={path(series[1].values)}
              fill="none"
              className="stroke-sd-warning"
              strokeWidth={2}
              strokeDasharray="5 5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {hover !== null && (
            <line
              x1={xAt(hover)}
              x2={xAt(hover)}
              y1={PAD_TOP}
              y2={PAD_TOP + INNER_H}
              className="stroke-sd-line"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {/* 게시물 표시 점. 선 위가 아니라 맨 위에 둬 숫자와 헷갈리지 않게 한다 */}
        {days.map((d, i) =>
          markerByDay.has(d) ? (
            <span
              key={d}
              className="pointer-events-none absolute top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-sd-fg-subtle"
              style={{ left: `${(xAt(i) / W) * 100}%` }}
            />
          ) : null,
        )}
        {hover !== null && hoverDay && (
          <div
            className="pointer-events-none absolute z-10 min-w-[120px] max-w-[240px] rounded-lg border border-sd-line bg-sd-surface px-3 py-2 text-xs shadow-lg"
            style={{
              left: `${(xAt(hover) / W) * 100}%`,
              top: 0,
              transform: `translate(${hover / Math.max(1, n - 1) < 0.2 ? "8px" : hover / Math.max(1, n - 1) > 0.8 ? "calc(-100% - 8px)" : "-50%"}, 0)`,
            }}
          >
            <div className="font-bold text-sd-fg-subtle">{fmtDay(hoverDay)}</div>
            {series.map((s) => (
              <div key={s.label} className="mt-0.5 flex justify-between gap-3">
                <span className="text-sd-fg-muted">{s.label}</span>
                <span className="font-bold text-sd-fg tabular-nums">
                  {format(s.values[hover])}
                  {unit}
                </span>
              </div>
            ))}
            {hoverPosts.map((p) => (
              <div key={p} className="mt-1 truncate border-t border-sd-hairline pt-1 text-sd-fg-muted">
                게시물: {p}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="relative mt-1.5 h-4 text-[11px] font-medium text-sd-fg-subtle">
        {ticks.map(({ d, i }) => (
          <span
            key={d}
            // 맨 앞 눈금이 카드 밖으로 반쯤 나가지 않게 첫 글자는 왼쪽에 붙인다
            className={`absolute tabular-nums ${i === 0 ? "" : "-translate-x-1/2"}`}
            style={{ left: `${(xAt(i) / W) * 100}%` }}
          >
            {fmtDay(d)}
          </span>
        ))}
      </div>
    </div>
  );
}
