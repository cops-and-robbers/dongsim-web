"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/admin/icons";
import { Month, NavButton } from "@/components/admin/metrics/DateRangePicker";
import {
  addMonths,
  compareRange,
  lastCompareStart,
  lengthOf,
  monthStart,
  rangeLabel,
  type CompareMode,
  type DayRange,
} from "@/lib/metrics/dashboard/calendar";
import { addDays } from "@/lib/metrics/dates";

/**
 * 비교 고르기 (#152). 기간 버튼 옆, 예전 "이전 기간 겹치기" 자리.
 *
 * 마케터가 가장 자주 하는 질문이 "행사(광고) 주간이 평소보다 어땠나"라서, 바로 앞 기간 말고 떨어진
 * 기간과도 비교할 수 있게 했다. 고를 것은 넷이다.
 * - 이전 기간(기본)
 * - 요일 맞춘 이전 기간: 지금 기간이 7일 단위면 이전 기간과 같아 목록에서 뺀다(같은 것을 두 번 보여 주지 않게)
 * - 직접 고르기: 시작일만 누른다. 길이는 지금 기간과 같게 자동으로 칠해 미리 보여 준다(길이가 다르면
 *   합계 비교가 불공평하고 차트를 날짜별로 겹칠 수 없다). 지금 기간과 겹치는 날은 고를 수 없다
 * - 끄기
 * 작년 같은 기간은 데이터가 2026-04 부터라 내년까지 비어 있어 넣지 않았다.
 * 항목마다 실제 날짜를 같이 적어, 고르기 전에 무엇과 비교하게 되는지 보인다.
 */
export function CompareMenu({
  range,
  mode,
  min,
  onChange,
}: {
  range: DayRange;
  mode: CompareMode;
  min: string;
  onChange: (m: CompareMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const len = lengthOf(range);
  const maxStart = lastCompareStart(range);
  const prev = compareRange(range, { kind: "prev" });
  const dow = compareRange(range, { kind: "dow" });
  const custom = mode.kind === "custom" ? compareRange(range, mode) : null;
  const [view, setView] = useState(monthStart(custom?.from ?? addDays(maxStart, -len)));
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  });

  function close() {
    setOpen(false);
    setPicking(false);
    setHover(null);
    triggerRef.current?.focus();
  }
  const choose = (m: CompareMode) => {
    onChange(m);
    close();
  };

  const label =
    mode.kind === "off" ? "비교 안 함" : mode.kind === "custom" && custom ? rangeLabel(custom, range.to) : mode.kind === "dow" ? "요일 맞춘 이전 기간" : "이전 기간";
  const preview: DayRange | null = hover ? { from: hover, to: addDays(hover, len - 1) } : custom;

  return (
    <div ref={boxRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className={`flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold transition-colors ${
          mode.kind === "off" ? "text-sd-fg-subtle hover:bg-sd-gray-200 hover:text-sd-fg-muted" : "bg-sd-gray-200 text-sd-fg"
        }`}
      >
        <span className={`h-0.5 w-3.5 rounded-full ${mode.kind === "off" ? "bg-sd-gray-400" : "bg-chart-prev"}`} aria-hidden />
        <span className="text-sd-fg-muted">비교</span>
        {label}
        <ChevronDownIcon className="h-3.5 w-3.5 text-sd-fg-subtle" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" aria-hidden onClick={close} />
          <div
            role="dialog"
            aria-label="비교 기간 고르기"
            className="fixed inset-x-3 top-16 z-50 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-2xl border border-sd-line bg-sd-surface p-2 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[320px] sm:max-h-none sm:overflow-visible"
          >
            <ul className="flex flex-col">
              <Option selected={mode.kind === "prev"} title="이전 기간" sub={`${rangeLabel(prev, range.to)}, 바로 앞 ${len}일`} onClick={() => choose({ kind: "prev" })} />
              {/* 7일 단위면 이전 기간과 같아서 보여 주지 않는다 */}
              {len % 7 !== 0 && (
                <Option
                  selected={mode.kind === "dow"}
                  title="요일 맞춘 이전 기간"
                  sub={`${rangeLabel(dow, range.to)}, 같은 요일부터`}
                  onClick={() => choose({ kind: "dow" })}
                />
              )}
              <Option
                selected={mode.kind === "custom"}
                title="직접 고르기"
                sub={custom ? rangeLabel(custom, range.to) : `시작일만 고르면 ${len}일로 잡혀요`}
                onClick={() => setPicking((v) => !v)}
                trailing={<ChevronDownIcon className={`h-4 w-4 text-sd-fg-subtle transition-transform ${picking ? "rotate-180" : ""}`} />}
              />
              {picking && (
                <li className="px-2 pb-2 pt-1">
                  {maxStart < min ? (
                    <p className="rounded-lg bg-sd-fill px-3 py-3 text-[12px] text-sd-fg-muted">지금 기간이 길어서 그 앞에 같은 길이의 기간이 없어요.</p>
                  ) : (
                    <>
                      <Month
                        first={view}
                        className=""
                        prev={
                          <NavButton label="이전 달" disabled={view <= monthStart(min)} onClick={() => setView((v) => addMonths(v, -1))} className="">
                            <ChevronLeftIcon className="h-4 w-4" />
                          </NavButton>
                        }
                        next={
                          <NavButton label="다음 달" disabled={view >= monthStart(maxStart)} onClick={() => setView((v) => addMonths(v, 1))} className="">
                            <ChevronRightIcon className="h-4 w-4" />
                          </NavButton>
                        }
                        min={min}
                        max={maxStart}
                        shown={preview}
                        focus={preview?.from ?? maxStart}
                        onPick={(d) => choose({ kind: "custom", from: d })}
                        onHover={setHover}
                      />
                      <p className="mt-2 text-[12px] leading-relaxed text-sd-fg-subtle">
                        시작일을 누르면 지금 기간과 같은 {len}일이 칠해져요. 지금 기간과 겹치는 날은 고를 수 없어요.
                      </p>
                    </>
                  )}
                </li>
              )}
              <li className="my-1 border-t border-sd-hairline" aria-hidden />
              <Option selected={mode.kind === "off"} title="비교 안 함" sub="증감과 회색 선을 숨겨요" onClick={() => choose({ kind: "off" })} />
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function Option({ selected, title, sub, onClick, trailing }: { selected: boolean; title: string; sub: string; onClick: () => void; trailing?: ReactNode }) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onClick}
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sd-gray-200 ${selected ? "bg-accent-weak" : ""}`}
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-accent">{selected && <CheckIcon className="h-4 w-4" />}</span>
        <span className="min-w-0 flex-1">
          <span className={`block text-[13px] ${selected ? "font-bold text-sd-fg" : "font-medium text-sd-fg"}`}>{title}</span>
          <span className="block truncate text-[12px] text-sd-fg-subtle tabular-nums">{sub}</span>
        </span>
        {trailing}
      </button>
    </li>
  );
}
