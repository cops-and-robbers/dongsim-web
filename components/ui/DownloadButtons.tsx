"use client";

import { useEffect, useRef, useState } from "react";
import { APP_LINKS } from "@/lib/constants";
import { AppleIcon, PlayIcon } from "@/components/ui/StoreIcons";
import { CHROME } from "@/lib/i18n/chrome";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { trackEvent } from "@/lib/analytics";

type Props = {
  variant?: "primary" | "onDark";
  className?: string;
  // GA4 app_download_click 이벤트에 어느 위치의 버튼인지 기록(예: home_hero)
  placement?: string;
};

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-5 w-5"}
      aria-hidden="true"
    >
      <path d="M12 4v11" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}

const baseBtn =
  "inline-flex items-center justify-center gap-2.5 rounded-xl text-base font-bold shadow-sm transition-colors duration-200";

export default function DownloadButtons({
  variant = "primary",
  className = "",
  placement = "unknown",
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const locale = useLocale();
  const chrome = CHROME[locale];

  const trackDownload = (store: "appstore" | "googleplay") =>
    trackEvent("app_download_click", { store, placement, locale });

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

  const handleMobileClick = () => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/i.test(ua);

    if (isIOS && APP_LINKS.appStore) {
      trackDownload("appstore");
      window.location.href = APP_LINKS.appStore;
      return;
    }
    if (isAndroid && APP_LINKS.googlePlay) {
      trackDownload("googleplay");
      window.location.href = APP_LINKS.googlePlay;
      return;
    }
    setOpen((v) => !v);
  };

  const appStoreAvailable = APP_LINKS.appStore.trim().length > 0;

  const mobilePrimaryStyle =
    variant === "onDark"
      ? "bg-white text-brand-blue hover:bg-slate-100 active:bg-slate-200 dark:bg-brand-green dark:text-app-black dark:hover:bg-brand-green-light dark:active:bg-brand-green"
      : "bg-brand-blue text-white hover:bg-brand-blue-light active:bg-brand-blue dark:bg-brand-green dark:text-app-black dark:hover:bg-brand-green-light dark:active:bg-brand-green";

  const appleStyle =
    variant === "onDark"
      ? "bg-white text-app-black hover:bg-slate-100 active:bg-slate-200"
      : "bg-app-black text-white hover:bg-app-black-900 active:bg-app-black dark:bg-white dark:text-app-black dark:hover:bg-slate-100 dark:active:bg-slate-200";

  const googleStyle =
    variant === "onDark"
      ? "bg-brand-ink text-white hover:bg-brand-ink-hover active:bg-brand-ink-active dark:bg-brand-green dark:text-app-black dark:hover:bg-brand-green-light dark:active:bg-brand-green"
      : "bg-brand-blue text-white hover:bg-brand-blue-light active:bg-brand-blue dark:bg-brand-green dark:text-app-black dark:hover:bg-brand-green-light dark:active:bg-brand-green";

  return (
    <div className={className}>
      <div className="relative sm:hidden" ref={wrapperRef}>
        <button
          type="button"
          onClick={handleMobileClick}
          aria-haspopup="menu"
          aria-expanded={open}
          className={`${baseBtn} ${mobilePrimaryStyle} w-full px-8 py-4`}
        >
          <DownloadIcon className="h-5 w-5" />
          <span>{chrome.downloadShort}</span>
        </button>

        {open && (
          <div
            role="menu"
            className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200 dark:bg-app-black-900 dark:ring-white/10"
          >
            {appStoreAvailable && (
              <a
                href={APP_LINKS.appStore}
                target="_blank"
                rel="noreferrer"
                role="menuitem"
                onClick={() => {
                  trackDownload("appstore");
                  setOpen(false);
                }}
                className="flex items-center gap-3 px-5 py-4 text-slate-900 transition-colors hover:bg-slate-50 dark:text-white dark:hover:bg-white/5"
              >
                <AppleIcon className="h-6 w-6 shrink-0 fill-current" />
                <span className="text-sm font-semibold">App Store</span>
              </a>
            )}
            <a
              href={APP_LINKS.googlePlay}
              target="_blank"
              rel="noreferrer"
              role="menuitem"
              onClick={() => {
                trackDownload("googleplay");
                setOpen(false);
              }}
              className="flex items-center gap-3 border-t border-slate-100 px-5 py-4 text-slate-900 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
            >
              <PlayIcon className="h-6 w-auto shrink-0" />
              <span className="text-sm font-semibold">Google Play</span>
            </a>
          </div>
        )}
      </div>

      <div className="hidden items-center gap-3 sm:flex">
        {appStoreAvailable ? (
          <a
            href={APP_LINKS.appStore}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackDownload("appstore")}
            className={`${baseBtn} ${appleStyle} min-w-45 px-6 py-3.5`}
            aria-label="App Store에서 다운로드"
          >
            <AppleIcon className="h-6 w-6 fill-current" />
            <span>App Store</span>
          </a>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="App Store 출시 준비 중"
            className={`${baseBtn} ${appleStyle} min-w-45 cursor-not-allowed px-6 py-3.5 opacity-60`}
          >
            <AppleIcon className="h-6 w-6 fill-current" />
            <span>App Store</span>
          </button>
        )}

        <a
          href={APP_LINKS.googlePlay}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackDownload("googleplay")}
          className={`${baseBtn} ${googleStyle} min-w-45 px-6 py-3.5`}
          aria-label="Google Play에서 다운로드"
        >
          <PlayIcon className="h-6 w-auto" />
          <span>Google Play</span>
        </a>
      </div>
    </div>
  );
}
