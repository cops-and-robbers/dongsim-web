"use client";

import { SURFACE } from "@/components/admin/Parts";
import { AnimatedNumber } from "@/components/admin/motion";
import { Sparkline } from "@/components/admin/charts";

export function MetricCard({
  label,
  value,
  trend,
  spark,
  sub,
  accent = false,
}: {
  label: string;
  value: number;
  trend?: number;
  spark?: number[];
  sub?: string;
  accent?: boolean;
}) {
  const up = (trend ?? 0) >= 0;

  const box = accent
    ? "flex h-full flex-col rounded-2xl bg-accent p-5 text-accent-fg"
    : `${SURFACE} flex h-full flex-col p-5`;
  const labelCls = accent ? "text-accent-fg/80" : "text-sd-fg-subtle";
  const numCls = accent ? "text-accent-fg" : "text-sd-fg";
  const subCls = accent ? "text-accent-fg/75" : "text-sd-fg-subtle";

  return (
    <div className={box}>
      <p className={`text-[13px] font-medium ${labelCls}`}>{label}</p>

      <div className="mt-3 flex items-end justify-between gap-2">
        <AnimatedNumber
          value={value}
          className={`shrink-0 text-[32px] font-bold leading-none tracking-tight tabular-nums ${numCls}`}
        />
        {spark && (
          <div className={`h-8 min-w-0 max-w-24 flex-1 ${accent ? "text-accent-fg" : "text-accent"}`}>
            <Sparkline data={spark} className="h-full w-full" />
          </div>
        )}
      </div>

      {trend !== undefined ? (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 text-[13px] font-bold ${
              accent
                ? "text-accent-fg"
                : up
                  ? "text-sd-positive"
                  : "text-sd-critical"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-3.5 w-3.5 ${up ? "" : "rotate-180"}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 19V6M6 12l6-6 6 6" />
            </svg>
            {Math.abs(trend)}%
          </span>
          <span className={`text-[12px] ${subCls}`}>지난주 대비</span>
        </div>
      ) : sub ? (
        <p className={`mt-3 text-[12px] font-medium ${subCls}`}>{sub}</p>
      ) : null}
    </div>
  );
}
