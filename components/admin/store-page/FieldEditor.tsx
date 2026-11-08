"use client";

import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDownIcon, ExternalLinkIcon } from "@/components/admin/icons";
import { fitLabel, PREVIEW_FONT, SLOTS, type Slot } from "@/lib/store-page/display";
import { checkField, countOf, keywordStates, WHEN_LABEL, type Draft, type Field, type Issue, type KeywordState, type Platform, type Side, type Values } from "@/lib/store-page/fields";

// 스토어 페이지의 칸 하나 (docs/admin-ui.md "스토어 페이지").
// 콘솔에는 없는 것: 언제 나가는지, 글자 수 막대, 쓰는 중에 알려 주는 점검, 지금 스토어 문구와 비교.

export function OfficialLink({ href, label = "공식 안내" }: { href: string; label?: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex flex-none items-center gap-0.5 text-[12px] font-medium text-sd-fg-subtle underline-offset-2 transition hover:text-sd-fg hover:underline">
      {label}
      <ExternalLinkIcon className="size-3" />
    </a>
  );
}

function Meter({ n, max }: { n: number; max: number }) {
  const over = n > max;
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-1 flex-1 overflow-hidden rounded-full bg-sd-gray-300">
        <motion.span className={`block h-full rounded-full ${over ? "bg-sd-critical" : "bg-accent"}`} initial={false} animate={{ width: `${Math.min((n / max) * 100, 100)}%` }} transition={{ type: "spring", stiffness: 300, damping: 34 }} />
      </span>
      <span className={`flex-none text-[12px] tabular-nums ${over ? "font-semibold text-sd-critical" : "text-sd-fg-subtle"}`}>
        {n.toLocaleString()} / {max.toLocaleString()}
      </span>
    </div>
  );
}

const CHIP: Record<KeywordState["state"], string> = {
  ok: "bg-sd-fill text-sd-fg-muted",
  repeat: "bg-sd-critical-weak text-sd-critical",
  inName: "text-sd-fg-subtle line-through ring-1 ring-inset ring-sd-line",
  waste: "text-sd-fg-subtle line-through ring-1 ring-inset ring-sd-line",
};

function KeywordChips({ value, ctx }: { value: string; ctx: Values }) {
  const states = keywordStates(value, ctx.name ?? "", ctx.subtitle ?? "");
  if (states.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1">
      {states.map((k, i) => (
        <li key={`${k.word}-${i}`} className={`rounded-md px-1.5 py-0.5 text-[12px] ${CHIP[k.state]}`}>
          {k.word}
        </li>
      ))}
    </ul>
  );
}

function IssueLine({ issue }: { issue: Issue }) {
  const dot = issue.level === "block" ? "bg-sd-critical" : issue.level === "warn" ? "bg-sd-warning" : "bg-sd-gray-400";
  return (
    <li className="flex items-start gap-2 text-[12.5px] leading-relaxed">
      <span aria-hidden className={`mt-[7px] size-1.5 flex-none rounded-full ${dot}`} />
      <span className={`min-w-0 flex-1 ${issue.level === "block" ? "font-medium text-sd-critical" : issue.level === "warn" ? "text-sd-fg" : "text-sd-fg-muted"}`}>{issue.text}</span>
      {issue.link && <OfficialLink href={issue.link} label="왜요?" />}
    </li>
  );
}

