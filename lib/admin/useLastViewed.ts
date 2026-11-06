"use client";

import { useSyncExternalStore } from "react";
import { parseRecent, readRecentRaw, recentHref } from "@/lib/admin/recentViewed";

// 표 한 화면에 줄이 수십 개라, 저장된 글자가 그대로면 다시 풀지 않고 함께 쓴다
let cachedRaw: string | null = null;
let cachedHrefs = new Set<string>();

// 기록은 최근 것이 맨 앞이다. 종류(열린 방, 지난 게임, 유저)마다 맨 앞 하나만 고른다
function lastHrefs(raw: string | null) {
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    const kinds = new Set<string>();
    cachedHrefs = new Set();
    for (const item of parseRecent(raw)) {
      if (kinds.has(item.kind)) continue;
      kinds.add(item.kind);
      cachedHrefs.add(recentHref(item));
    }
  }
  return cachedHrefs;
}

// 새 탭으로 연 상세가 기록되면 열어 둔 목록에도 바로 반영된다(storage 는 다른 탭에서 바꿀 때 온다)
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** 이 주소가 그 종류에서 마지막으로 열어 본 상세인지. 게임, 지난 게임, 유저 상세가 아니면 늘 false 다. */
export function useLastViewed(href?: string) {
  const raw = useSyncExternalStore(subscribe, readRecentRaw, () => null);
  return href !== undefined && lastHrefs(raw).has(href);
}
