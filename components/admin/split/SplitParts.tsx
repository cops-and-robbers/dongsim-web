"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { profileIconSrc } from "@/lib/admin/people";

/**
 * 유저와 게임 두 칸 화면(#315)의 조각들. 시안 "경도 어드민 유저와 게임"의 모양을 어드민 토큰(sd-*)으로 옮겼다.
 * 경찰은 sd-info(파랑), 도둑은 sd-positive(초록)라 라이트와 다크 모두 팀 색이 맞는다
 */

/* ─── 목록 칸 ─── */

/** 목록 칸 머리. 제목, 개수, 오른쪽 조작, 그 아래 검색이나 칩 */
export function ListHead({ title, count, right, children }: { title: string; count?: ReactNode; right?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-5 pt-5 pb-3">
      <div className="flex items-baseline gap-2">
        <h1 className="text-[21px] font-extrabold tracking-[-0.02em] text-sd-fg">{title}</h1>
        {count != null && <span className="text-[13.5px] font-medium tabular-nums text-sd-fg-subtle">{count}</span>}
        {right && <div className="ml-auto self-center">{right}</div>}
      </div>
      {children}
    </div>
  );
}

/** 목록 안의 묶음 제목. 스크롤해도 위에 붙어 있다 */
export function GroupHead({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="sticky top-0 z-[1] flex items-center gap-2 bg-sd-surface px-3 pt-3.5 pb-1.5 text-[12.5px] font-semibold text-sd-fg-subtle">
      <span>{children}</span>
      {right != null && <span className="ml-auto font-medium tabular-nums">{right}</span>}
    </div>
  );
}

// 고른 줄 바탕이 한 줄에서 다음 줄로 미끄러져 옮겨 간다(사이드바 메뉴와 같은 용수철). 지금 어디를 보고 있는지 눈이 따라간다
const SLIDE = { type: "spring", stiffness: 520, damping: 40, mass: 0.8 } as const;

/** 목록 한 줄. 고른 줄은 강조색 바탕이고 보조 기술에 현재 항목으로 알린다 */
export function ListRow({ href, current, children, onClick }: { href: string; current: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <Link
      href={href}
      scroll={false}
      onClick={onClick}
      aria-current={current ? "true" : undefined}
      className={`relative isolate flex min-h-[58px] w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${current ? "" : "hover:bg-sd-pressed"}`}
    >
      {/* isolate 안의 -z 라 줄 바탕 위, 글자 아래에 깔린다 */}
      {current && <motion.span layoutId="split-row-current" aria-hidden className="absolute inset-0 -z-10 rounded-xl bg-accent-weak" transition={SLIDE} />}
      {children}
    </Link>
  );
}

/** 칩 하나. 고르면 진한 바탕이 옆 칩에서 미끄러져 온다. group 은 한 화면에 칩 묶음이 여럿일 때 서로 섞이지 않게 나누는 이름 */
export function Chip({ on, onClick, children, group = "chips" }: { on: boolean; onClick: () => void; children: ReactNode; group?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`relative isolate whitespace-nowrap rounded-full bg-sd-gray-200 px-[11px] py-[5px] text-[13px] transition-colors ${
        on ? "font-semibold text-sd-surface" : "font-medium text-sd-fg-muted hover:bg-sd-gray-300"
      }`}
    >
      {on && <motion.span layoutId={`chip-on-${group}`} aria-hidden className="absolute inset-0 -z-10 rounded-full bg-sd-fg" transition={SLIDE} />}
      {children}
    </button>
  );
}

/**
 * 목록을 나누는 두세 칸 전환(#323). 고른 칸의 흰 바탕이 옆 칸으로 미끄러져 옮겨 간다(칩, 고른 줄과 같은 용수철).
 * group 은 한 화면에 전환이 여럿일 때 바탕이 섞이지 않게 나누는 이름
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  group,
  label,
}: {
  value: T;
  options: readonly { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  group: string;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="grid rounded-[11px] bg-sd-gray-200 p-[3px]" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={`relative isolate flex items-center justify-center gap-1.5 rounded-[9px] px-3 py-[7px] text-[13.5px] transition-colors ${
              on ? "font-bold text-sd-fg" : "font-semibold text-sd-fg-subtle hover:text-sd-fg-muted"
            }`}
          >
            {on && <motion.span layoutId={`seg-${group}`} aria-hidden className="absolute inset-0 -z-10 rounded-[9px] bg-sd-surface shadow-[0_1px_2px_rgba(2,32,71,0.1)]" transition={SLIDE} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** 목록 끝에 닿으면 다음 쪽을 부르는 줄. 버튼도 함께 둬서 키보드와 느린 연결에서도 누를 수 있다 */
