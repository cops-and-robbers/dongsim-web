"use client";

/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from "react";
import { useAdminAuth } from "./AuthProvider";
import { Callout } from "@/components/admin/Callout";
import { SocialIcon } from "@/components/admin/icons";

// 어드민 진입 게이트 화면. 구글·애플 로그인만 제공한다.
export default function LoginScreen() {
  const { login, pending, error } = useAdminAuth();
  const busy = pending !== null;

  return (
    <div className="admin-shell fixed inset-0 z-50 flex items-center justify-center bg-sd-fill px-6 text-sd-fg">
      <div className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-sd-line bg-sd-surface px-8 py-10 text-center">
        <img src="/brand/header-logo.svg" alt="경찰과 도둑" className="h-8 w-auto" />
        <p className="mt-5 text-[14px] text-sd-fg-subtle">
          관리자 계정으로 로그인해 주세요.
        </p>

        <div className="mt-8 flex w-full flex-col gap-2.5">
          <SocialButton
            onClick={() => login("GOOGLE")}
            disabled={busy}
            icon={<SocialIcon type="GOOGLE" className="h-[18px] w-[18px]" />}
          >
            {pending === "GOOGLE" ? "로그인 중..." : "Google로 로그인"}
          </SocialButton>
          <SocialButton
            onClick={() => login("APPLE")}
            disabled={busy}
            icon={<SocialIcon type="APPLE" className="h-[18px] w-[18px]" />}
          >
            {pending === "APPLE" ? "로그인 중..." : "Apple로 로그인"}
          </SocialButton>
        </div>

        {error && (
          <div className="mt-5 w-full">
            <Callout variant="danger">{error}</Callout>
          </div>
        )}
      </div>
    </div>
  );
}

function SocialButton({
  onClick,
  disabled,
  icon,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-sd-line bg-sd-fill px-4 py-3 text-[15px] font-semibold text-sd-fg transition hover:bg-sd-pressed active:bg-sd-selected disabled:cursor-not-allowed disabled:opacity-60"
    >
      {icon}
      {children}
    </button>
  );
}

