"use client";

import type { ReactNode } from "react";
import { Select } from "@/components/admin/Parts";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { LOCALES, todayKst, type Precision, type RecordLocale, type Translated } from "@/lib/company/model";

// 동심지키미 소개 입력 칸 (#250). 날짜는 고르게만 해서 오타를 막는다(NN/g: 규칙이 분명한 입력은 고를 수 있는 값으로 제한).

export const INPUT = "h-10 w-full rounded-lg border bg-sd-surface px-3 text-[14px] text-sd-fg outline-none transition-colors placeholder:text-sd-placeholder focus:border-accent disabled:cursor-not-allowed disabled:opacity-60";
export const inputBorder = (invalid?: boolean) => (invalid ? "border-sd-critical" : "border-sd-line");

export const LOCALE_NAME: Record<RecordLocale, string> = { ko: "한국어", en: "English", ja: "日本語" };
export const LOCALE_KOREAN: Record<RecordLocale, string> = { ko: "한국어", en: "영어", ja: "일본어" };

export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor?: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold text-sd-fg-subtle">
        {label}
      </label>
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

export function Chips<T extends string>({ label, options, value, disabled, onChange }: { label: string; options: { value: T; label: string }[]; value: T; disabled?: boolean; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={`h-8 rounded-lg px-3 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            value === o.value ? "bg-accent text-accent-fg" : "bg-sd-gray-200 text-sd-fg-muted hover:bg-sd-gray-300"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ label, hint, on, disabled, onChange }: { label: string; hint?: string; on: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[14px] font-semibold text-sd-fg">{label}</p>
        {hint && <p className="mt-0.5 text-[12px] leading-relaxed text-sd-fg-subtle">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${on ? "bg-accent" : "bg-sd-gray-300"}`}
      >
        <span aria-hidden className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

/** 세 언어를 한 칸씩. 한국어만 필수이고, 글자 수는 한도에 가까워지면 보여 준다 */
export function LocaleFields({
  id,
  label,
  value,
  max,
  errors,
  hint,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: Translated;
  max: Record<RecordLocale, number>;
  errors: Partial<Record<RecordLocale, string>>;
  hint?: ReactNode;
  disabled?: boolean;
  onChange: (next: Translated) => void;
}) {
  const firstError = LOCALES.map((l) => errors[l]).find(Boolean);
  return (
    <Field label={label} error={firstError} hint={hint}>
      <div className="space-y-2">
        {LOCALES.map((locale) => {
          const length = Array.from(value[locale]).length;
          const near = length >= max[locale] * 0.8;
          return (
            <div key={locale} className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-2">
              <label htmlFor={`${id}-${locale}`} className="text-[12px] font-semibold text-sd-fg-subtle">
                {LOCALE_NAME[locale]}
              </label>
              <div className="relative">
                <input
                  id={`${id}-${locale}`}
                  lang={locale}
                  value={value[locale]}
                  disabled={disabled}
                  aria-invalid={Boolean(errors[locale])}
                  onChange={(e) => onChange({ ...value, [locale]: e.target.value })}
                  className={`${INPUT} ${inputBorder(Boolean(errors[locale]))} ${near ? "pr-14" : ""}`}
                />
                {near && (
                  <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] tabular-nums ${length > max[locale] ? "text-sd-critical" : "text-sd-fg-subtle"}`}>
                    {length}/{max[locale]}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Field>
  );
}

const FIRST_YEAR = 2024;
const pad = (n: number) => String(n).padStart(2, "0");

/** 일까지 또는 월까지. 값은 늘 있는 날짜만 만들어진다 */
export function DateField({
  occurredOn,
  precision,
  error,
  disabled,
  onChange,
}: {
  occurredOn: string;
  precision: Precision;
  error?: string;
  disabled?: boolean;
  onChange: (next: { occurredOn: string; precision: Precision }) => void;
}) {
  const [year, month, day] = occurredOn.split("-").map(Number);
  const thisYear = Number(todayKst().slice(0, 4));
  const years = Array.from({ length: Math.max(thisYear, year) - FIRST_YEAR + 1 }, (_, i) => Math.max(thisYear, year) - i);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const set = (y: number, m: number, d: number, p: Precision) => {
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    onChange({ occurredOn: `${y}-${pad(m)}-${pad(p === "month" ? 1 : Math.min(d, last))}`, precision: p });
  };

  return (
    <Field label="날짜" error={error}>
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          options={[
            { value: "day" as const, label: "일까지" },
            { value: "month" as const, label: "월까지" },
          ]}
          value={precision}
          onChange={(p) => !disabled && set(year, month, day, p)}
        />
        <Select aria-label="연도" value={year} disabled={disabled} onChange={(e) => set(Number(e.target.value), month, day, precision)} className="w-[98px]">
          {years.map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </Select>
        <Select aria-label="월" value={month} disabled={disabled} onChange={(e) => set(year, Number(e.target.value), day, precision)} className="w-[82px]">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {m}월
            </option>
          ))}
        </Select>
        {precision === "day" && (
          <Select aria-label="일" value={day} disabled={disabled} onChange={(e) => set(year, month, Number(e.target.value), precision)} className="w-[82px]">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}일
              </option>
            ))}
          </Select>
        )}
      </div>
    </Field>
  );
}
