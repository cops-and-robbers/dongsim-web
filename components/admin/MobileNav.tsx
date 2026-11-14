"use client";

import Link from "next/link";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { LayoutGridIcon, XIcon } from "@/components/admin/icons";
import { AccountRow } from "@/components/admin/AccountRow";
import { NAV_GROUPS, NAV_ITEMS, PendingCount, isActiveItem, type NavItem } from "@/components/admin/nav";

// 폰 내비게이션. 하단 탭은 자주 쓰는 네 개와 "전체" 하나로 다섯 칸이고, 나머지는 "전체"에서 여는 시트에 모두 둔다.
// 탭이 9칸이던 때는 한 칸이 42px 라 글자가 빽빽했다. 근거는 docs/admin-ui.md "모바일"

type Props = {
  pathname: string;
  countOf: (item: NavItem) => number;
  noticeOf: (item: NavItem) => string | undefined;
};

const TABS = NAV_ITEMS.filter((item) => item.tab);
const MORE = NAV_ITEMS.filter((item) => !item.tab);

export function MobileTabBar({ pathname, countOf, noticeOf }: Props) {
  const [open, setOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);

  // 탭에 없는 메뉴의 미처리 건수와 "점검 중"은 "전체" 탭에 모아 보인다. 숨긴 곳에서 일이 쌓이는 걸 놓치지 않게
  const moreCount = MORE.reduce((sum, item) => sum + countOf(item), 0);
  const moreNotice = MORE.some((item) => noticeOf(item));
  const moreActive = open || MORE.some((item) => isActiveItem(item, pathname));

  // 닫기만 했으면 초점을 "전체" 탭으로 돌려준다. 메뉴를 골라 화면이 바뀔 때는 돌려주지 않는다(새 화면에서 탭에 테두리가 남는다)
  const dismiss = () => {
    setOpen(false);
    moreRef.current?.focus();
  };

  return (
    <>
      <nav
        aria-label="어드민 메뉴"
        data-pet-floor
        className="flex shrink-0 border-t border-sd-line bg-sd-surface md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {TABS.map((item) => {
          const active = !open && isActiveItem(item, pathname);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
              {active && <TabIndicator />}
              <item.Icon className="h-[22px] w-[22px]" />
              {item.label}
              <PendingCount count={countOf(item)} className="absolute left-1/2 top-1.5 ml-3 text-[11px] leading-none" />
            </Link>
          );
        })}
        <button
          ref={moreRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className={tabClass(moreActive)}
        >
          {moreActive && <TabIndicator />}
          <LayoutGridIcon className="h-[22px] w-[22px]" />
          전체
          {moreCount > 0 ? (
            <PendingCount count={moreCount} className="absolute left-1/2 top-1.5 ml-3 text-[11px] leading-none" />
          ) : (
            moreNotice && (
              <span className="absolute left-1/2 top-2 ml-3 h-2 w-2 rounded-full bg-sd-critical">
                <span className="sr-only">점검 중</span>
              </span>
            )
          )}
        </button>
      </nav>
      <MenuSheet open={open} onClose={dismiss} onPick={() => setOpen(false)} pathname={pathname} countOf={countOf} noticeOf={noticeOf} />
    </>
  );
}

const tabClass = (active: boolean) =>
  `relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 py-2 text-[12px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
    active ? "text-accent" : "text-sd-fg-subtle"
  }`;

function TabIndicator() {
  return (
    <motion.span
      layoutId="mobileTab"
      className="pointer-events-none absolute inset-x-5 top-0 h-0.5 rounded-full bg-accent"
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
    />
  );
}

// 아래에서 올라오는 전체 메뉴. 사이드바와 같은 그룹으로 모든 메뉴를 두 줄로 놓고, 바닥에 계정 줄을 둔다.
// 닫기: 닫기 버튼, 바탕 누르기, Esc, 손잡이를 아래로 끌기, 메뉴 누르기
function MenuSheet({ open, onClose, onPick, pathname, countOf, noticeOf }: Props & { open: boolean; onClose: () => void; onPick: () => void }) {
  const reduce = useReducedMotion();
  const drag = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  // 열려 있는 동안 초점이 시트 밖(뒤 화면)으로 나가지 않게 한다
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !sheetRef.current) return;
    const nodes = sheetRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 420, damping: 40 };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <motion.button
            type="button"
            aria-label="닫기"
            tabIndex={-1}
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.2 }}
          />
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-menu-sheet-title"
            onKeyDown={onKeyDown}
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) onClose();
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={spring}
            className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-2xl bg-sd-surface"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div onPointerDown={(e) => drag.start(e)} className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-2.5">
              <span className="h-1 w-9 rounded-full bg-sd-gray-300" />
            </div>
            <div className="flex shrink-0 items-center justify-between px-5 pb-1">
              <h2 id="admin-menu-sheet-title" className="text-[17px] font-bold text-sd-fg">
                전체 메뉴
              </h2>
              <button
                ref={closeRef}
                type="button"
                aria-label="닫기"
                onClick={onClose}
                className="-mr-2 rounded-lg p-2 text-sd-fg-subtle outline-none transition hover:bg-sd-pressed focus-visible:ring-2 focus-visible:ring-accent"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
              {NAV_GROUPS.map((group, gi) => (
                <div key={group.label ?? gi} role={group.label ? "group" : undefined} aria-labelledby={group.label ? `sheet-group-${gi}` : undefined}>
                  {group.label && (
                    <p id={`sheet-group-${gi}`} className="px-1 pb-1.5 pt-4 text-[12px] font-semibold text-sd-fg-subtle">
                      {group.label}
                    </p>
                  )}
                  <div className={`grid grid-cols-2 gap-2 ${group.label ? "" : "pt-2"}`}>
                    {group.items.map((item) => (
                      <SheetLink key={item.href} item={item} active={isActiveItem(item, pathname)} count={countOf(item)} notice={noticeOf(item)} onPick={onPick} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="shrink-0 border-t border-sd-hairline px-5 py-3">
              <AccountRow />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function SheetLink({ item, active, count, notice, onPick }: { item: NavItem; active: boolean; count: number; notice?: string; onPick: () => void }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onPick}
      className={`flex min-h-12 min-w-0 items-center gap-2.5 rounded-xl px-3 text-[14px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
        active ? "bg-accent-weak text-accent" : "bg-sd-fill text-sd-fg active:bg-sd-selected"
      }`}
    >
      <item.Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "" : "text-sd-fg-subtle"}`} />
      <span className="min-w-0 truncate">{item.label}</span>
      <PendingCount count={count} className="ml-auto shrink-0 text-[12px]" />
      {notice && <span className="ml-auto shrink-0 text-[12px] font-semibold text-sd-critical">{notice}</span>}
    </Link>
  );
}
