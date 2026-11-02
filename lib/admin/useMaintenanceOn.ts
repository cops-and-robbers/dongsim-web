"use client";

import { useEffect, useState } from "react";
import { APP_CONFIG_CHANGED_EVENT, fetchMaintenance } from "@/lib/admin/appConfigClient";

const REFRESH_MS = 5 * 60_000;

/**
 * 앱이 점검 중인지. 메뉴에 "점검 중"을 띄운다.
 *
 * 점검은 켜 두고 잊으면 사용자 전체가 막히는데, 앱 설정 화면을 나가면 알 길이 없어 어느 화면에서나 보이게 한다.
 * 읽지 못하면 표시하지 않는다(서비스 계정이 없는 환경 포함). 메뉴가 깨지면 안 된다.
 */
export function useMaintenanceOn() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    let active = true;
    const read = () => {
      fetchMaintenance()
        .then((r) => {
          if (active) setOn(r.maintenance);
        })
        .catch(() => {});
    };
    const tick = () => {
      if (document.visibilityState === "visible") read();
    };

    read();
    const timer = window.setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener(APP_CONFIG_CHANGED_EVENT, read);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener(APP_CONFIG_CHANGED_EVENT, read);
    };
  }, []);

  return on;
}
