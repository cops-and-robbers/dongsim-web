"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const ANDROID_PACKAGE = "com.elipair.copsandrobbers";
// 외부 브라우저로 빠져나갈 수단이 없는 인앱 브라우저 — 수동 안내로 유도한다
const NO_ESCAPE_BROWSERS = /instagram|fbav|fb_iab|daangn|karrot|threads/i;

export default function JoinBridge({
  code,
  platform,
  appStore,
  playStore,
  children,
}: {
  code: string;
  platform: "ios" | "android" | "other";
  appStore: string;
  playStore: string;
  children: ReactNode;
}) {
  const [showEscapeGuide, setShowEscapeGuide] = useState(false);
  const hasAttemptedRef = useRef(false);

  const openApp = useCallback(() => {
    const userAgent = navigator.userAgent;
    const currentUrl = window.location.href;
    // 앱은 코드를 그대로 받으므로(형식 검증 없음) 원본을 인코딩만 해서 넘긴다
    const encodedCode = encodeURIComponent(code);

    // 인앱 브라우저는 외부 브라우저로 빠져나간다(빠져나간 뒤 이 로직이 다시 실행됨)
    if (/kakaotalk/i.test(userAgent)) {
      window.location.href =
        "kakaotalk://web/openExternal?url=" + encodeURIComponent(currentUrl);
      return;
    }
    if (/line/i.test(userAgent)) {
      window.location.href =
        currentUrl + (currentUrl.includes("?") ? "&" : "?") + "openExternalBrowser=1";
      return;
    }
    if (NO_ESCAPE_BROWSERS.test(userAgent)) {
      setShowEscapeGuide(true);
      return;
    }

    // 일반 브라우저는 설치된 앱을 직접 실행한다(미설치 시 스토어로 폴백)
    if (platform === "android") {
      // 검증된 https App Links를 intent로 호출 → 설치 시 앱, 미설치 시 browser_fallback_url
      window.location.href =
        `intent://copsnro66ers.site/join/${encodedCode}` +
        `#Intent;scheme=https;package=${ANDROID_PACKAGE};` +
        `S.browser_fallback_url=${encodeURIComponent(playStore)};end`;
      return;
    }
    if (platform === "ios") {
      let appOpened = false;
      const handleVisibilityChange = () => {
        if (document.hidden) appOpened = true;
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.location.href = `copsandrobbers://join/${encodedCode}`;
      window.setTimeout(() => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        if (!appOpened) window.location.href = appStore;
      }, 1500);
    }
  }, [code, platform, appStore, playStore]);

  // 진입 시 1회 자동 실행(데스크톱·코드 없음 제외). 폴백 UI를 먼저 그린 뒤 다음 틱에 시도
  useEffect(() => {
    if (hasAttemptedRef.current) return;
    hasAttemptedRef.current = true;
    if (platform === "other" || !code) return;
    const timer = window.setTimeout(openApp, 0);
    return () => window.clearTimeout(timer);
  }, [openApp, platform, code]);

  const showOpenButton = platform !== "other" && Boolean(code);

  return (
    <div className="mt-8 flex w-full flex-col gap-3">
      {showOpenButton && (
        <button
          type="button"
          onClick={openApp}
          className="inline-flex w-full items-center justify-center rounded-xl bg-brand-blue px-6 py-3.5 text-base font-bold text-white shadow-sm transition-colors duration-200 hover:bg-brand-blue-light dark:bg-brand-green dark:text-app-black dark:hover:bg-brand-green-light"
        >
          앱에서 열기
        </button>
      )}
      {children}
      {showEscapeGuide && (
        <p className="mt-1 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10">
          인앱 브라우저에서는 앱으로 바로 열 수 없어요. 우측 상단 메뉴(⋯)에서{" "}
          <b className="font-bold text-slate-700 dark:text-slate-200">
            ‘다른 브라우저로 열기’
          </b>
          (Safari·Chrome)를 선택해 주세요.
        </p>
      )}
    </div>
  );
}
