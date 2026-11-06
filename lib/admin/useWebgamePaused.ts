"use client";

import { useEffect, useState } from "react";
import { WEBGAME_CHANGED_EVENT, fetchWebgame } from "@/lib/admin/webgameClient";

const REFRESH_MS = 5 * 60_000;

/**
 * 온라인 게임이 점검 중인지. 메뉴에 "점검 중"을 띄운다.
 *
 * 앱 점검(useMaintenanceOn)과 같은 까닭이다. 켜 두고 잊으면 아무도 새로 못 들어오는데, 온라인 게임 화면을 나가면 알 길이 없다.
 * 공개 전은 평소 상태라 띄우지 않는다. 읽지 못하면 표시하지 않는다(비밀값이 없는 환경 포함). 메뉴가 깨지면 안 된다.
 */
export function useWebgamePaused() {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let active = true;
    const read = () => {
      fetchWebgame()
        .then((s) => {
          if (active) setPaused(s.mode === "pause");
        })
        .catch(() => {});
    };
    const tick = () => {
      if (document.visibilityState === "visible") read();
    };

    read();
    const timer = window.setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener(WEBGAME_CHANGED_EVENT, read);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener(WEBGAME_CHANGED_EVENT, read);
    };
  }, []);

  return paused;
}
