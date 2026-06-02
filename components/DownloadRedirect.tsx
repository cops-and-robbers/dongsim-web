"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import DownloadButtons from "@/components/ui/DownloadButtons";
import { APP_LINKS, BRAND } from "@/lib/constants";

/**
 * 기기에 맞는 스토어로 자동 이동시키는 다운로드 랜딩.
 * - iOS → App Store, Android → Google Play 로 리다이렉트
 * - 그 외(PC 등) → 두 스토어 버튼을 보여주는 폴백
 * 부스 QR(`/download`)이 이 페이지를 가리켜, 어떤 폰으로 찍어도 알맞은 스토어로 간다.
 */
export default function DownloadRedirect() {
  const [fallback, setFallback] = useState(false);

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
        src="/brand/app-icon.svg"
        alt=""
        width={96}
        height={96}
        unoptimized
        className="h-24 w-24 rounded-3xl shadow-lg ring-1 ring-black/5 dark:ring-white/10"
      />
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {BRAND.game}
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          {fallback ? "스토어에서 무료로 받으세요" : "스토어로 이동 중…"}
        </p>
      </div>
      {fallback && <DownloadButtons />}
    </main>
  );
}
