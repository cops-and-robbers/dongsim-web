"use client";

import { CHROME } from "@/lib/i18n/chrome";
import { useLocale } from "@/components/i18n/LocaleProvider";

// 접근성 - 키보드 사용자가 반복되는 헤더를 건너뛰고 본문으로 바로 이동.
// 평소엔 숨겨져 있다가 Tab 포커스가 닿으면 나타난다.
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-blue focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none dark:focus:bg-brand-green dark:focus:text-app-black"
    >
      {CHROME[useLocale()].skipToContent}
    </a>
  );
}
