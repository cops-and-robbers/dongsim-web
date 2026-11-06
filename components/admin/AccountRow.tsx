"use client";

import { ThemeSwitch } from "@/components/admin/ThemeSwitch";
import { useAdminAuth } from "@/components/admin/AuthProvider";

// 닉네임, 테마, 로그아웃 한 줄. 데스크톱 사이드바 바닥과 폰 전체 메뉴 바닥이 같이 쓴다
export function AccountRow() {
  const { profile, logout } = useAdminAuth();
  return (
    <div className="flex min-w-0 items-center gap-2">
      <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-sd-fg">{profile?.nickname ?? "관리자"}</p>
      <ThemeSwitch />
      <button
        type="button"
        onClick={() => logout()}
        className="shrink-0 rounded-lg px-2 py-1 text-[12px] font-semibold text-sd-fg-subtle outline-none transition hover:bg-sd-pressed hover:text-sd-critical focus-visible:ring-2 focus-visible:ring-accent"
      >
        로그아웃
      </button>
    </div>
  );
}
