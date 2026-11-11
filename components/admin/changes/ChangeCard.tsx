"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/admin/Avatar";
import { ChevronRightIcon } from "@/components/admin/icons";
import { ACTION_LABEL, AREA, diffWords, isLong, kstTime, type Change, type FieldChange, type Pic } from "@/lib/changes/model";

/**
 * 변경 기록 한 건 (#313, docs/admin-ui.md "변경 기록").
 *
 * 무엇을 어떻게 바꿨는지 읽는 방법이 칸마다 달라 모양을 나눈다.
 * - 값: 전(빨강, 줄 그음) → 후(초록). 새로 생긴 값은 "+ 후"만, 없어진 값은 "− 전"만
 * - 긴 문구: 전과 후를 따로 두지 않고 한 문장 안에서 지운 단어는 빨강 줄 그음, 넣은 단어는 초록
 * - 목록: 더한 것(+, 초록)과 뺀 것(−, 빨강) 칩. 순서만 바꿨으면 그렇게 적는다
 * - 그림: 전과 후 작은 그림. 그림 목록은 더하고 뺀 그림
 * 색만으로 가르지 않게 +, −, 줄 그음, "전", "후" 를 같이 쓴다
 */

const SHOWN = 4;

const ACTION_TONE: Record<Change["action"], string> = {
  add: "bg-sd-positive-weak text-sd-positive",
  edit: "bg-sd-info-weak text-sd-info",
  remove: "bg-sd-critical-weak text-sd-critical",
  run: "bg-sd-fill text-sd-fg-muted",
};
const STATUS: Record<NonNullable<Change["status"]>, { label: string; tone: string }> = {
  done: { label: "끝남", tone: "text-sd-positive" },
  failed: { label: "실패", tone: "text-sd-critical" },
  started: { label: "진행 중", tone: "text-sd-warning" },
};

const Before = ({ children }: { children: string }) => (
  <span className="rounded-md bg-sd-critical-weak px-1.5 py-0.5 text-sd-fg-muted line-through decoration-sd-critical/60 [overflow-wrap:anywhere]">{children}</span>
);
const After = ({ children }: { children: string }) => <span className="rounded-md bg-sd-positive-weak px-1.5 py-0.5 font-medium text-sd-fg [overflow-wrap:anywhere]">{children}</span>;
const Arrow = () => (
  <span aria-label="에서" className="text-sd-fg-subtle">
    →
  </span>
);

function ValueRow({ f, plain }: { f: Extract<FieldChange, { kind: "value" }>; plain?: boolean }) {
  // 긴 문구는 바뀐 단어만 칠한다
  if (f.before && f.after && (isLong(f.before) || isLong(f.after))) {
    const segs = diffWords(f.before, f.after);
    if (segs)
      return (
        <p className="whitespace-pre-wrap rounded-lg bg-sd-fill px-2.5 py-2 text-[13px] leading-relaxed text-sd-fg-muted [overflow-wrap:anywhere]">
          {segs.map((s, i) =>
            s.op === "same" ? (
              <span key={i}>{s.text}</span>
            ) : s.op === "del" ? (
              <del key={i} className="rounded bg-sd-critical-weak text-sd-critical line-through">
                {s.text}
              </del>
            ) : (
              <ins key={i} className="rounded bg-sd-positive-weak font-medium text-sd-fg no-underline">
                {s.text}
              </ins>
            ),
          )}
        </p>
      );
    return (
      <div className="flex flex-col gap-1 text-[13px]">
        <span className="text-[11px] font-semibold text-sd-fg-subtle">전</span>
        <Before>{f.before}</Before>
        <span className="text-[11px] font-semibold text-sd-fg-subtle">후</span>
        <After>{f.after}</After>
      </div>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-[13px]">
      {f.before === null && plain ? (
        <span className="font-medium text-sd-fg">{f.after}</span>
      ) : f.before === null ? (
        <>
          <span className="text-[12px] font-semibold text-sd-positive">+ 새로</span>
          <After>{f.after ?? ""}</After>
        </>
      ) : f.after === null ? (
        <>
          <span className="text-[12px] font-semibold text-sd-critical">− 비움</span>
          <Before>{f.before}</Before>
        </>
      ) : (
        <>
          <Before>{f.before}</Before>
          <Arrow />
          <After>{f.after}</After>
        </>
      )}
    </span>
  );
}

function Thumb({ src, tone, alt }: { src: string | null; tone: "before" | "after"; alt: string }) {
  if (!src) return <span className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-sd-line text-[11px] text-sd-fg-subtle">없음</span>;
  return (
    <a href={src} target="_blank" rel="noreferrer" title="크게 보기">
      <img src={src} alt={alt} className={`h-16 w-16 rounded-lg border-2 bg-white object-contain ${tone === "before" ? "border-sd-critical/50 opacity-70" : "border-sd-positive/60"}`} />
    </a>
  );
}

function PicChips({ pics, tone }: { pics: Pic[]; tone: "add" | "del" }) {
  return pics.map((p) => (
    <span key={`${tone}${p.id}`} className="flex flex-col items-center gap-0.5">
      <span className="relative">
        <Thumb src={p.url} tone={tone === "add" ? "after" : "before"} alt={p.name ?? "그림"} />
        <span className={`absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[11px] font-bold text-white ${tone === "add" ? "bg-sd-positive" : "bg-sd-critical"}`} aria-hidden>
          {tone === "add" ? "+" : "−"}
        </span>
      </span>
      {p.name && <span className="max-w-16 truncate text-[10px] text-sd-fg-subtle">{p.name}</span>}
    </span>
  ));
}

function FieldBody({ f, plain }: { f: FieldChange; plain?: boolean }) {
  if (f.kind === "value") return <ValueRow f={f} plain={plain} />;
  if (f.kind === "image")
    return f.before === null ? (
      <Thumb src={f.after} tone="after" alt={f.label} />
    ) : (
      <span className="flex items-center gap-2">
        <Thumb src={f.before} tone="before" alt={`${f.label} 전`} />
        <Arrow />
        <Thumb src={f.after} tone="after" alt={`${f.label} 후`} />
      </span>
    );
  if (f.kind === "images")
    return (
      <span className="flex flex-wrap items-start gap-2">
        {f.moved && f.added.length + f.removed.length === 0 && <span className="text-[13px] text-sd-fg-muted">순서만 바꿨어요</span>}
        <PicChips pics={f.removed} tone="del" />
        <PicChips pics={f.added} tone="add" />
      </span>
    );
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-[13px]">
      {f.moved && f.added.length + f.removed.length === 0 && <span className="text-sd-fg-muted">순서만 바꿨어요</span>}
      {f.removed.map((x) => (
        <span key={`-${x}`} className="rounded-md bg-sd-critical-weak px-1.5 py-0.5 text-sd-critical line-through decoration-sd-critical/60">
          − {x}
        </span>
      ))}
      {f.added.map((x) =>
        plain ? (
          <span key={`+${x}`} className="rounded-md bg-sd-fill px-1.5 py-0.5 font-medium text-sd-fg-muted">
            {x}
          </span>
        ) : (
          <span key={`+${x}`} className="rounded-md bg-sd-positive-weak px-1.5 py-0.5 font-medium text-sd-positive">
            + {x}
          </span>
        ),
      )}
    </span>
  );
}

