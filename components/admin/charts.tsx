"use client";

import { useRef, useState, type MouseEvent } from "react";
import { motion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

// ── 스파크라인 (스탯 카드용 미니 라인) ──
export function Sparkline({
  data,
  className = "",
  stroke = "currentColor",
}: {
  data: number[];
  className?: string;
  stroke?: string;
}) {
  const w = 100;
  const h = 32;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / span) * (h - 4) - 2;
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      <polygon points={area} fill={stroke} opacity={0.1} />
      <motion.polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: EASE }}
      />
    </svg>
  );
}

// ── 도넛 (게임 상태 분포) ──
type Segment = { label: string; value: number; color: string };

export function Donut({
  segments,
  centerLabel,
  centerValue,
}: {
  segments: Segment[];
  centerLabel: string;
  centerValue: number;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = 52;
  const cx = 70;
  const cy = 70;
  // 세그먼트별 시작 각도(누적 비율). 렌더 중 변수 재할당 대신 미리 계산한다.
  const offsets = segments.reduce<number[]>(
    (arr, seg) => [...arr, arr[arr.length - 1] + seg.value / total],
    [0]
  );

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0">
        <svg viewBox="0 0 140 140" className="h-[140px] w-[140px] -rotate-90">
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            className="stroke-sd-hairline"
            strokeWidth={14}
          />
          {segments.map((seg, i) => {
            const frac = seg.value / total;
            const rotation = offsets[i] * 360;
            return (
              <motion.circle
                key={seg.label}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                strokeWidth={14}
                strokeLinecap="round"
                style={{ stroke: seg.color, rotate: rotation, transformOrigin: "center" }}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: Math.max(frac - 0.012, 0) }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.1 + i * 0.12 }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-2xl font-extrabold tabular-nums text-sd-fg"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, ease: EASE }}
          >
            {centerValue}
          </motion.span>
          <span className="text-[11px] font-medium text-sd-fg-subtle">
            {centerLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {segments.map((seg, i) => (
          <motion.div
            key={seg.label}
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: seg.color }}
            />
            <span className="text-[13px] font-medium text-sd-fg-subtle">
              {seg.label}
            </span>
            <span className="text-[13px] font-bold text-sd-fg tabular-nums">
              {seg.value}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── 단일 라인 추이 (DAU 등) ──
export function LineTrend({
  data,
}: {
  data: readonly { date: string; value: number }[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 200;
  const padX = 12;
  const padTop = 16;
  const padBottom = 24;
  const innerH = H - padTop - padBottom;
  const max = Math.max(...data.map((d) => d.value), 1);
  const xAt = (i: number) => padX + (i / (data.length - 1)) * (W - padX * 2);
  const yAt = (v: number) => padTop + innerH - (v / max) * innerH;
  const line = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(d.value)}`)
    .join(" ");
  const area = `${line} L${xAt(data.length - 1)},${padTop + innerH} L${padX},${padTop + innerH} Z`;

  const fmtDay = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${Number(m)}.${Number(d)}`;
  };
  const onMove = (e: MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const rel = (e.clientX - rect.left) / rect.width;
    setHover(
      Math.max(0, Math.min(data.length - 1, Math.round(rel * (data.length - 1))))
    );
  };

  return (
    <div>
      <div
        className="relative"
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        style={{ height: H }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-full w-full"
          preserveAspectRatio="none"
        >
        <defs>
          <linearGradient id="dauFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="[stop-color:var(--color-accent)]" stopOpacity={0.25} />
            <stop offset="100%" className="[stop-color:var(--color-accent)]" stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0.33, 0.66, 1].map((f) => (
          <line
            key={f}
            x1={padX}
            x2={W - padX}
            y1={padTop + innerH * f}
            y2={padTop + innerH * f}
            className="stroke-sd-hairline"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <motion.path
          d={area}
          fill="url(#dauFill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />
        <motion.path
          d={line}
          fill="none"
          className="stroke-accent"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: EASE }}
        />
        {hover !== null && (
          <line
            x1={xAt(hover)}
            x2={xAt(hover)}
            y1={padTop}
            y2={padTop + innerH}
            className="stroke-sd-line"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {hover !== null && (
        <>
          <span
            className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent"
            style={{
              left: `${(xAt(hover) / W) * 100}%`,
              top: `${(yAt(data[hover].value) / H) * 100}%`,
            }}
          />
          <div
            className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-sd-line bg-sd-surface px-2.5 py-1.5 text-xs shadow-lg"
            style={{
              left: `${(xAt(hover) / W) * 100}%`,
              top: `${(yAt(data[hover].value) / H) * 100}%`,
              transform: `translate(${
                hover / (data.length - 1) < 0.12
                  ? "0%"
                  : hover / (data.length - 1) > 0.88
                    ? "-100%"
                    : "-50%"
              }, calc(-100% - 10px))`,
            }}
          >
            <span className="font-bold text-sd-fg-subtle">
              {fmtDay(data[hover].date)}
            </span>{" "}
            <span className="font-bold text-sd-fg">
              {data[hover].value}
            </span>
          </div>
        </>
      )}
      </div>

      <div className="mt-2 flex justify-between px-2 text-[11px] font-medium text-sd-fg-subtle">
        {data
          .filter((_, i) => i % 3 === 0)
          .map((d) => (
            <span key={d.date}>{fmtDay(d.date)}</span>
          ))}
      </div>
    </div>
  );
}

// ── 막대 리스트 (상위 이벤트 등) ──
export function BarList({
  items,
}: {
  items: readonly { label: string; value: number }[];
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-3.5">
      {items.map((it, idx) => (
        <div key={it.label}>
          <div className="mb-1.5 flex items-center justify-between text-[13px]">
            <span className="font-mono font-medium text-sd-fg-muted">
              {it.label}
            </span>
            <span className="font-bold tabular-nums text-sd-fg">
              {it.value.toLocaleString()}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-sd-gray-200">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${(it.value / max) * 100}%` }}
              transition={{ duration: 0.9, ease: EASE, delay: idx * 0.06 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 상태 분포 막대 (도넛 대체: 작은 점 + 얇은 막대 + 숫자/비율) ──
export function StatusBars({
  segments,
}: {
  segments: readonly { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <div className="space-y-4">
      {segments.map((s, i) => (
        <div key={s.label}>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-2 text-[13px] font-medium text-sd-fg-muted">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: s.color }}
              />
              {s.label}
            </span>
            <span className="text-[13px] font-bold text-sd-fg tabular-nums">
              {s.value}
              <span className="ml-1 text-[12px] font-medium text-sd-fg-subtle">
                {Math.round((s.value / total) * 100)}%
              </span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-sd-gray-200">
            <motion.div
              className="h-full rounded-full"
              style={{ background: s.color }}
              initial={{ width: 0 }}
              animate={{ width: `${(s.value / total) * 100}%` }}
              transition={{ duration: 0.9, ease: EASE, delay: i * 0.06 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 영역 추이 차트 (14일, 인터랙티브) ──
type TrendPoint = { date: string; users: number; games: number };

export function AreaTrend({ data }: { data: readonly TrendPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const W = 640;
  const H = 240;
  const padX = 12;
  const padTop = 16;
  const padBottom = 28;
  const max = Math.max(...data.flatMap((d) => [d.users, d.games]), 1);
  const innerH = H - padTop - padBottom;

  const xAt = (i: number) =>
    padX + (i / (data.length - 1)) * (W - padX * 2);
  const yAt = (v: number) => padTop + innerH - (v / max) * innerH;

  const linePath = (key: "users" | "games") =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(d[key])}`).join(" ");
  const areaPath = `${linePath("games")} L${xAt(data.length - 1)},${padTop + innerH} L${padX},${padTop + innerH} Z`;

  const onMove = (e: MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const rel = (e.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(rel * (data.length - 1)))));
  };

  const fmtDay = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${Number(m)}.${Number(d)}`;
  };

  return (
    <div>
      <div
        className="relative"
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        style={{ height: H }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-full w-full"
          preserveAspectRatio="none"
        >
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="[stop-color:var(--color-accent)]" stopOpacity={0.28} />
            <stop offset="100%" className="[stop-color:var(--color-accent)]" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* 가로 격자 */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={padX}
            x2={W - padX}
            y1={padTop + innerH * f}
            y2={padTop + innerH * f}
            className="stroke-sd-hairline"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <motion.path
          d={areaPath}
          fill="url(#areaFill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />
        <motion.path
          d={linePath("games")}
          fill="none"
          className="stroke-accent"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: EASE }}
        />
        <motion.path
          d={linePath("users")}
          fill="none"
          className="stroke-sd-warning"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1 5"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: EASE, delay: 0.15 }}
        />

        {hover !== null && (
          <line
            x1={xAt(hover)}
            x2={xAt(hover)}
            y1={padTop}
            y2={padTop + innerH}
            className="stroke-sd-line"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {/* 호버 점 + 툴팁 (HTML 오버레이, 퍼센트 좌표) */}
      {hover !== null && (
        <>
          {(["games", "users"] as const).map((key) => (
            <span
              key={key}
              className={`pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ${
                key === "games" ? "bg-accent" : "bg-sd-warning"
              }`}
              style={{
                left: `${(xAt(hover) / W) * 100}%`,
                top: `${(yAt(data[hover][key]) / H) * 100}%`,
              }}
            />
          ))}
          <div
            className="pointer-events-none absolute z-10 whitespace-nowrap rounded-xl border border-sd-line bg-sd-surface px-3 py-2 text-xs shadow-lg"
            style={{
              left: `${(xAt(hover) / W) * 100}%`,
              top: `${(yAt(Math.max(data[hover].games, data[hover].users)) / H) * 100}%`,
              transform: `translate(${
                hover / (data.length - 1) < 0.12
                  ? "0%"
                  : hover / (data.length - 1) > 0.88
                    ? "-100%"
                    : "-50%"
              }, calc(-100% - 10px))`,
            }}
          >
            <p className="mb-1 font-bold text-sd-fg-subtle">
              {fmtDay(data[hover].date)}
            </p>
            <p className="flex items-center gap-1.5 font-semibold text-sd-fg">
              <span className="h-2 w-2 rounded-full bg-accent" />
              게임 {data[hover].games}
            </p>
            <p className="flex items-center gap-1.5 font-semibold text-sd-fg">
              <span className="h-2 w-2 rounded-full bg-sd-warning" />
              유저 {data[hover].users}
            </p>
          </div>
        </>
      )}
      </div>

      {/* x축 라벨 */}
      <div className="mt-2 flex justify-between px-2 text-[11px] font-medium text-sd-fg-subtle">
        {data
          .filter((_, i) => i % 3 === 0)
          .map((d) => (
            <span key={d.date}>{fmtDay(d.date)}</span>
          ))}
      </div>

      {/* 범례 */}
      <div className="mt-3 flex items-center gap-4 text-[12px] font-semibold">
        <span className="flex items-center gap-1.5 text-sd-fg-muted">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          게임
        </span>
        <span className="flex items-center gap-1.5 text-sd-fg-muted">
          <span className="h-2.5 w-2.5 rounded-full bg-sd-warning" />
          유저
        </span>
      </div>
    </div>
  );
}
