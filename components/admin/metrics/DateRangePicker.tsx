"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "@/components/admin/Button";
import { CalendarIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/admin/icons";
import { addDays, ymdRange } from "@/lib/metrics/dates";
import { MAX_RANGE_DAYS, WEEK, addMonths, clamp, dayLabel, lengthOf, monthEnd, monthStart, parts, presets, rangeLabel, shiftMonth, weekday, type DayRange } from "@/lib/metrics/dashboard/calendar";

export type { DayRange };

/**
 * 지표 화면의 기간 직접 고르기 (#145).
 *
 * 기간 버튼(7일, 4주, 13주) 옆에 둔다. 매일 여는 사람은 버튼 한 번으로 끝나고,
 * "축제 5일 동안 어땠나"처럼 특정 기간이 궁금할 때만 연다(GA4, Plausible 과 같은 배치).
 *
 * - 왼쪽에 자주 쓰는 기간을 줄로 둔다. 달력을 넘기며 "지난달"을 찾게 하지 않는다
 * - 달력은 넓은 화면에서 두 달, 폰에서 한 달. 시작일을 누르고 끝날 위에 올리면 기간이 미리 칠해진다
 * - 고르는 순간 바뀌지 않고 "적용"을 눌러야 숫자를 다시 불러온다. 고르다 마음이 바뀌어도 화면이 흔들리지 않게
 * - 아래에 고른 기간, 며칠인지, 무엇과 비교하는지 적고 7일 단위가 아니면 요일 수가 달라진다고 알린다
 * - 키보드: 화살표로 하루, 위아래로 한 주, PageUp/PageDown 으로 한 달, Home/End 로 주의 처음과 끝, Enter 로 고르기, Esc 로 닫기
 * - 고를 수 있는 날은 수집을 시작한 날(min)부터 어제(max)까지. 오늘은 숫자가 아직 다 안 들어왔다
 */

type Props = {
  /** 지금 직접 고른 기간이 적용 중이면 그 값, 기간 버튼을 쓰는 중이면 null */
  value: DayRange | null;
  /** 지금 화면이 보여 주는 기간. 열 때 이 기간을 칠해 두고 시작한다 */
  current: DayRange;
  min: string;
  max: string;
  onApply: (range: DayRange) => void;
};

export function DateRangePicker({ value, current, min, max, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold transition-colors ${
          value ? "bg-sd-surface text-sd-fg shadow-sm ring-1 ring-sd-line" : "text-sd-fg-subtle hover:bg-sd-gray-200 hover:text-sd-fg-muted"
        }`}
      >
        <CalendarIcon className="h-4 w-4" />
        {value ? rangeLabel(value, max) : "직접 선택"}
      </button>
      {open && (
        <Panel
          initial={value ?? current}
          min={min}
          max={max}
          onCancel={close}
          onApply={(r) => {
            onApply(r);
            close();
          }}
        />
      )}
    </div>
  );
}

/** 열려 있는 동안만 있다. 열 때마다 새로 만들어져 지난번에 고르다 만 값이 남지 않는다 */
function Panel({
  initial,
  min,
  max,
  onCancel,
  onApply,
}: {
  initial: DayRange;
  min: string;
  max: string;
  onCancel: () => void;
  onApply: (r: DayRange) => void;
}) {
  const start = { from: clamp(initial.from, min, max), to: clamp(initial.to, min, max) };
  const [draft, setDraft] = useState<{ from: string; to: string | null }>(start);
  const [hover, setHover] = useState<string | null>(null);
  // 오른쪽(폰에서는 유일한) 달이 끝날이 든 달이 되게 연다
  const [view, setView] = useState(() => addMonths(monthStart(start.to), -1));
  const [focus, setFocus] = useState(start.to);
  const panelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const keyboard = useRef(true); // 열자마자는 키보드 사용자를 위해 초점을 달력 안에 둔다

  // 바깥을 누르면 닫는다(고르던 값은 버린다)
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node) && !(e.target as HTMLElement).closest("[aria-haspopup=dialog]")) onCancel();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onCancel]);

  // 키보드로 옮긴 날로 초점을 따라 보낸다. 마우스로 고를 때는 초점을 빼앗지 않는다
  useEffect(() => {
    if (!keyboard.current) return;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus();
  }, [focus, view]);

  const complete = draft.to !== null;
  const shown: DayRange | null = complete
    ? { from: draft.from, to: draft.to as string }
    : hover
      ? hover < draft.from
        ? { from: hover, to: draft.from }
        : { from: draft.from, to: hover }
      : { from: draft.from, to: draft.from };
  const len = complete ? lengthOf({ from: draft.from, to: draft.to as string }) : 0;
  const tooLong = len > MAX_RANGE_DAYS;
  const prevFrom = complete ? addDays(draft.from, -len) : null;
  const prevTo = complete ? addDays(draft.from, -1) : null;

  const pick = (d: string) => {
    if (d < min || d > max) return;
    setFocus(d);
    if (complete) {
      setDraft({ from: d, to: null });
      return;
    }
    setDraft(d < draft.from ? { from: d, to: draft.from } : { from: draft.from, to: d });
    setHover(null);
  };

  const moveFocus = (next: string) => {
    const d = clamp(next, min, max);
    keyboard.current = true;
    setFocus(d);
    // 보이는 두 달 밖으로 나가면 달력을 따라 넘긴다
    const right = addMonths(view, 1);
    if (d < view) setView(monthStart(d));
    else if (d > monthEnd(right)) setView(addMonths(monthStart(d), -1));
    if (!complete) setHover(d);
  };

  const onGridKey = (e: KeyboardEvent) => {
    const map: Record<string, () => string> = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      PageUp: () => shiftMonth(focus, -1),
      PageDown: () => shiftMonth(focus, 1),
      Home: () => addDays(focus, -weekday(focus)),
      End: () => addDays(focus, 6 - weekday(focus)),
    };
    if (map[e.key]) {
      e.preventDefault();
      moveFocus(map[e.key]());
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(focus);
    }
  };

  const list = presets(min, max);
  const canPrev = view > monthStart(min);
  const canNext = addMonths(view, 1) < monthStart(max);

  return (
    <>
      {/* 폰에서는 화면 가운데 떠서 뒤를 어둡게 덮는다 */}
      <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" aria-hidden onClick={onCancel} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="기간 고르기"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onCancel();
          }
        }}
        className="fixed inset-x-3 top-16 z-50 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-2xl border border-sd-line bg-sd-surface shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-none sm:w-[648px] sm:overflow-visible"
      >
        <div className="flex flex-col sm:flex-row">
          {/* 자주 쓰는 기간. 폰에서는 가로로 밀어 고른다 */}
          <ul className="flex gap-1 overflow-x-auto border-b border-sd-hairline p-2 [scrollbar-width:none] sm:w-[140px] sm:shrink-0 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r sm:p-2">
            {list.map(({ label, range }) => {
              const on = !!range && complete && range.from === draft.from && range.to === draft.to;
              return (
                <li key={label} className="shrink-0">
                  <button
                    type="button"
                    disabled={!range}
                    onClick={() => {
                      if (!range) return;
                      keyboard.current = false;
                      setDraft(range);
                      setHover(null);
                      setFocus(range.to);
                      setView(addMonths(monthStart(range.to), -1));
                    }}
                    className={`flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-[13px] transition-colors disabled:opacity-40 ${
                      on ? "bg-accent-weak font-semibold text-sd-fg" : "text-sd-fg-muted hover:bg-sd-gray-200"
                    }`}
                  >
                    {label}
                    {on && <CheckIcon className="hidden h-4 w-4 text-accent sm:block" />}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="min-w-0 flex-1 p-4">
            <div ref={gridRef} onKeyDown={onGridKey} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {[view, addMonths(view, 1)].map((month, i) => (
                <Month
                  key={month}
                  first={month}
                  // 폰에서는 한 달만. 오른쪽 달(끝날이 든 달)을 남긴다
                  className={i === 0 ? "hidden sm:block" : ""}
                  // 넓은 화면에서는 왼쪽 달에 "이전", 오른쪽 달에 "다음"만. 폰에서는 한 달에 둘 다
                  prev={
                    <NavButton label="이전 달" disabled={!canPrev} onClick={() => setView((v) => addMonths(v, -1))} className={i === 0 ? "" : "sm:invisible"}>
                      <ChevronLeftIcon className="h-4 w-4" />
                    </NavButton>
                  }
                  next={
                    <NavButton label="다음 달" disabled={!canNext} onClick={() => setView((v) => addMonths(v, 1))} className={i === 1 ? "" : "invisible"}>
                      <ChevronRightIcon className="h-4 w-4" />
                    </NavButton>
                  }
                  min={min}
                  max={max}
                  shown={shown}
                  focus={focus}
                  onPick={(d) => {
                    keyboard.current = false;
                    pick(d);
                  }}
                  onHover={(d) => !complete && setHover(d)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-sd-hairline px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-[13px]" aria-live="polite">
            {complete ? (
              <>
                <p className="font-semibold text-sd-fg">
                  {rangeLabel({ from: draft.from, to: draft.to as string }, max, true).replace("~", " ~ ")}
                  <span className="ml-1.5 font-normal text-sd-fg-muted">{len}일</span>
                </p>
                {tooLong ? (
                  <p className="mt-0.5 text-sd-critical">한 번에 1년(366일)까지 볼 수 있어요.</p>
                ) : (
                  <p className="mt-0.5 text-sd-fg-subtle">
                    이전 기간 {rangeLabel({ from: prevFrom as string, to: prevTo as string }, max)}과 비교해요.
                    {len % 7 !== 0 && " 7일 단위가 아니라 두 기간의 요일 수가 달라요."}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sd-fg-muted">
                {dayLabel(draft.from, true)}부터 시작해요. <span className="font-semibold text-sd-fg">끝나는 날</span>을 골라 주세요.
              </p>
            )}
          </div>
          <div className="flex shrink-0 justify-end gap-2">
            <Button variant="neutral" size="sm" onClick={onCancel}>
              취소
            </Button>
            <Button size="sm" disabled={!complete || tooLong} onClick={() => complete && onApply({ from: draft.from, to: draft.to as string })}>
              적용
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function NavButton({ label, disabled, onClick, className, children }: { label: string; disabled: boolean; onClick: () => void; className: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-sd-fg-muted transition-colors hover:bg-sd-gray-200 disabled:opacity-30 ${className}`}
    >
      {children}
    </button>
  );
}

