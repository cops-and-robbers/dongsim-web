"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import {
  OverviewIcon,
  UsersIcon,
  GamesIcon,
  NoticeIcon,
  ReportIcon,
  BugIcon,
} from "@/components/admin/icons";
import { ToastProvider } from "@/components/admin/Toast";
import CommandPalette from "@/components/admin/CommandPalette";
import { ThemeSwitch } from "@/components/admin/ThemeSwitch";
import { useAdminAuth } from "@/components/admin/AuthProvider";

type NavItem = {
  href: string;
  label: string;
  Icon: (p: { className?: string }) => ReactNode;
  exact?: boolean;
};

type NavGroup = { label?: string; items: NavItem[] };

// 역할별 그룹. 개요(현황) → 데이터(조회) → 처리(액션 필요) → 콘텐츠(발행) 흐름.
const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ href: "/admin", label: "개요", Icon: OverviewIcon, exact: true }],
  },
  {
    label: "데이터",
    items: [
      { href: "/admin/users", label: "유저", Icon: UsersIcon },
      { href: "/admin/games", label: "게임", Icon: GamesIcon },
    ],
  },
  {
    label: "처리",
    items: [
      { href: "/admin/reports", label: "신고", Icon: ReportIcon },
      { href: "/admin/bugs", label: "버그", Icon: BugIcon },
    ],
  },
  {
    label: "콘텐츠",
    items: [{ href: "/admin/notices", label: "공지", Icon: NoticeIcon }],
  },
];

// 모바일 하단 탭 + active 판정용 평면 목록
const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

// 데스크톱 사이드바 항목
function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const { Icon } = item;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-semibold transition-colors ${
        active
          ? "text-accent"
          : "text-sd-fg-subtle hover:bg-sd-pressed hover:text-sd-fg-muted active:bg-sd-selected"
      }`}
    >
      {active && (
        <motion.span
          layoutId="navHighlight"
          className="absolute inset-0 rounded-lg bg-accent-weak"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <Icon className="relative z-10 h-[18px] w-[18px] shrink-0" />
      <span className="relative z-10">{item.label}</span>
    </Link>
  );
}

// 모바일 하단 탭 항목
function BottomTab({ item, active }: { item: NavItem; active: boolean }) {
  const { Icon } = item;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition-colors ${
        active ? "text-accent" : "text-sd-fg-subtle"
      }`}
    >
      {active && (
        <motion.span
          layoutId="mobileTab"
          className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-accent"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <Icon className="h-[22px] w-[22px]" />
      {item.label}
    </Link>
  );
}

// 닉네임 + 로그아웃 (사이드바 하단 / 모바일 헤더 공용)
function AccountRow({ compact = false }: { compact?: boolean }) {
  const { profile, logout } = useAdminAuth();
  return (
    <div className="flex min-w-0 items-center gap-2">
      {!compact && (
        <p className="min-w-0 truncate text-[13px] font-semibold text-sd-fg">
          {profile?.nickname ?? "관리자"}
        </p>
      )}
      <button
        type="button"
        onClick={() => logout()}
        className="ml-auto shrink-0 rounded-lg px-2 py-1 text-[12px] font-semibold text-sd-fg-subtle transition hover:bg-sd-pressed hover:text-sd-critical"
      >
        로그아웃
      </button>
    </div>
  );
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <ToastProvider>
      <div className="admin-shell fixed inset-0 z-50 flex flex-col bg-sd-fill text-sd-fg md:flex-row">
        {/* 데스크톱 사이드바 */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-sd-line bg-sd-surface px-3 py-5 md:flex">
          <Link href="/admin" className="mb-8 block px-2.5 py-1">
            <img
              src="/brand/header-logo.svg"
              alt="경찰과 도둑"
              className="h-6 w-auto"
            />
          </Link>

          <nav className="flex flex-col gap-0.5">
            {NAV_GROUPS.map((group, gi) => (
              <div key={group.label ?? gi} className="flex flex-col gap-0.5">
                {gi > 0 && <div className="mx-3 my-2 h-px bg-sd-hairline" />}
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} active={isActive(item)} />
                ))}
              </div>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-2 border-t border-sd-hairline pt-3">
            <div className="px-2">
              <AccountRow />
            </div>
            <div className="flex items-center justify-between px-2">
              <span className="text-[13px] font-medium text-sd-fg-subtle">
                테마
              </span>
              <ThemeSwitch />
            </div>
          </div>
        </aside>

        {/* 모바일 상단 헤더 */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-sd-line bg-sd-surface px-4 md:hidden">
          <Link href="/admin">
            <img
              src="/brand/header-logo.svg"
              alt="경찰과 도둑"
              className="h-6 w-auto"
            />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitch />
            <AccountRow compact />
          </div>
        </header>

        {/* 콘텐츠 */}
        <main className="min-w-0 flex-1 overflow-hidden">
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
            {children}
          </div>
        </main>

        {/* 모바일 하단 탭 바 */}
        <nav
          className="flex shrink-0 border-t border-sd-line bg-sd-surface md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {NAV.map((item) => (
            <BottomTab key={item.href} item={item} active={isActive(item)} />
          ))}
        </nav>
      </div>
      <CommandPalette />
    </ToastProvider>
  );
}