export function LoadMore({ hasMore, loading, failed, onMore }: { hasMore: boolean; loading: boolean; failed: boolean; onMore: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore || loading || failed) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && onMore(), { rootMargin: "240px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, failed, onMore]);
  if (!hasMore) return null;
  return (
    <div ref={ref} className="flex justify-center px-3 py-3">
      <button
        type="button"
        onClick={onMore}
        disabled={loading}
        className="rounded-lg px-3 py-1.5 text-[13px] font-semibold text-sd-fg-muted transition-colors hover:bg-sd-pressed disabled:opacity-60"
      >
        {loading ? "불러오는 중이에요" : failed ? "다시 불러오기" : "더 보기"}
      </button>
    </div>
  );
}

/** 목록이 비었을 때 한 줄 */
export function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="px-3 py-3 text-[13.5px] text-sd-fg-subtle">{children}</p>;
}

/* ─── 상세 칸 ─── */

/** 카드. 상세 칸은 회색 바탕 위에 흰 카드를 쌓는다 */
export function Panel({ title, sub, right, children, className = "" }: { title?: ReactNode; sub?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[18px] bg-sd-surface px-[22px] py-5 shadow-[0_1px_2px_rgba(2,32,71,0.04)] ${className}`}>
      {title && (
        <h3 className="mb-3 flex items-baseline gap-2 text-[15px] font-bold text-sd-fg">
          {title}
          {sub != null && <small className="text-[13px] font-medium tabular-nums text-sd-fg-subtle">{sub}</small>}
          {right != null && <small className="ml-auto text-[13px] font-medium tabular-nums text-sd-fg-subtle">{right}</small>}
        </h3>
      )}
      {children}
    </section>
  );
}

/** 숫자 칸 여러 개. 칸 사이는 세로 선 */
export function Stats({ items }: { items: { label: string; value: ReactNode; unit?: string; tone?: "cop" | "rob" | "crit" }[] }) {
  const tone = { cop: "text-sd-info", rob: "text-sd-positive", crit: "text-sd-critical" } as const;
  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((it, i) => (
        <div key={it.label} className={`px-4 py-0.5 first:pl-0 ${i > 0 ? "shadow-[inset_1px_0_0_var(--sd-hairline)]" : ""}`}>
          <small className="mb-0.5 block text-[12.5px] text-sd-fg-subtle">{it.label}</small>
          <b className={`whitespace-nowrap text-[21px] font-bold tracking-[-0.02em] tabular-nums ${it.tone ? tone[it.tone] : "text-sd-fg"}`}>
            {typeof it.value === "number" ? <CountUp value={it.value} /> : it.value}
            {it.unit && <em className="ml-[3px] text-[13px] font-medium not-italic text-sd-fg-subtle">{it.unit}</em>}
          </b>
        </div>
      ))}
    </div>
  );
}

/**
 * 숫자가 0에서 제 값까지 빠르게 올라간다. 처음 그릴 때만, 그 뒤로 값이 바뀌면 바뀐 만큼만 움직인다.
 * 글자는 처음부터 최종 값으로 그려 두고 움직임만 덧입혀서, 움직임을 끈 사람은 바로 최종 값을 본다
 */
function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce || !Number.isInteger(value)) return;
    const start = from.current;
    from.current = value;
    if (start === value) return;
    const c = animate(start, value, {
      duration: Math.min(0.9, 0.35 + Math.abs(value - start) * 0.02),
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => (el.textContent = Math.round(v).toLocaleString("ko-KR")),
    });
    return () => c.stop();
  }, [value, reduce]);
  return (
<span ref={ref}>{value.toLocaleString("ko-KR")}</span>
  );
}

/** 이름과 값 한 줄. 줄 사이는 가는 선 */
export function KV({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-[9px] text-[14px] [&+&]:shadow-[inset_0_1px_0_var(--sd-hairline)]">
      <span className="min-w-0 text-sd-fg-muted">
        {label}
        {hint && <small className="mt-px block text-[12.5px] text-sd-fg-subtle">{hint}</small>}
      </span>
      <b className="shrink-0 text-right font-semibold text-sd-fg">{children}</b>
    </div>
  );
}

/** 작은 표시. 기본은 회색, 강조, 위험, 주의 */
export function Tag({ tone = "plain", children }: { tone?: "plain" | "acc" | "crit" | "warn" | "cop" | "rob"; children: ReactNode }) {
  const cls = {
    plain: "bg-sd-gray-200 text-sd-fg-muted",
    acc: "bg-accent-weak text-accent",
    crit: "bg-sd-critical-weak text-sd-critical",
    warn: "bg-sd-warning-weak text-sd-warning",
    cop: "bg-sd-info-weak text-sd-info",
    rob: "bg-sd-positive-weak text-sd-positive",
  }[tone];
  return <span className={`inline-flex items-center whitespace-nowrap rounded-md px-[7px] py-0.5 text-[11.5px] font-semibold leading-[1.4] ${cls}`}>{children}</span>;
}

/** 지금 상태 점. 게임 중이면 초록 점이 맥박처럼 퍼진다(움직임 줄이기를 켜면 멈춘다) */
export function LiveDot({ live }: { live: boolean }) {
  return (
    <span className={`relative inline-block h-[7px] w-[7px] shrink-0 rounded-full ${live ? "bg-sd-positive" : "bg-sd-fg-subtle"}`} aria-hidden>
      {live && <span className="absolute -inset-[3px] rounded-full border-[1.5px] border-sd-positive motion-safe:animate-[livepulse_1.8s_ease-out_infinite]" />}
    </span>
  );
}

/** 상세 칸 머리. 왼쪽 그림, 제목, 아래 한 줄, 오른쪽 조작 */
export function DetailHead({ lead, title, sub, actions }: { lead?: ReactNode; title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex items-center gap-3.5 px-0.5 pt-1 pb-2">
      {lead}
      <div className="min-w-0 flex-1">
        <h2 className="flex flex-wrap items-center gap-2 text-[24px] font-extrabold leading-[1.25] tracking-[-0.025em] text-sd-fg">{title}</h2>
        {sub && <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[13.5px] text-sd-fg-subtle">{sub}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}

/** 상세 칸의 아이콘 버튼 */
export function IconButton({ label, href, onClick, children }: { label: string; href?: string; onClick?: () => void; children: ReactNode }) {
  const cls = "inline-flex h-8 w-8 items-center justify-center rounded-[9px] text-sd-fg-subtle transition-colors hover:bg-sd-gray-200 hover:text-sd-fg";
  if (href)
    return (
      <Link href={href} aria-label={label} title={label} className={cls}>
        {children}
      </Link>
    );
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/** 누르면 복사하고 그 자리에서 "복사했어요"로 바뀐다 */
export function CopyText({ text, children }: { text: string; children: ReactNode }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => setDone(false), 1600);
    return () => window.clearTimeout(t);
  }, [done]);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => setDone(true), () => {});
      }}
      className="inline-flex items-center gap-1 rounded-md px-1 -mx-1 transition-colors hover:bg-sd-pressed hover:text-sd-fg-muted"
      title="복사하기"
    >
      {children}
      {done ? (
        <span role="status" className="font-semibold text-sd-positive">
          복사했어요
        </span>
      ) : (
        <CopyIcon />
      )}
    </button>
  );
}

/** 상세가 비었을 때(아무것도 안 골랐거나, 찾을 수 없거나, 불러오지 못했을 때) */
export function DetailState({ title, body, action, art }: { title: string; body?: ReactNode; action?: ReactNode; art?: "jailed" | "robber" | null }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-1.5 px-6 py-14 text-center">
      {art && <img src={art === "jailed" ? "/characters/robber-jailed.svg" : "/characters/robber.svg"} alt="" className="mb-2.5 h-[72px]" />}
      <h3 className="text-[16px] font-bold text-sd-fg">{title}</h3>
      {body && <p className="text-[13.5px] text-sd-fg-subtle">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/* ─── 사람 그림 ─── */

/** 사람 그림(꾸밈). 앱의 프로필 그림을 앱과 같은 모양으로, 유저 번호로 둘 중 하나를 골라 그린다(lib/admin/people.ts profileIconSrc) */
export function PersonAvatar({ id, size = 40 }: { id: string | null | undefined; size?: number }) {
  return <img src={profileIconSrc(id)} alt="" aria-hidden width={size} height={size} className="shrink-0 rounded-full" style={{ width: size, height: size }} />;
}

/* ─── 아이콘 ─── */

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

export function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4" />
    </svg>
  );
}

/** 상세 칸을 처음 읽는 동안의 뼈대 */
export function PanelSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-3">
      <div className="flex items-center gap-3.5 py-1">
        <span className="h-14 w-14 animate-pulse rounded-full bg-sd-gray-200" />
        <span className="space-y-2">
          <span className="block h-6 w-36 animate-pulse rounded bg-sd-gray-200" />
          <span className="block h-3.5 w-24 animate-pulse rounded bg-sd-gray-200" />
        </span>
      </div>
      <div className="h-24 animate-pulse rounded-[18px] bg-sd-gray-200" />
      <div className="h-64 animate-pulse rounded-[18px] bg-sd-gray-200" />
    </div>
  );
}