function Month({
  first,
  className,
  prev,
  next,
  min,
  max,
  shown,
  focus,
  onPick,
  onHover,
}: {
  first: string;
  className: string;
  prev: ReactNode;
  next: ReactNode;
  min: string;
  max: string;
  shown: DayRange | null;
  focus: string;
  onPick: (d: string) => void;
  onHover: (d: string) => void;
}) {
  const [y, m] = parts(first);
  const days = ymdRange(first, monthEnd(first));
  const blanks = weekday(first);
  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        {prev}
        <span className="text-[14px] font-bold text-sd-fg">
          {y}년 {m}월
        </span>
        {next}
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-sd-fg-subtle" aria-hidden>
        {WEEK.map((w) => (
          <span key={w} className="py-1">
            {w}
          </span>
        ))}
      </div>
      <div role="grid" aria-label={`${y}년 ${m}월`} className="grid grid-cols-7">
        {Array.from({ length: blanks }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {days.map((d) => {
          const disabled = d < min || d > max;
          const isFrom = !!shown && d === shown.from;
          const isTo = !!shown && d === shown.to;
          const inside = !!shown && d > shown.from && d < shown.to;
          const edge = isFrom || isTo;
          const single = isFrom && isTo;
          const wd = weekday(d);
          // 기간 띠: 시작일은 오른쪽 절반, 끝날은 왼쪽 절반만. 주의 처음과 끝에서는 띠 끝을 둥글게
          const band = single
            ? ""
            : isFrom
              ? "bg-[linear-gradient(to_right,transparent_50%,var(--admin-accent-weak)_50%)]"
              : isTo
                ? "bg-[linear-gradient(to_right,var(--admin-accent-weak)_50%,transparent_50%)]"
                : inside
                  ? `bg-accent-weak ${wd === 0 || d === first ? "rounded-l-full" : ""} ${wd === 6 || d === days[days.length - 1] ? "rounded-r-full" : ""}`
                  : "";
          const [yy, mm, dd] = parts(d);
          return (
            <div key={d} className={`flex h-10 items-center justify-center ${band}`}>
              <button
                type="button"
                data-day={d}
                tabIndex={d === focus ? 0 : -1}
                disabled={disabled}
                aria-pressed={edge}
                aria-label={`${yy}년 ${mm}월 ${dd}일 ${WEEK[wd]}요일${disabled ? ", 고를 수 없어요" : ""}`}
                onClick={() => onPick(d)}
                onMouseEnter={() => !disabled && onHover(d)}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                  edge
                    ? "bg-accent font-bold text-accent-fg"
                    : disabled
                      ? "cursor-not-allowed text-sd-disabled"
                      : inside
                        ? "text-sd-fg hover:bg-sd-gray-300"
                        : "text-sd-fg hover:bg-sd-gray-200"
                }`}
              >
                {dd}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 날짜 하나 고르기. 지표 화면의 일정 넣기에서 쓴다. 기간 고르기와 같은 달력 칸(Month)을 써서
 * 모양과 키보드 동작(화살표, PageUp/PageDown, Enter, Esc)이 같다
 */
export function SingleDatePicker({ value, min, max, onChange }: { value: string; min: string; max: string; onChange: (d: string) => void }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(monthStart(value));
  const [focus, setFocus] = useState(value);
  const boxRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus();
  }, [open, focus, view]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  const move = (next: string) => {
    const d = clamp(next, min, max);
    setFocus(d);
    if (monthStart(d) !== view) setView(monthStart(d));
  };
  const onKey = (e: KeyboardEvent) => {
    const map: Record<string, () => string> = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      PageUp: () => shiftMonth(focus, -1),
      PageDown: () => shiftMonth(focus, 1),
    };
    if (map[e.key]) {
      e.preventDefault();
      move(map[e.key]());
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(focus);
      close();
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setView(monthStart(value));
          setFocus(value);
          setOpen((v) => !v);
        }}
        className="flex h-9 w-full items-center gap-2 rounded-xl border border-sd-line bg-sd-surface px-3 text-[13px] font-medium text-sd-fg transition-colors hover:border-sd-gray-400"
      >
        <CalendarIcon className="h-4 w-4 text-sd-fg-subtle" />
        {dayLabel(value, true)}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="날짜 고르기"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              close();
            }
          }}
          className="absolute left-0 top-full z-50 mt-2 w-[296px] rounded-2xl border border-sd-line bg-sd-surface p-3 shadow-xl"
        >
          <div ref={gridRef} onKeyDown={onKey}>
            <Month
              first={view}
              className=""
              prev={
                <NavButton label="이전 달" disabled={view <= monthStart(min)} onClick={() => setView((v) => addMonths(v, -1))} className="">
                  <ChevronLeftIcon className="h-4 w-4" />
                </NavButton>
              }
              next={
                <NavButton label="다음 달" disabled={view >= monthStart(max)} onClick={() => setView((v) => addMonths(v, 1))} className="">
                  <ChevronRightIcon className="h-4 w-4" />
                </NavButton>
              }
              min={min}
              max={max}
              shown={{ from: value, to: value }}
              focus={focus}
              onPick={(d) => {
                onChange(d);
                close();
              }}
              onHover={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
}