/** 이 글이 실제 자리에서 몇 줄인지 재서 알려 준다. 숨겨 둔 같은 크기의 칸에 넣어 잰다 */
function FitChip({ slot, value }: { slot: Slot; value: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState(0);
  useLayoutEffect(() => {
    if (ref.current) setLines(Math.max(1, Math.round(ref.current.getBoundingClientRect().height / slot.lineHeight)));
  }, [value, slot]);
  const fit = fitLabel(slot, lines);
  return (
    <>
      <div ref={ref} aria-hidden className="pointer-events-none invisible absolute left-0 top-0" style={{ width: slot.width, fontFamily: PREVIEW_FONT, fontSize: slot.fontSize, lineHeight: `${slot.lineHeight}px`, fontWeight: slot.fontWeight, wordBreak: "keep-all", overflowWrap: "break-word", whiteSpace: slot.preLine ? "pre-line" : "normal" }}>
        {value || " "}
      </div>
      <span className={`inline-flex h-[20px] items-center rounded-md px-1.5 text-[11.5px] font-medium tabular-nums ${fit.cut ? "bg-sd-fill font-semibold text-sd-fg" : "bg-sd-fill text-sd-fg-subtle"}`}>
        {fit.text}
      </span>
    </>
  );
}

/** 지금 스토어 문구. 짧으면 바로 보이고, 길면 눌러서 본다 */
function Compare({ text, label, onRevert, disabled, long }: { text: string; label: string; onRevert?: () => void; disabled?: boolean; long: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2.5 rounded-[10px] bg-sd-fill px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        {long ? (
          <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-sd-fg-muted transition hover:text-sd-fg">
            {label}
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", stiffness: 420, damping: 34 }} className="inline-flex">
              <ChevronDownIcon className="size-3.5" />
            </motion.span>
          </button>
        ) : (
          <p className="text-[12px] font-semibold text-sd-fg-muted">{label}</p>
        )}
        {onRevert && (
          <button type="button" disabled={disabled} onClick={onRevert} className="flex-none text-[12px] font-semibold text-accent transition hover:underline disabled:opacity-50">
            되돌리기
          </button>
        )}
      </div>
      {!long && <p className="mt-0.5 whitespace-pre-line break-words text-[13px] leading-relaxed text-sd-fg-muted">{text || "비어 있어요"}</p>}
      <AnimatePresence initial={false}>
        {long && open && (
          <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 36 }} className="overflow-hidden whitespace-pre-line break-words text-[13px] leading-relaxed text-sd-fg-muted">
            <span className="block pt-1.5">{text || "비어 있어요"}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FieldEditor({
  platform,
  field,
  value,
  side,
  base,
  ctx,
  draft,
  conflict,
  disabled,
  onChange,
  onRevert,
  onFocus,
  onTakeTheirs,
  onKeepMine,
}: {
  platform: Platform;
  field: Field;
  value: string;
  side: Side | undefined;
  base: string;
  ctx: Values;
  draft: Draft | undefined;
  conflict: Draft | null | undefined;
  disabled: boolean;
  onChange: (v: string) => void;
  onRevert: () => void;
  onFocus: () => void;
  onTakeTheirs: () => void;
  onKeepMine: () => void;
}) {
  const id = `store-${field.id}`;
  const issues = checkField(platform, field, value, ctx);
  const n = countOf(value);
  const live = side?.live[field.id] ?? "";
  const changed = value !== base;
  const waiting = !changed && base !== live;
  const long = field.max > 200;
  const box = `rounded-xl border bg-sd-surface transition focus-within:border-accent ${n > field.max ? "border-sd-critical" : "border-sd-line"}`;
  const input = "block w-full bg-transparent px-3.5 py-2.5 text-[14px] leading-relaxed text-sd-fg outline-none placeholder:text-sd-placeholder disabled:opacity-60";
  return (
    <div className="px-5 py-5" onFocusCapture={onFocus} onMouseEnter={onFocus}>
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <label htmlFor={id} className="text-[14px] font-bold text-sd-fg">
          {field.label}
        </label>
        <span className={`inline-flex h-[20px] items-center rounded-md px-1.5 text-[11.5px] font-semibold ${field.when === "now" ? "bg-accent-weak text-accent" : "bg-sd-fill text-sd-fg-subtle"}`}>{WHEN_LABEL[field.when]}</span>
        {draft && (
          <span className="text-[12px] text-sd-fg-subtle">
            {draft.updatedBy}님이 고쳤어요
          </span>
        )}
        <span className="ml-auto">
          <OfficialLink href={field.link} />
        </span>
      </div>
      <p className="mb-2 text-[12.5px] leading-relaxed text-sd-fg-muted">{field.tip}</p>
      <div className={box}>
        {field.multiline ? (
          <textarea id={id} value={value} disabled={disabled} rows={long ? 6 : 2} onChange={(e) => onChange(e.target.value)} className={`${input} resize-none [field-sizing:content] ${long ? "max-h-[420px] min-h-[140px] overflow-y-auto" : ""}`} />
        ) : (
          <input id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={input} />
        )}
      </div>
      {!field.url && (
        <div className="mt-2">
          <Meter n={n} max={field.max} />
        </div>
      )}
      {value.trim() && SLOTS[platform][field.id] && (
        <div className="relative mt-2 flex flex-wrap gap-1 overflow-hidden">
          {SLOTS[platform][field.id]!.map((s) => (
            <FitChip key={s.surface} slot={s} value={value} />
          ))}
        </div>
      )}
      {field.id === "keywords" && <KeywordChips value={value} ctx={ctx} />}
      {issues.length > 0 && <ul className="mt-2 space-y-1">{issues.map((i) => <IssueLine key={i.text} issue={i} />)}</ul>}
      {conflict !== undefined && (
        <div role="alert" className="mt-2.5 rounded-[10px] bg-sd-critical-weak px-3 py-2.5">
          <p className="text-[13px] font-semibold text-sd-fg">{conflict ? `${conflict.updatedBy}님이 방금 이 칸을 고쳤어요` : "다른 분이 방금 이 칸의 초안을 지웠어요"}</p>
          {conflict && <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-[13px] leading-relaxed text-sd-fg-muted">{conflict.value}</p>}
          <div className="mt-2 flex gap-3">
            <button type="button" onClick={onTakeTheirs} className="text-[12.5px] font-semibold text-accent hover:underline">
              그 문구로 바꾸기
            </button>
            <button type="button" onClick={onKeepMine} className="text-[12.5px] font-semibold text-sd-fg-muted hover:text-sd-fg hover:underline">
              내 문구로 저장하기
            </button>
          </div>
        </div>
      )}
      {changed ? (
        <Compare text={base} label={base === live ? "지금 스토어 문구" : "스토어에 저장된 문구"} long={long} onRevert={onRevert} disabled={disabled} />
      ) : (
        waiting && <Compare text={live} label="지금 사용자에게 보이는 문구" long={long} />
      )}
    </div>
  );
}
