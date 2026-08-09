"use client";

import { useId } from "react";
import { motion } from "motion/react";

// 세그먼트 컨트롤 - 회색 트랙 위 세그먼트, 활성은 흰 알약이 슬라이드.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const gid = useId();
  return (
    <div className="inline-flex rounded-xl bg-sd-gray-200 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`relative rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              active
                ? "text-sd-fg"
                : "text-sd-fg-subtle hover:text-sd-fg-muted"
            }`}
          >
            {active && (
              <motion.span
                layoutId={gid}
                className="absolute inset-0 rounded-lg bg-sd-surface shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
