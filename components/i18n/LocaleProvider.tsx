"use client";

import { createContext, useContext, useEffect } from "react";
import { usePathname } from "next/navigation";
import { HTML_LANG, localeFromPathname, type Locale } from "@/lib/i18n/config";

// 현재 경로(/en·/ja·루트)로 로케일을 판별해 공통 UI에 제공한다.
// 루트 레이아웃은 정적이라 로케일을 모르므로, 클라이언트에서 경로 기반으로 감지한다.
// <html lang>도 여기서 로케일에 맞춰 갱신한다. (검색엔진 언어 신호는 hreflang이 담당)
const LocaleContext = createContext<Locale>("ko");

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export default function LocaleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = localeFromPathname(usePathname());

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[locale];
  }, [locale]);

  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}
