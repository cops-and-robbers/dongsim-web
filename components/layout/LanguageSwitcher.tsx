"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LOCALES,
  LOCALE_LABEL,
  isKoOnlyPath,
  localizedPath,
  stripLocale,
  type Locale,
} from "@/lib/i18n/config";
import { CHROME } from "@/lib/i18n/chrome";
import { useLocale } from "@/components/i18n/LocaleProvider";

function GlobeIcon({ className }: { className?: string }) {
  // 둥글고 미니멀한 지구본 - 적도 1선 + 자오선 타원, 라운드 캡으로 부드럽게.
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <ellipse cx="12" cy="12" rx="3.7" ry="8.5" />
    </svg>
  );
}

// 언어 선택 - 푸터에 조용히 배치. 자주 바꾸지 않는 항목이라 눈에 띄지 않는 톤.
// 대상 URL은 현재 페이지의 로케일 접두어만 바꿔 만든다(미번역 경로는 proxy가 처리).
export default function LanguageSwitcher() {
  const locale = useLocale();
  const base = stripLocale(usePathname());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={CHROME[locale].languageLabel}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:ring-white/10 dark:hover:bg-white/10 dark:hover:text-slate-100"
      >
        <GlobeIcon className="h-3.5 w-3.5" />
        <span>{LOCALE_LABEL[locale]}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 w-36 overflow-hidden rounded-xl bg-white py-1 shadow-xl ring-1 ring-slate-200 dark:bg-app-black-900 dark:ring-white/10"
        >
          {LOCALES.map((l: Locale) => (
            <Link
              key={l}
              // 번역이 없는 한국어 전용 페이지에서 다른 언어로 바꾸면 그 언어 홈으로.
              href={localizedPath(
                l === "ko" || !isKoOnlyPath(base) ? base : "/",
                l,
              )}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`flex items-center justify-between px-3.5 py-2 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${
                l === locale
                  ? "font-bold text-brand-blue dark:text-brand-green"
                  : "text-slate-700 dark:text-slate-200"
              }`}
            >
              {LOCALE_LABEL[l]}
              {l === locale && (
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  aria-hidden="true"
                  fill="none"
                >
                  <path
                    d="M5 12.5l4.2 4.2L19 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
