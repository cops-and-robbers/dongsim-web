// 웹에서 앱을 여는 브릿지 로직 (#101).
//
// 인앱 브라우저는 OS 의 App Links/Universal Links 를 트리거하지 않으므로,
// 커스텀 스킴으로 직접 앱을 깨우거나 외부 브라우저로 탈출시켜야 한다.
// /join 의 JoinBridge 에서 검증된 흐름을 페이지와 무관하게 재사용할 수 있게
// 뽑아낸 것 - JoinBridge 자체의 통합은 후속 과제(#101 참고).

import { APP_LINKS } from "@/lib/constants";

const ANDROID_PACKAGE = "com.elipair.copsandrobbers";
// 외부 브라우저로 빠져나갈 수단이 없는 인앱 브라우저 - 수동 안내로 유도한다
const NO_ESCAPE_BROWSERS = /instagram|fbav|fb_iab|daangn|karrot|threads/i;

export type BridgeResult =
  /** 외부 브라우저로 탈출시킴 - 외부에서 다시 열리면 그때 앱 실행이 이어진다 */
  | "escaped"
  /** 탈출 수단이 없는 인앱 - 호출부가 수동 안내를 보여줘야 한다 */
  | "guide"
  /** 앱 실행을 시도함 (미설치 시 스토어 폴백까지 이 안에서 처리) */
  | "attempted"
  /** 모바일이 아님 - 호출부가 다운로드 안내 등으로 처리한다 */
  | "desktop";

/**
 * [appPath] 의 앱 화면을 연다. 예: "join/ABC123", "open/community/10"
 * (커스텀 스킴 `copsandrobbers://{appPath}` 로 조립된다 - 앱 매니페스트가
 * host=join / host=open 두 형태를 받는다)
 */
export function openInApp(appPath: string): BridgeResult {
  const userAgent = navigator.userAgent;
  const currentUrl = window.location.href;

  // 1) 인앱 브라우저는 외부 브라우저로 탈출한다 (탈출 후 이 로직이 다시 실행됨)
  if (/kakaotalk/i.test(userAgent)) {
    window.location.href =
      "kakaotalk://web/openExternal?url=" + encodeURIComponent(currentUrl);
    return "escaped";
  }
  if (/line/i.test(userAgent)) {
    window.location.href =
      currentUrl + (currentUrl.includes("?") ? "&" : "?") + "openExternalBrowser=1";
    return "escaped";
  }
  if (NO_ESCAPE_BROWSERS.test(userAgent)) {
    return "guide";
  }

  // 2) 일반 브라우저는 설치된 앱을 직접 실행한다 (미설치 시 스토어 폴백)
  const isAndroid = /android/i.test(userAgent);
  const isIos = /iphone|ipad|ipod/i.test(userAgent);

  if (isAndroid) {
    // intent: 도메인 검증과 무관하게 설치 시 앱, 미설치 시 browser_fallback_url
    window.location.href =
      `intent://${appPath}` +
      `#Intent;scheme=copsandrobbers;package=${ANDROID_PACKAGE};` +
      `S.browser_fallback_url=${encodeURIComponent(APP_LINKS.googlePlay)};end`;
    return "attempted";
  }
  if (isIos) {
    let appOpened = false;
    const handleVisibilityChange = () => {
      if (document.hidden) appOpened = true;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.location.href = `copsandrobbers://${appPath}`;
    window.setTimeout(() => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (!appOpened) window.location.href = APP_LINKS.appStore;
    }, 1500);
    return "attempted";
  }

  return "desktop";
}
