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
  preview,
  children,
}: {
  code: string;
  platform: "ios" | "android" | "other";
  appStore: string;
  playStore: string;
  // ?ui= 로 특정 상태 UI를 미리보기(자동 핸드오프 비활성)
  preview?: "open" | "guide" | "store";
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
      // 커스텀 스킴을 intent로 호출 → 도메인 검증과 무관하게 설치 시 앱, 미설치 시 browser_fallback_url
      window.location.href =
        `intent://join/${encodedCode}` +
        `#Intent;scheme=copsandrobbers;package=${ANDROID_PACKAGE};` +
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

  // 진입 시 1회 자동 실행(데스크톱·코드 없음·프리뷰 제외). 폴백 UI를 먼저 그린 뒤 다음 틱에 시도
  useEffect(() => {
    if (preview || hasAttemptedRef.current) return;
    hasAttemptedRef.current = true;
    if (platform === "other" || !code) return;
    const timer = window.setTimeout(openApp, 0);
    return () => window.clearTimeout(timer);
  }, [openApp, platform, code, preview]);

  const showGuide = preview ? preview === "guide" : showEscapeGuide;
  const showOpenButton = preview
    ? preview === "open"
    : platform !== "other" && Boolean(code);

  return (
    <div className="mt-8 flex w-full flex-col gap-4">
      {showGuide ? (
        <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-left ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-blue/10 text-brand-blue dark:bg-brand-green/15 dark:text-brand-green">
            <ExternalIcon />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              한 단계만 더!
            </p>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              오른쪽 위 ⋯ 에서{" "}
              <b className="font-bold text-slate-700 dark:text-slate-200">
                ‘다른 브라우저로 열기’
              </b>
              를 누르면 게임에 입장돼요.
            </p>
          </div>
        </div>
      ) : (
        showOpenButton && (
          <button
            type="button"
            onClick={openApp}
            className="inline-flex w-full items-center justify-center rounded-xl bg-brand-blue px-6 py-3.5 text-base font-bold text-white shadow-sm transition-colors duration-200 hover:bg-brand-blue-light dark:bg-brand-green dark:text-app-black dark:hover:bg-brand-green-light"
          >
            게임 입장하기
          </button>
        )
      )}

      {/* 앱 미설치 폴백 — 조용한 보조 그룹 */}
      <div className="flex w-full flex-col gap-2.5">
        <div className="flex items-center gap-3 text-xs font-medium text-slate-400 dark:text-slate-500">
          <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          앱이 아직 없다면
          <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
        </div>
        {children}
      </div>
    </div>
  );
}

function ExternalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}
