"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { HistoryIcon } from "@/components/admin/icons";
import {
  forgetRecent,
  formatAgo,
  groupOf,
  readRecent,
  recentHref,
  recordRecent,
  type RecentGroup,
  type RecentItem,
  type RecentKind,
} from "@/lib/admin/recentViewed";

/**
 * 상세 화면이 열렸을 때 기록한다. found 가 null 이면 더는 열 수 없는 항목이라 기록에서 뺀다.
 * 30초마다 새로 읽어도 이름이 그대로면 다시 쓰지 않는다.
 */
export function useRecordRecent(
  kind: RecentKind,
  id: string,
  found: { title: string; detail: string } | null
) {
  const title = found?.title;
  const detail = found?.detail;
  useEffect(() => {
    if (title === undefined || detail === undefined) forgetRecent(kind, id);
    else recordRecent({ kind, id, title, detail });
  }, [kind, id, title, detail]);
}

const MENU_LIMIT = 10;

const COPY: Record<RecentGroup, { label: string; empty: string }> = {
  game: { label: "최근 본 게임", empty: "아직 본 게임이 없어요" },
  user: { label: "최근 본 유저", empty: "아직 본 유저가 없어요" },
};

// 목록 필터 줄 끝의 시계 버튼. 찾을 때만 펼치고, 평소엔 버튼 하나로 자리만 지킨다(docs/admin-ui.md)
export function RecentMenu({ group }: { group: RecentGroup }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<RecentItem[]>([]);
  const [now, setNow] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { label, empty } = COPY[group];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    // 다른 탭에서 본 것까지 담기게 펼칠 때 읽는다
    if (!open) {
      setItems(readRecent().filter((r) => groupOf(r.kind) === group).slice(0, MENU_LIMIT));
      setNow(Date.now());
    }
    setOpen(!open);
  };

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-expanded={open}
        title={label}
        className={`flex h-10 w-10 items-center justify-center rounded-xl border border-sd-line bg-sd-surface outline-none transition hover:bg-sd-pressed focus-visible:ring-2 focus-visible:ring-accent active:bg-sd-selected ${
          open ? "text-accent" : "text-sd-fg-subtle"
        }`}
      >
        <HistoryIcon className="h-[18px] w-[18px]" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+6px)] z-30 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-sd-line bg-sd-surface p-1 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)]"
          >
            <p className="px-3 pb-1 pt-2 text-[12px] font-medium text-sd-fg-subtle">{label}</p>
            {items.length === 0 ? (
              <p className="px-3 pb-3 pt-1 text-[13px] text-sd-fg-subtle">{empty}</p>
            ) : (
              <ul className="max-h-80 overflow-y-auto">
                {items.map((r) => (
                  <li key={`${r.kind}-${r.id}`}>
                    <Link
                      href={recentHref(r)}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 outline-none transition hover:bg-sd-pressed focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                    >
                      <span className="min-w-0">
                        <span
                          className={`block truncate text-[14px] font-semibold text-sd-fg ${r.kind === "game" ? "font-mono" : ""}`}
                        >
                          {r.title}
                        </span>
                        <span className="block truncate text-[12px] text-sd-fg-subtle">{r.detail}</span>
                      </span>
                      <span className="shrink-0 text-[12px] tabular-nums text-sd-fg-subtle">
                        {formatAgo(r.at, now)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
