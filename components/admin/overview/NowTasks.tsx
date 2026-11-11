"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState, type ComponentType } from "react";
import { BugIcon, CheckIcon, ChevronDownIcon, ChevronRightIcon, ClipboardCheckIcon, ImageIcon, ReportIcon, RocketIcon, StarIcon, StoreIcon, TicketIcon } from "@/components/admin/icons";
import type { CardKey } from "@/lib/admin/overview/cards";
import type { Task, TaskTone } from "@/lib/admin/overview/tasks";

// 개요의 지금 할 일 (docs/admin-ui.md "지금 할 일"). 내 역할 일을 위에, 다른 일은 접어서 보여 준다.

const ICON: Partial<Record<CardKey, ComponentType<{ className?: string }>>> = { rep: ReportIcon, bug: BugIcon, rv: StarIcon, rel: RocketIcon, chk: ClipboardCheckIcon, ev: TicketIcon, frame: ImageIcon, draft: StoreIcon };
const TONE: Record<TaskTone, { box: string; label: string; badge: string }> = {
  urgent: { box: "bg-sd-critical-weak text-sd-critical", label: "급해요", badge: "bg-sd-critical-weak text-sd-critical" },
  soon: { box: "bg-sd-warning-weak text-sd-warning", label: "챙겨요", badge: "bg-sd-warning-weak text-sd-warning" },
  info: { box: "bg-sd-info-weak text-sd-info", label: "참고", badge: "bg-sd-info-weak text-sd-info" },
};

function Row({ t, dim = false }: { t: Task; dim?: boolean }) {
  const Icon = ICON[t.card] ?? CheckIcon;
  const tone = TONE[t.tone];
  return (
    <li>
      <Link href={t.href} className={`group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-sd-pressed focus-visible:bg-sd-pressed focus-visible:outline-none sm:px-5 ${dim ? "opacity-80" : ""}`}>
        <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-xl ${tone.box}`}>
          <Icon className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <b className="text-[14.5px] font-semibold text-sd-fg">{t.title}</b>
            <span className={`rounded-md px-1.5 py-px text-[11px] font-bold ${tone.badge}`}>{tone.label}</span>
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] text-sd-fg-subtle">{t.detail}</span>
        </span>
        <ChevronRightIcon className="size-4 shrink-0 text-sd-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
      </Link>
    </li>
  );
}

export function NowTasks({ mine, others, loading, hasRoles }: { mine: Task[]; others: Task[]; loading: boolean; hasRoles: boolean }) {
  const [open, setOpen] = useState(false);
  const total = mine.length + others.length;
  return (
    <section aria-labelledby="now-tasks" className="mt-7">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id="now-tasks" className="flex items-center gap-2 text-[17px] font-bold tracking-tight text-sd-fg">
            지금 할 일
            {total > 0 && <span className="min-w-5 rounded-full bg-sd-critical px-1.5 text-center text-[12px] font-bold leading-5 text-white tabular-nums">{total}</span>}
          </h2>
          <p className="mt-0.5 text-[13px] text-sd-fg-subtle">{hasRoles ? "내 역할 일을 먼저 보여 드려요. 처리하면 저절로 사라져요." : "처리를 기다리는 일이에요. 처리하면 저절로 사라져요."}</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-sd-line bg-sd-surface">
        {mine.length ? (
          <ul className="divide-y divide-sd-hairline">
            {mine.map((t) => (
              <Row key={t.id} t={t} />
            ))}
          </ul>
        ) : loading ? (
          <div aria-busy className="flex items-center gap-3.5 px-5 py-3.5">
            <span className="size-9 animate-pulse rounded-xl bg-sd-fill" />
            <span className="h-4 w-48 animate-pulse rounded bg-sd-fill" />
          </div>
        ) : (
          <p className="flex items-center gap-3 px-5 py-4 text-[14px] font-medium text-sd-fg">
            <span aria-hidden className="grid size-9 place-items-center rounded-xl bg-sd-positive-weak text-sd-positive">
              <CheckIcon className="size-[18px] [stroke-width:2.6]" />
            </span>
            {others.length ? "내 역할에서 지금 처리할 일은 없어요." : "지금 처리할 일이 없어요."}
          </p>
        )}
        {others.length > 0 && (
          <>
            <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 border-t border-sd-hairline px-4 py-2.5 text-left text-[13px] font-semibold text-sd-fg-muted transition-colors hover:bg-sd-pressed sm:px-5">
              다른 역할의 일 {others.length}개
              <ChevronDownIcon className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.ul initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.18, ease: "easeOut" }} className="divide-y divide-sd-hairline overflow-hidden border-t border-sd-hairline bg-sd-fill/40">
                  {others.map((t) => (
                    <Row key={t.id} t={t} dim />
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </section>
  );
}
