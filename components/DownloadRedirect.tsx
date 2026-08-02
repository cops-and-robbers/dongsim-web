"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import DownloadButtons from "@/components/ui/DownloadButtons";
import { APP_LINKS } from "@/lib/constants";
import { BRAND_NAME, appIconSrc, type Locale } from "@/lib/i18n/config";

// 이 페이지는 로케일 접두어 없는 /download 하나뿐이라(부스 QR용, noindex),
// 브라우저 언어로 문구를 고른다. 한국어 서비스라 미지정 언어는 영어로.
const DOWNLOAD_TEXT: Record<Locale, { redirecting: string; fallback: string }> =
  {
    ko: { redirecting: "스토어로 이동 중…", fallback: "스토어에서 무료로 받으세요" },
    en: {
      redirecting: "Taking you to the store…",
      fallback: "Get it free from the store",
    },
    ja: {
      redirecting: "ストアへ移動中…",
      fallback: "ストアから無料でダウンロード",
    },
  };

function localeFromBrowser(): Locale {
  if (typeof navigator === "undefined") return "ko";
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("ja")) return "ja";
  if (lang.startsWith("ko")) return "ko";
  return "en";
}

// 브라우저 언어는 서버/클라이언트에서 값이 다르고 이후 바뀌지 않는 "외부 값"이라
// useSyncExternalStore로 읽는다: 구독은 no-op(변화 없음), 서버 스냅샷은 ko.
// effect에서 setState로 교정하는 방식과 달리 재렌더가 한 번 덜 돌고 경고도 없다.
const noopSubscribe = () => () => {};

function useBrowserLocale(): Locale {
  return useSyncExternalStore(noopSubscribe, localeFromBrowser, () => "ko");
}

/**
 * 기기에 맞는 스토어로 자동 이동시키는 다운로드 랜딩.
 * - iOS → App Store, Android → Google Play 로 리다이렉트
 * - 그 외(PC 등) → 두 스토어 버튼을 보여주는 폴백
 * 부스 QR(`/download`)이 이 페이지를 가리켜, 어떤 폰으로 찍어도 알맞은 스토어로 간다.
 */
export default function DownloadRedirect() {
  const [fallback, setFallback] = useState(false);
  const locale = useBrowserLocale();
  const text = DOWNLOAD_TEXT[locale];

  useEffect(() => {
    const ua = navigator.userAgent || "";
    if (/iPad|iPhone|iPod/.test(ua)) {
      window.location.replace(APP_LINKS.appStore);
      return;
    }
    if (/Android/i.test(ua)) {
      window.location.replace(APP_LINKS.googlePlay);
      return;
    }
    const t = window.setTimeout(() => setFallback(true), 0);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-white px-6 text-center transition-colors duration-500 dark:bg-app-black">
      <Image
        src={appIconSrc(locale)}
        alt=""
        width={96}
        height={96}
        unoptimized
        className="h-24 w-24 rounded-3xl shadow-lg ring-1 ring-black/5 dark:ring-white/10"
      />
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {BRAND_NAME[locale]}
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          {fallback ? text.fallback : text.redirecting}
        </p>
      </div>
      {fallback && <DownloadButtons />}
    </main>
  );
}
