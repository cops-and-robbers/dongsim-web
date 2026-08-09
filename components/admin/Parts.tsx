"use client";

import type { ReactNode, SelectHTMLAttributes } from "react";
import Link from "next/link";
import { Button } from "@/components/admin/Button";
import {
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/admin/icons";

// 어드민 공통 부품. 카드는 전부 동일한 얇은 테두리 흰 카드(그림자·링 혼용 없음).

export const SURFACE = "rounded-2xl border border-sd-line bg-sd-surface";

// 페이지 전체가 스크롤되는 화면(개요·상세·분석)
export function ScrollPage({ children }: { children: ReactNode }) {
  return (
    <div className="h-full overflow-y-auto px-4 py-6 md:px-8 md:py-8">
      {children}
    </div>
  );
}

// 뷰포트 높이에 맞추고 내부(테이블)만 스크롤하는 리스트 화면
export function ListPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col px-4 pt-6 pb-4 md:px-8 md:pt-8 md:pb-6">
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link
          href={back.href}
          className="mb-2.5 inline-flex items-center gap-1 text-[13px] font-semibold text-sd-fg-subtle transition hover:text-accent"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-sd-fg">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-[14px] text-sd-fg-subtle">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`${SURFACE} ${className}`}>{children}</div>;
}

export function SectionCard({
  title,
  right,
  children,
  flush = false,
}: {
  title: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  flush?: boolean;
}) {
  return (
    <div className={SURFACE}>
      <div className="flex items-center justify-between border-b border-sd-hairline px-5 py-4">
        <h2 className="text-[14px] font-bold text-sd-fg">
          {title}
        </h2>
        {right}
      </div>
      <div className={flush ? "" : "p-5"}>{children}</div>
    </div>
  );
}

export function DescriptionList({
  items,
}: {
  items: { term: string; desc: ReactNode }[];
}) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
      {items.map((it, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 border-b border-sd-hairline pb-3 last:border-0 sm:border-0 sm:pb-0"
        >
          <dt className="text-[13px] font-medium text-sd-fg-subtle">
            {it.term}
          </dt>
          <dd className="text-[14px] font-semibold text-sd-fg">
            {it.desc}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sd-fg-subtle" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-60 rounded-xl border border-sd-line bg-sd-surface pl-9 pr-3.5 text-[14px] font-medium text-sd-fg outline-none transition placeholder:text-sd-placeholder focus:border-accent"
      />
    </div>
  );
}

export function Select({
  className = "",
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={`h-10 rounded-xl border border-sd-line bg-sd-surface px-3.5 text-[14px] font-medium text-sd-fg-muted outline-none transition focus:border-accent ${className}`}
    >
      {children}
    </select>
  );
}

function pageWindow(page: number, total: number): (number | "…")[] {
  const cur = page + 1;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const wanted = new Set([1, total, cur, cur - 1, cur + 1]);
  const sorted = [...wanted].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

export function Pagination({
  page,
  totalPages,
  totalElements,
  size = 20,
  onPage,
}: {
  page: number;
  totalPages: number;
  totalElements: number;
  size?: number;
  onPage: (p: number) => void;
}) {
  const start = totalElements === 0 ? 0 : page * size + 1;
  const end = Math.min((page + 1) * size, totalElements);

  return (
    <div className="flex items-center justify-between gap-3 border-t border-sd-hairline px-4 py-3 md:px-5">
      <p className="shrink-0 whitespace-nowrap text-[13px] font-medium text-sd-fg-subtle tabular-nums">
        {start.toLocaleString()}–{end.toLocaleString()}
        <span className="text-sd-disabled"> / {totalElements.toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-1">
        <PageBtn disabled={page <= 0} onClick={() => onPage(page - 1)}>
          <ChevronLeftIcon className="h-4 w-4" />
        </PageBtn>

        {/* 데스크톱: 번호 버튼 */}
        <div className="hidden items-center gap-1 sm:flex">
          {pageWindow(page, totalPages).map((n, i) =>
            n === "…" ? (
              <span
                key={`e${i}`}
                className="px-1 text-[13px] font-medium text-sd-disabled"
              >
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => onPage(n - 1)}
                className={`h-8 min-w-8 rounded-lg px-2 text-[13px] font-semibold tabular-nums transition ${
                  n - 1 === page
                    ? "bg-accent text-accent-fg"
                    : "text-sd-fg-muted hover:bg-sd-gray-200"
                }`}
              >
                {n}
              </button>
            )
          )}
        </div>

        {/* 모바일: 현재/전체 */}
        <span className="px-1.5 text-[13px] font-semibold text-sd-fg-subtle tabular-nums sm:hidden">
          {totalPages === 0 ? 0 : page + 1}
          <span className="text-sd-disabled"> / {totalPages}</span>
        </span>

        <PageBtn
          disabled={page >= totalPages - 1}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </PageBtn>
      </div>
    </div>
  );
}

function PageBtn({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-sd-fg-subtle transition hover:bg-sd-gray-200 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-sd-fg-subtle"
    >
      {children}
    </button>
  );
}

export function ErrorBlock({
  onRetry,
  message,
}: {
  onRetry?: () => void;
  message?: string;
}) {
  return (
    <div className="py-14 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/photobooth/cop-search.svg"
        alt=""
        className="mx-auto mb-5 h-16 w-auto drop-shadow-md"
      />
      <p className="text-[15px] font-bold text-sd-fg">
        불러오지 못했어요
      </p>
      <p className="mt-1.5 text-[14px] text-sd-fg-subtle">
        {message ?? "잠시 후 다시 시도해 주세요."}
      </p>
      {onRetry && (
        <div className="mt-5 flex justify-center">
          <Button variant="brand" onClick={onRetry}>
            다시 시도
          </Button>
        </div>
      )}
    </div>
  );
}

export function EmptyBlock({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="py-14 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/photobooth/cop-search.svg"
        alt=""
        className="mx-auto mb-5 h-16 w-auto drop-shadow-md"
      />
      <p className="text-[15px] font-bold text-sd-fg">
        {title}
      </p>
      {description && (
        <p className="mt-1.5 text-[14px] text-sd-fg-subtle">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-1 p-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 px-2 py-3"
          style={{ opacity: 1 - r * 0.08 }}
        >
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-sd-gray-200" />
          <div className="h-3.5 flex-1 animate-pulse rounded-full bg-sd-gray-200" />
          <div className="h-3.5 w-20 animate-pulse rounded-full bg-sd-gray-200" />
          <div className="h-3.5 w-16 animate-pulse rounded-full bg-sd-gray-200" />
        </div>
      ))}
    </div>
  );
}
