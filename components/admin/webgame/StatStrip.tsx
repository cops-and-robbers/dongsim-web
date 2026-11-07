import type { ReactNode } from "react";
import { SURFACE } from "@/components/admin/Parts";

// 숫자 셋을 한 카드에 나란히. 숫자에는 늘 단위를 붙이고(Grafana 원칙), 판정이 필요한 숫자는 옆에 글자로 판정을 둔다.
// 폰에서도 세 칸을 한 줄로 둬서 카드 셋이 세로로 길게 쌓이지 않게 한다
export type Stat = { label: string; value: ReactNode; unit: string; note: ReactNode; noteTone?: "good" | "warn" | "bad" | "muted" };

const NOTE = { good: "text-sd-positive", warn: "text-sd-warning", bad: "text-sd-critical", muted: "text-sd-fg-subtle" } as const;

export function StatStrip({ stats }: { stats: readonly Stat[] }) {
  return (
    <div className={`${SURFACE} grid grid-cols-3 divide-x divide-sd-hairline`}>
      {stats.map((s) => (
        <div key={s.label} className="min-w-0 px-3 py-4 sm:px-5 sm:py-5">
          <p className="truncate text-[12px] font-medium text-sd-fg-subtle sm:text-[13px]">{s.label}</p>
          <p className="mt-2 flex items-baseline gap-1 sm:mt-3">
            <span className="text-[24px] font-bold leading-none tracking-tight tabular-nums text-sd-fg sm:text-[32px]">{s.value}</span>
            <span className="text-[13px] font-semibold text-sd-fg-subtle sm:text-[15px]">{s.unit}</span>
          </p>
          <p className={`mt-2 text-[12px] font-medium leading-snug sm:mt-3 ${NOTE[s.noteTone ?? "muted"]}`}>{s.note}</p>
        </div>
      ))}
    </div>
  );
}
