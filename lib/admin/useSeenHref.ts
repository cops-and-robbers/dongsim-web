"use client";

import { useSyncExternalStore } from "react";
import { parseRecent, readRecentRaw, recentHref } from "@/lib/admin/recentViewed";

// 표 한 화면에 줄이 수십 개라, 저장된 글자가 그대로면 다시 풀지 않고 함께 쓴다
let cachedRaw: string | null = null;
let cachedHrefs = new Set<string>();

function seenHrefs(raw: string | null) {
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedHrefs = new Set(parseRecent(raw).map(recentHref));
  }
  return cachedHrefs;
}

// 새 탭으로 연 상세가 기록되면 열어 둔 목록에도 바로 반영된다(storage 는 다른 탭에서 바꿀 때 온다)
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** 이 주소의 상세를 이미 봤는지. 게임, 지난 게임, 유저 상세가 아니면 늘 false 다. */
export function useSeenHref(href?: string) {
  const raw = useSyncExternalStore(subscribe, readRecentRaw, () => null);
  return href !== undefined && seenHrefs(raw).has(href);
}
