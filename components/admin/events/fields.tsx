"use client";

import type { ReactNode } from "react";
import { SingleDatePicker } from "@/components/admin/metrics/DateRangePicker";
import { TimeSelect } from "@/components/admin/metrics/TimeSelect";
import { addDays } from "@/lib/metrics/dates";
import { WHERE, type EventSettings, type KstTime } from "@/lib/event/settings";

// 행사 화면의 칸 (#219). 칸마다 "바뀌는 곳"을 이름 옆에 적고, 초점이 가면 미리보기가 그 자리를 짚는다(onSpot).

export type Key = keyof EventSettings;

export function Field({
  k,
  label,
  spot,
  onSpot,
  error,
  hint,
  right,
  children,
}: {
  k: Key;
  label?: string;
  spot: Key | null;
  onSpot: (k: Key) => void;
  error?: string;
  hint?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  const on = spot === k;
  return (
    <div id={`field-${k}`} onFocusCapture={() => onSpot(k)} onMouseEnter={() => onSpot(k)} className="scroll-mt-24">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <label htmlFor={`input-${k}`} className="text-[13px] font-semibold text-sd-fg-subtle">
          {label ?? WHERE[k].label}
        </label>
        {right ?? <Where k={k} on={on} />}
      </div>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-[13px] leading-relaxed text-sd-critical">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] leading-relaxed text-sd-fg-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

/** "바뀌는 곳 · 부스 준비 중 화면, 홈 팝업". 미리보기가 이 칸을 짚는 동안 파랗게 */
export function Where({ k, on }: { k: Key; on: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] transition-colors ${on ? "text-accent" : "text-sd-fg-subtle"}`}>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${on ? "bg-accent" : "bg-sd-gray-400"}`} />
      <span className="sr-only">바뀌는 곳: </span>
      {WHERE[k].places.join(" · ")}
    </span>
  );
}

export function TextInput({ k, value, max, onChange, placeholder, disabled, invalid }: { k: Key; value: string; max: number; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; invalid?: boolean }) {
  return (
    <div className={`flex items-center rounded-xl border bg-sd-surface transition focus-within:border-accent ${invalid ? "border-sd-critical" : "border-sd-line"} ${disabled ? "opacity-50" : ""}`}>
      <input
        id={`input-${k}`}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={max}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-[14px] text-sd-fg outline-none placeholder:text-sd-placeholder"
      />
      <span className={`pr-3.5 text-[12px] tabular-nums ${value.length >= max ? "text-sd-warning" : "text-sd-fg-subtle"}`}>
        {value.length}/{max}
      </span>
    </div>
  );
}

/** 날짜 달력 + 30분 간격 시각. 행사 날 앞뒤 60일 안에서 */
export function DateTimeInput({ value, onChange, around, label, disabled }: { value: KstTime; onChange: (v: KstTime) => void; around: string; label: string; disabled?: boolean }) {
  const date = value.slice(0, 10);
  const time = value.slice(11, 16);
  return (
    <div className={`flex flex-wrap items-start gap-2 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
      <SingleDatePicker value={date} min={addDays(around, -60)} max={addDays(around, 60)} onChange={(d) => onChange(`${d}T${time}`)} />
      <TimeSelect value={time} onChange={(t) => onChange(`${date}T${t}`)} label={label} placeholder="시각" allDay />
    </div>
  );
}
