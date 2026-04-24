"use client";

import { useEffect, useRef, useState } from "react";
import { APP_LINKS } from "@/lib/constants";
import { AppleIcon, PlayIcon } from "@/components/ui/StoreIcons";

export default function DownloadCTAButton() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleClick = () => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/i.test(ua);

    if (isIOS && APP_LINKS.appStore) {
      window.location.href = APP_LINKS.appStore;
      return;
    }
    if (isAndroid && APP_LINKS.googlePlay) {
      window.location.href = APP_LINKS.googlePlay;
      return;
    }
    setOpen((v) => !v);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={handleClick}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-light md:px-4 md:py-2 md:hover:scale-[1.03] md:active:scale-[0.97] dark:bg-brand-green dark:text-app-black dark:hover:bg-brand-green-light"
      >
        <span className="md:hidden">앱 다운로드</span>
        <span className="hidden md:inline">다운로드</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200 dark:bg-app-black-900 dark:ring-white/10"
        >
          <a
            href={APP_LINKS.appStore}
            target="_blank"
            rel="noreferrer"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-slate-900 transition-colors hover:bg-slate-50 dark:text-white dark:hover:bg-white/5"
          >
            <AppleIcon className="h-6 w-6 shrink-0 fill-current" />
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Download on the
              </span>
              <span className="text-sm font-bold">App Store</span>
            </span>
          </a>
          <a
            href={APP_LINKS.googlePlay}
            target="_blank"
            rel="noreferrer"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 border-t border-slate-100 px-4 py-3 text-slate-900 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
          >
            <PlayIcon className="h-6 w-6 shrink-0 fill-current" />
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                GET IT ON
              </span>
              <span className="text-sm font-bold">Google Play</span>
            </span>
          </a>
        </div>
      )}
    </div>
  );
}
