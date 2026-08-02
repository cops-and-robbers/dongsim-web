"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { BRAND_NAME, localizedPath, logoSrc } from "@/lib/i18n/config";
import { CHROME } from "@/lib/i18n/chrome";
import { useLocale } from "@/components/i18n/LocaleProvider";
import NavLink from "./NavLink";
import DownloadCTAButton from "./DownloadCTAButton";
import MobileMenu from "./MobileMenu";

// 로케일 인식 헤더 - 로고는 로케일 × 다크모드로 교체, 내비는 언어별 항목.
// 루트 레이아웃이 정적이라 경로 기반(useLocale)으로 언어를 감지한다.
export default function Header() {
  const locale = useLocale();
  const chrome = CHROME[locale];
  const brand = BRAND_NAME[locale];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-colors duration-500 dark:border-white/10 dark:bg-app-black/80">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 md:h-16 md:px-6">
        <Link
          href={localizedPath("/", locale)}
          aria-label={`${brand} 홈`}
          className="flex items-center"
        >
          <img
            src={logoSrc(locale, false)}
            alt={brand}
            className="h-5 w-auto md:h-6 dark:hidden"
          />
          <img
            src={logoSrc(locale, true)}
            alt={brand}
            className="hidden h-5 w-auto md:h-6 dark:block"
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {chrome.nav.map((item) => (
            <NavLink key={item.path} href={localizedPath(item.path, locale)}>
              {item.label}
            </NavLink>
          ))}
          <DownloadCTAButton />
        </nav>

        <div className="flex items-center gap-1.5 md:hidden">
          <DownloadCTAButton />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
