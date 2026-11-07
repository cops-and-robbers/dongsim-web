"use client";

// 나라별 사용자 비율을 한 번 읽어 화면 전체가 같이 쓴다(#217). 토큰이 만료됐으면 한 번 재발급하고 다시 묻는다(webgameClient 와 같은 방식).
import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";

export type UserCountries = { from: string; to: string; total: number; countries: { country: string; count: number }[] };

let cached: Promise<UserCountries | null> | null = null;

async function load(): Promise<UserCountries | null> {
  const send = () => fetch("/api/admin/metrics/user-countries", { headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` } });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  if (!res.ok) return null;
  return (await res.json()) as UserCountries;
}

/** 못 읽으면 null. 비율 없이 기본 지역만 그리면 되므로 화면을 막지 않는다 */
export function useUserCountries(): UserCountries | null | undefined {
  const [data, setData] = useState<UserCountries | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    cached ??= load().catch(() => null);
    cached.then((d) => {
      if (alive) setData(d);
      // 실패했으면 다음에 다시 읽게 비워 둔다
      if (!d) cached = null;
    });
    return () => {
      alive = false;
    };
  }, []);
  return data;
}
