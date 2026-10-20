"use client";

import { useEffect, useState } from "react";

/**
 * 게임 화면이 예전 상태로 남지 않게 주기적으로 다시 읽을 열쇠.
 *
 * 게임 상태는 앱에서 바뀐다(방장이 시작하면 진행 중, 판이 끝나면 다시 대기 중, 방이 비면 사라짐).
 * 어드민은 Relay 스토어를 세션 내내 하나로 써서 한 번 읽은 목록을 다시 묻지 않아, 화면을 연 뒤 시작한 방이
 * 계속 "대기중"으로 보였다. 이 값을 useLazyLoadQuery 의 fetchKey 에 더하고 fetchPolicy 를
 * "store-and-network" 로 두면, 있던 화면은 그대로 보여 주면서 뒤에서 새로 받아 바꾼다(깜빡임 없음).
 *
 * 화면을 보고 있을 때만 다시 읽고, 다른 탭에 있다 돌아오면 바로 한 번 읽는다
 */
export function useLiveRefresh(intervalMs = 30_000): number {
  const [key, setKey] = useState(0);
  useEffect(() => {
    const bump = () => {
      if (document.visibilityState === "visible") setKey((k) => k + 1);
    };
    const timer = window.setInterval(bump, intervalMs);
    document.addEventListener("visibilitychange", bump);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", bump);
    };
  }, [intervalMs]);
  return key;
}
