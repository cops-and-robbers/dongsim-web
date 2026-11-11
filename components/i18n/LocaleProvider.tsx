"use client";

import { createContext, useContext, useEffect } from "react";
import { usePathname } from "next/navigation";
import { HTML_LANG, localeFromPathname, type Locale } from "@/lib/i18n/config";

// 현재 경로(/en·/ja·루트)로 로케일을 판별해 공통 UI에 제공한다.
// <html lang> 은 언어별 루트 레이아웃이 서버에서 내보낸다(#301). 여기서 다시 맞추는 건
// 어떤 라우트에도 없는 주소의 404(global-not-found) 때문이다. 그 화면은 서버가 주소를 몰라 ko 로 나간다.
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
