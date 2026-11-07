"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** 닫힘 화면에 둔다. 부스 노트북은 하루 종일 켜 두니, 운영 시간이 되거나 어드민에서 다시 열면 저절로 촬영 화면으로 바뀌게(#221) */
export default function AutoRefresh({ ms }: { ms: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), ms);
    return () => window.clearInterval(id);
  }, [ms, router]);
  return null;
}
