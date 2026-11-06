"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import {
  OverviewIcon,
  UsersIcon,
  GamesIcon,
  NoticeIcon,
  BlogIcon,
  ReportIcon,
  BugIcon,
  TermsIcon,
  MetricsIcon,
  SlidersIcon,
} from "@/components/admin/icons";
import { ToastProvider } from "@/components/admin/Toast";
import CommandPalette from "@/components/admin/CommandPalette";
import { ThemeSwitch } from "@/components/admin/ThemeSwitch";
import { useAdminAuth } from "@/components/admin/AuthProvider";
import { usePendingCounts } from "@/lib/admin/usePendingCounts";
import { useMaintenanceOn } from "@/lib/admin/useMaintenanceOn";

type NavItem = {
  href: string;
  label: string;
  Icon: (p: { className?: string }) => ReactNode;
  exact?: boolean;
  /** 미처리 건수를 옆에 띄우는 메뉴. */
  pending?: "reports" | "bugs";
  /** 하단 탭에 넣지 않는 메뉴. 폰에서는 상단 헤더에서 들어간다. */
  desktopOnly?: boolean;
};

type NavGroup = { label?: string; items: NavItem[] };

const WEBGAME_HREF = "/admin/webgame";

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
      { href: "/admin/metrics", label: "지표", Icon: MetricsIcon },
    ],
  },
  {
    label: "처리",
    items: [
      { href: "/admin/reports", label: "신고", Icon: ReportIcon, pending: "reports" },
      { href: "/admin/bugs", label: "버그", Icon: BugIcon, pending: "bugs" },
      { href: "/admin/terms", label: "약관", Icon: TermsIcon },
    ],
  },
  {
    label: "콘텐츠",
    items: [
      { href: "/admin/notices", label: "공지", Icon: NoticeIcon },
      { href: "/admin/blog", label: "블로그", Icon: BlogIcon },
    ],
  },
  {
    label: "운영",
    items: [
      { href: "/admin/app-config", label: "앱 설정", Icon: SlidersIcon, desktopOnly: true },
      { href: WEBGAME_HREF, label: "온라인 게임", Icon: GamesIcon, desktopOnly: true },
    ],
  },
];

const APP_CONFIG_HREF = "/admin/app-config";

// 모바일 하단 탭 + active 판정용 평면 목록
const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items).filter((item) => !item.desktopOnly);

const shortCount = (n: number) => (n > 99 ? "99+" : String(n));

// 메뉴 옆 미처리 건수. 0건이면 그리지 않는다. 늘 보이는 자리라 배경 없이 숫자만 둔다(docs/admin-ui.md)
function PendingCount({ count, className }: { count: number; className: string }) {
  if (count <= 0) return null;
  return (
    <span className={`font-semibold tabular-nums text-sd-critical ${className}`}>
      <span aria-hidden>{shortCount(count)}</span>
      <span className="sr-only">미처리 {count}건</span>
    </span>
  );
}

// 데스크톱 사이드바 항목
function NavLink({ item, active, count, notice }: { item: NavItem; active: boolean; count: number; notice?: string }) {
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
      <PendingCount count={count} className="relative z-10 ml-auto text-[12px]" />
      {notice && <span className="relative z-10 ml-auto text-[12px] font-semibold text-sd-critical">{notice}</span>}
    </Link>
  );
}

// 모바일 하단 탭 항목
function BottomTab({ item, active, count }: { item: NavItem; active: boolean; count: number }) {
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
      {/* 탭이 좁아(한 칸 약 42px) 글자 줄에 두지 않고 아이콘 오른쪽 위에 얹는다 */}
      <PendingCount count={count} className="absolute left-1/2 top-1 ml-2.5 text-[10px] leading-none" />
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

  const counts = usePendingCounts();
  const countOf = (item: NavItem) => (item.pending && counts ? counts[item.pending] : 0);
  const pendingTotal = counts ? counts.reports + counts.bugs : 0;
  // 점검을 켜 두고 잊으면 사용자 전체가 막힌다. 어느 화면에서나 보이게 한다
  const maintenanceOn = useMaintenanceOn();

  // 다른 탭에 있어도 처리할 게 있는지 보이게 탭 제목 앞에 건수를 붙인다. 어드민 제목은 layout 의 하나뿐이다
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\) /, "");
    document.title = pendingTotal > 0 ? `(${shortCount(pendingTotal)}) ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [pendingTotal]);

  // 어드민 셸은 공개 사이트 문서(머리, 바닥) 위에 fixed 로 덮여 있다. 폰에서 셸을 끌면 그 손가락
  // 움직임이 뒤 문서로 넘어가 주소창이 접히고 셸이 통째로 튕긴다(약관 탭에서 처음 보고됨).
  // 어드민에 있는 동안 뒤 문서의 스크롤을 잠근다. 문서의 스크롤러는 html(h-full)이라 html 과 body 둘 다 건다.
  // 스크롤은 각 화면의 ScrollPage 나 표 상자가 맡는다(데모 전체 화면 DemoApp 과 같은 방식)
  useEffect(() => {
    const targets = [document.documentElement, document.body];
    const prev = targets.map((el) => [el.style.overflow, el.style.overscrollBehavior] as const);
    for (const el of targets) {
      el.style.overflow = "hidden";
      el.style.overscrollBehavior = "none";
    }
    return () => {
      targets.forEach((el, i) => {
        el.style.overflow = prev[i][0];
        el.style.overscrollBehavior = prev[i][1];
      });
    };
  }, []);

  return (
    <ToastProvider>
      <div className="admin-shell fixed inset-0 z-50 flex flex-col overscroll-none bg-sd-fill text-sd-fg md:flex-row">
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
                  <NavLink
                    key={item.href}
                    item={item}
                    active={isActive(item)}
                    count={countOf(item)}
                    notice={item.href === APP_CONFIG_HREF && maintenanceOn ? "점검 중" : undefined}
                  />
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
            {/* 하단 탭이 이미 9칸이라 넣지 않는다(docs/admin-ui.md "모바일"). 밖에서 점검을 끄러 들어오는 길이라 헤더에 둔다 */}
            <Link
              href={APP_CONFIG_HREF}
              aria-label={maintenanceOn ? "앱 설정, 점검 중" : "앱 설정"}
              className={`relative rounded-lg p-1.5 transition hover:bg-sd-pressed ${
                pathname.startsWith(APP_CONFIG_HREF) ? "text-accent" : "text-sd-fg-subtle"
              }`}
            >
              <SlidersIcon className="h-[18px] w-[18px]" />
              {maintenanceOn && <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-sd-critical" />}
            </Link>
            {/* 온라인 게임도 장애 때 폰으로 막으러 들어오는 길이라 앱 설정 옆에 둔다 */}
            <Link
              href={WEBGAME_HREF}
              aria-label="온라인 게임"
              className={`rounded-lg p-1.5 transition hover:bg-sd-pressed ${
                pathname.startsWith(WEBGAME_HREF) ? "text-accent" : "text-sd-fg-subtle"
              }`}
            >
              <GamesIcon className="h-[18px] w-[18px]" />
            </Link>
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
            <BottomTab key={item.href} item={item} active={isActive(item)} count={countOf(item)} />
          ))}
        </nav>
      </div>
      <CommandPalette />
    </ToastProvider>
  );
}
