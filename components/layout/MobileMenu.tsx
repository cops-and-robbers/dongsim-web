"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { NAV_ITEMS } from "@/lib/constants";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export default function MobileMenu() {
  const isClient = useIsClient();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [prevPath, setPrevPath] = useState(pathname);

  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }

  const toggle = () => setOpen((v) => !v);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const panel = (
    <div
      id="mobile-menu-panel"
      role="dialog"
      aria-modal="false"
      aria-hidden={!open}
      className={`fixed inset-x-0 top-14 z-30 bg-white shadow-lg ring-1 ring-slate-200 transition-transform duration-300 ease-out md:hidden dark:bg-app-black dark:ring-white/10 ${
        open ? "translate-y-0" : "-translate-y-[calc(100%+3.5rem)]"
      }`}
    >
      <nav className="mx-auto max-w-6xl px-4 py-3">
        <ul className="flex flex-col">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block py-3.5 text-[15px] font-medium text-slate-700 dark:text-slate-200"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={open}
        aria-controls="mobile-menu-panel"
        className="flex h-9 w-9 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-slate-100 md:hidden dark:text-slate-200 dark:hover:bg-white/10"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          {open ? (
            <path
              fill="currentColor"
              d="M18.3 5.71L16.89 4.29 12 9.17 7.11 4.29 5.7 5.71 10.59 10.59 5.7 15.47l1.41 1.41L12 12l4.89 4.88 1.41-1.41L13.41 10.59z"
            />
          ) : (
            <path
              fill="currentColor"
              d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"
            />
          )}
        </svg>
      </button>
      {isClient && createPortal(panel, document.body)}
    </>
  );
}