export function ChangeCard({ c }: { c: Change }) {
  const [open, setOpen] = useState(false);
  const fields = open ? c.fields : c.fields.slice(0, SHOWN);
  const more = c.fields.length - SHOWN;
  const area = AREA[c.area];
  return (
    <li className="group/day relative flex gap-2.5 sm:gap-3 sm:pl-1">
      {/* 시간 줄: 시각과 점. 날 안의 기록을 세로로 잇는다 */}
      <div className="hidden w-11 shrink-0 flex-col items-end pt-3 sm:flex">
        <span className="text-[12px] font-medium tabular-nums text-sd-fg-subtle">{kstTime(c.at)}</span>
      </div>
      <div className="relative flex shrink-0 flex-col items-center pt-4">
        <span className="absolute inset-y-0 w-px bg-sd-line group-first/day:top-4 group-last/day:bottom-auto group-last/day:h-4" aria-hidden />
        <span className={`relative h-2.5 w-2.5 rounded-full ring-4 ring-sd-fill ${c.impact ? "bg-sd-warning" : "bg-sd-gray-400"}`} aria-hidden />
      </div>
      <article className="mb-3 min-w-0 flex-1 rounded-2xl border border-sd-line bg-sd-surface p-3.5 sm:p-4">
        <header className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <Avatar name={c.actor} size={22} />
          <span className="text-[13px] font-semibold text-sd-fg">{c.actor}</span>
          <span className="text-[12px] tabular-nums text-sd-fg-subtle sm:hidden">{kstTime(c.at)}</span>
          <span className="rounded-md bg-sd-fill px-1.5 py-0.5 text-[11px] font-semibold text-sd-fg-muted">{area.label}</span>
          <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${ACTION_TONE[c.action]}`}>{ACTION_LABEL[c.action]}</span>
          {c.status && <span className={`text-[11px] font-semibold ${STATUS[c.status].tone}`}>{STATUS[c.status].label}</span>}
          {c.impact && <span className="rounded-md bg-sd-warning-weak px-1.5 py-0.5 text-[11px] font-semibold text-sd-warning">사용자에게 닿아요</span>}
          <Link href={c.href ?? area.href} className="ml-auto flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-[12px] font-semibold text-sd-fg-subtle transition hover:bg-sd-gray-200 hover:text-sd-fg">
            바로 가기
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </Link>
        </header>
        <p className="mt-2 text-[14.5px] font-semibold text-sd-fg [overflow-wrap:anywhere]">{c.target}</p>
        {c.note && <p className="mt-1 text-[13px] text-sd-critical">{c.note}</p>}
        {c.fields.length > 0 ? (
          <dl className="mt-3 flex flex-col divide-y divide-sd-hairline">
            {fields.map((f, i) => (
              <div key={`${f.label}${i}`} className="grid grid-cols-1 gap-1.5 py-2 first:pt-0 last:pb-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3">
                <dt className="pt-0.5 text-[12.5px] font-medium text-sd-fg-subtle">{f.label}</dt>
                <dd className="min-w-0">
                  <FieldBody f={f} plain={c.action === "run"} />
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          c.action !== "run" && <p className="mt-1.5 text-[12px] text-sd-fg-subtle">이 화면은 무엇을 했는지만 남고 값은 남지 않아요.</p>
        )}
        {more > 0 && (
          <button type="button" onClick={() => setOpen((v) => !v)} className="mt-2 text-[12px] font-semibold text-accent hover:underline">
            {open ? "접기" : `${more}개 더 보기`}
          </button>
        )}
      </article>
    </li>
  );
}
