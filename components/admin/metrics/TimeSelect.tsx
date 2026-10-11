"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckIcon, ChevronDownIcon } from "@/components/admin/icons";

/**
 * 시간 고르기 (#165). 행사 시작과 끝 시간에 쓴다.
 *
 * 브라우저 기본 시간 입력은 OS 마다 모양이 다르고(윈도우는 작은 스핀 버튼), 분 단위를 하나씩 올려야 해서 느리다.
 * 행사 시간은 대개 정각이나 30분이라 30분 간격 목록에서 고르게 했다(구글 캘린더와 같은 방식).
 * 끝 시간 목록은 시작 뒤만 보여 주고 "16:00 (2시간)"처럼 길이를 같이 적어, 끝을 시작보다 앞에 두는 실수를 막는다.
 *
 * 키보드: 열면 고른 시간에 초점, 위아래 화살표로 옮기고 Enter 로 고른다. Esc 나 바깥을 누르면 닫는다
 */

const FIRST = 6 * 60;
const LAST = 23 * 60 + 30;
const STEP = 30;

const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const minutesOf = (v: string) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3, 5));
const lengthOf = (m: number) => {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h && r ? `${h}시간 ${r}분` : h ? `${h}시간` : `${r}분`;
};

export function TimeSelect({
  value,
  onChange,
  label,
  placeholder,
  after,
}: {
  /** "14:00" 또는 "" */
  value: string;
  onChange: (v: string) => void;
  /** 화면 읽기용 이름(예: 행사 시작 시간) */
  label: string;
  placeholder: string;
  /** 끝 시간이면 시작 시간. 그 뒤만 보여 주고 길이를 같이 적는다 */
  after?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  const start = after ? minutesOf(after) : null;
  const slots: number[] = [];
  for (let m = FIRST; m <= LAST; m += STEP) if (start === null || m > start) slots.push(m);
  // 30분 간격이 아닌 값(예전에 넣은 13:15)도 목록에 보이게 끼워 넣는다
  if (value && !slots.includes(minutesOf(value)) && (start === null || minutesOf(value) > start)) {
    slots.push(minutesOf(value));
    slots.sort((a, b) => a - b);
  }

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // 열린 목록에서 고른 시간이 보이게 스크롤하고 초점을 둔다. scrollIntoView 는 일부 Chrome 에서 Promise 를 돌려줘
  // 효과 정리 함수로 오인되는 일이 있어(지표 챗봇에서 겪음) 스크롤 값을 직접 맞춘다
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const el = list?.querySelector<HTMLLIElement>(`[data-i="${active}"]`);
    if (list && el) {
      if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop;
      else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight;
    }
  }, [open, active]);

  const show = () => {
    const i = value ? slots.indexOf(minutesOf(value)) : -1;
    // 처음 열 때 고른 값이 없으면 시작 시간 바로 뒤나 정오 근처에서 시작한다
    setActive(i >= 0 ? i : Math.max(0, start !== null ? 0 : slots.indexOf(12 * 60)));
    setOpen(true);
    requestAnimationFrame(() => listRef.current?.focus());
  };
  const pick = (m: number | null) => {
    onChange(m === null ? "" : hm(m));
    setOpen(false);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(slots.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (slots[active] !== undefined) pick(slots[active]);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}${value ? ` ${value}` : ", 고르지 않음"}`}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            show();
          }
        }}
        className={`flex h-9 w-full items-center justify-between gap-2 rounded-xl border bg-sd-surface px-3 text-[13px] tabular-nums outline-none transition-colors hover:bg-sd-pressed focus-visible:border-accent ${
          open ? "border-accent" : "border-sd-line"
        } ${value ? "text-sd-fg" : "text-sd-placeholder"}`}
      >
        {value || placeholder}
        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-sd-fg-subtle transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 min-w-[150px] overflow-hidden rounded-xl border border-sd-line bg-sd-surface p-1 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)]"
          >
            <ul
              ref={listRef}
              id={id}
              role="listbox"
              aria-label={label}
              tabIndex={-1}
              aria-activedescendant={`${id}-${active}`}
              onKeyDown={onKey}
              className="max-h-56 overflow-y-auto outline-none"
            >
              {slots.map((m, i) => {
                const selected = value === hm(m);
                return (
                  <li
                    key={m}
                    id={`${id}-${i}`}
                    data-i={i}
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(m)}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[13px] tabular-nums ${
                      i === active ? "bg-sd-pressed" : ""
                    } ${selected ? "font-semibold text-sd-fg" : "text-sd-fg-muted"}`}
                  >
                    <span>
                      {hm(m)}
                      {start !== null && <span className="ml-1.5 text-[12px] font-normal text-sd-fg-subtle">({lengthOf(m - start)})</span>}
                    </span>
                    {selected && <CheckIcon className="h-3.5 w-3.5 text-accent" />}
                  </li>
                );
              })}
            </ul>
            {value && (
              <button
                type="button"
                onClick={() => pick(null)}
                className="mt-1 w-full rounded-lg border-t border-sd-hairline px-2.5 py-1.5 text-left text-[12px] text-sd-fg-subtle hover:bg-sd-pressed"
              >
                시간 지우기
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
