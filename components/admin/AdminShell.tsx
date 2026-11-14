"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MotionConfig, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ToastProvider } from "@/components/admin/Toast";
import { TeamProvider } from "@/components/admin/team/TeamProvider";
import { ListViewProvider } from "@/components/admin/ListViewProvider";
import CommandPalette from "@/components/admin/CommandPalette";
import { AccountRow } from "@/components/admin/AccountRow";
import { MobileTabBar } from "@/components/admin/MobileNav";
import {
  APP_CONFIG_HREF,
  NAV_GROUPS,
  PendingCount,
  WEBGAME_HREF,
  isActiveItem,
  shortCount,
  type NavItem,
} from "@/components/admin/nav";
import { usePendingCounts } from "@/lib/admin/usePendingCounts";
import { useMaintenanceOn } from "@/lib/admin/useMaintenanceOn";
import { useWebgamePaused } from "@/lib/admin/useWebgamePaused";

// 데스크톱 사이드바 항목
// order: 위에서 몇 번째인지. 처음 열 때 메뉴가 그 순서로 차례로 들어온다(globals.css admin-nav-in)
function NavLink({ item, active, count, notice, order }: { item: NavItem; active: boolean; count: number; notice?: string; order: number }) {
  const { Icon } = item;
  return (
    <Link
      href={item.href}
      style={{ "--i": order } as React.CSSProperties}
      aria-current={active ? "page" : undefined}
      className={`admin-nav-in relative flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
        active
          ? "text-accent"
          : "text-sd-fg-subtle hover:bg-sd-pressed hover:text-sd-fg-muted active:bg-sd-selected"
      }`}
    >
      {active && (
        <motion.span
          layoutId="navHighlight"
          className="pointer-events-none absolute inset-0 rounded-lg bg-accent-weak"
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

// 폰 헤더의 점검 알림. 켜 두고 잊으면 사용자 전체가 막히니 메뉴를 열지 않아도 보이게 하고, 누르면 끄는 화면으로 간다
function MaintenancePill({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-full bg-sd-critical-weak px-2.5 py-1 text-[12px] font-semibold text-sd-critical outline-none focus-visible:ring-2 focus-visible:ring-sd-critical"
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-sd-critical" />
      {label}
    </Link>
  );
}

// 사이드바 메뉴 영역이 위나 아래로 더 있는지. 맥은 스크롤바를 숨기니 가장자리 선과 흐림으로 알린다
function useScrollEdges() {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setEdges({ top: el.scrollTop > 0, bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 1 });
    read();
    el.addEventListener("scroll", read, { passive: true });
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", read);
      ro.disconnect();
    };
  }, []);
  return { ref, edges };
}

const WIDE = /^\/admin\/(events\/[^/]+|company)/;
// 유저와 게임은 목록과 상세 두 칸 화면이라 폭을 다 쓴다(#315). 가운데로 좁히면 두 칸 사이와 메뉴 옆에 빈 띠가 생긴다
const FULL = /^\/admin\/(users|games)\/?$/;

// 메뉴 항목의 위에서부터 순서(묶음을 건너 이어 센다)
const NAV_ORDER = new Map(NAV_GROUPS.flatMap((g) => g.items).map((item, i) => [item.href, i]));

// 화면을 옮길 때 본문이 흐림에서 또렷해지며 살짝 올라온다. 나가는 움직임은 두지 않아 누르자마자 바뀐다.
// 끝나면 filter 를 none 으로 되돌린다. filter 나 transform 이 남으면 본문 안의 fixed 대화상자가 본문에 갇힌다
const PAGE_IN = {
  initial: { opacity: 0, y: 10, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } },
  transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
} as const;

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isActive = (item: NavItem) => isActiveItem(item, pathname);

  const counts = usePendingCounts();
  const countOf = (item: NavItem) => (item.pending && counts ? counts[item.pending] : 0);
  const pendingTotal = counts ? counts.reports + counts.bugs + counts.reviews : 0;
  // 점검을 켜 두고 잊으면 사용자 전체가 막힌다. 어느 화면에서나 보이게 한다
  const maintenanceOn = useMaintenanceOn();
  const webgamePaused = useWebgamePaused();
  const noticeOf = (item: NavItem) =>
    (item.href === APP_CONFIG_HREF && maintenanceOn) || (item.href === WEBGAME_HREF && webgamePaused) ? "점검 중" : undefined;
  const { ref: navRef, edges } = useScrollEdges();

  // 낮은 화면에서 아래쪽 메뉴로 들어왔을 때 지금 메뉴가 가려지지 않게 보이는 곳까지 내린다
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest" });
  }, [pathname, navRef]);

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
    <MotionConfig reducedMotion="user">
    <ToastProvider>
      <TeamProvider>
      <ListViewProvider>
      <div className="admin-shell fixed inset-0 z-50 flex flex-col overscroll-none bg-sd-fill text-sd-fg md:flex-row">
        {/* 데스크톱 사이드바. 로고와 계정 줄은 고정하고 가운데 메뉴만 스크롤한다(docs/admin-ui.md "내비게이션") */}
        {/* 처음 열 때 사이드바가 왼쪽에서 밀려 나온다. 화면을 옮길 때는 그대로 있다 */}
        <motion.aside
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="hidden w-60 shrink-0 flex-col border-r border-sd-line bg-sd-surface md:flex"
        >
          <div className={`flex h-14 shrink-0 items-center border-b px-5 transition-colors ${edges.top ? "border-sd-hairline" : "border-transparent"}`}>
            <Link href="/admin" className="block py-1">
              <img
                src="/brand/header-logo.svg"
                alt="경찰과 도둑"
                className="h-6 w-auto"
              />
            </Link>
          </div>

          <div className="relative min-h-0 flex-1">
            <nav ref={navRef} aria-label="어드민 메뉴" className="h-full scroll-py-8 overflow-y-auto overscroll-contain px-3 pb-3">
              {NAV_GROUPS.map((group, gi) => (
                <div key={group.label ?? gi} role={group.label ? "group" : undefined} aria-labelledby={group.label ? `nav-group-${gi}` : undefined}>
                  {group.label && (
                    <p id={`nav-group-${gi}`} className="px-3 pb-1 pt-4 text-[12px] font-semibold text-sd-fg-subtle">
                      {group.label}
                    </p>
                  )}
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.href}
                        order={NAV_ORDER.get(item.href) ?? 0}
                        item={item}
                        active={isActive(item)}
                        count={countOf(item)}
                        notice={noticeOf(item)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>
            {/* 아래에 메뉴가 더 있으면 끝을 흐리게 해서 이어진다는 걸 보인다 */}
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-sd-surface to-transparent transition-opacity ${edges.bottom ? "opacity-100" : "opacity-0"}`}
            />
          </div>

          <div className="shrink-0 border-t border-sd-hairline px-3 py-3">
            <div className="pl-2">
              <AccountRow />
            </div>
          </div>
        </motion.aside>

        {/* 모바일 상단 헤더. 메뉴, 테마, 로그아웃은 하단 "전체"로 옮기고 점검 알림만 남긴다 */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-sd-line bg-sd-surface px-4 md:hidden">
          <Link href="/admin" className="shrink-0">
            <img
              src="/brand/header-logo.svg"
              alt="경찰과 도둑"
              className="h-6 w-auto"
            />
          </Link>
          <div className="flex min-w-0 items-center gap-1.5">
            {maintenanceOn && <MaintenancePill href={APP_CONFIG_HREF} label="앱 점검 중" />}
            {webgamePaused && <MaintenancePill href={WEBGAME_HREF} label="온라인 게임 점검 중" />}
          </div>
        </header>

        {/* 콘텐츠 */}
        <main className="min-w-0 flex-1 overflow-hidden">
          {/* 행사 하나는 실제 부스 화면을 옆에 띄우고 고쳐서 넓게 쓴다(#221). 작으면 문구가 넘치는지 판단할 수 없다 */}
          <motion.div
            key={pathname}
            {...PAGE_IN}
            className={`mx-auto flex h-full w-full flex-col ${FULL.test(pathname) ? "max-w-none" : WIDE.test(pathname) ? "max-w-7xl" : "max-w-5xl"}`}
          >
            {children}
          </motion.div>
        </main>

        {/* 모바일 하단 탭 바와 전체 메뉴 */}
        <MobileTabBar pathname={pathname} countOf={countOf} noticeOf={noticeOf} />
      </div>
      <CommandPalette />
      </ListViewProvider>
      </TeamProvider>
    </ToastProvider>
    </MotionConfig>
  );
}
