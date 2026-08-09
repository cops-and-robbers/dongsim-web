"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RelayEnvironmentProvider } from "react-relay";
import { createEnvironment } from "@/lib/relay/environment";
import { AuthProvider, useAdminAuth } from "@/components/admin/AuthProvider";
import LoginScreen from "@/components/admin/LoginScreen";

// 어드민 클라이언트 부트스트랩:
// 1) dev에서 MSW 목 워커를 먼저 켠다(데이터 조회는 아직 목, 로그인만 실서버).
// 2) 워커가 준비된 뒤에만 Relay 쿼리를 실행하도록 children을 게이트한다.
// 3) 로그인 여부에 따라 로그인 화면 또는 어드민 본문을 보여준다.
export default function AdminProviders({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function boot() {
      if (process.env.NODE_ENV !== "production") {
        const { worker } = await import("@/lib/admin-mock/browser");
        await worker.start({ onUnhandledRequest: "bypass", quiet: true });
      }
      if (active) setReady(true);
    }
    boot();
    return () => {
      active = false;
    };
  }, []);

  if (!ready) return <BootSplash />;

  return (
    <AuthProvider>
      <AuthGate>{children}</AuthGate>
    </AuthProvider>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAdminAuth();
  const [environment] = useState(createEnvironment);

  if (status === "loading") return <BootSplash />;
  if (status === "unauthed") return <LoginScreen />;

  return (
    <RelayEnvironmentProvider environment={environment}>
      {children}
    </RelayEnvironmentProvider>
  );
}

function BootSplash() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sd-fill">
      <div className="flex flex-col items-center gap-3.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/characters/police.svg" alt="" className="pb-bob h-12 w-auto" />
        <span className="text-[13px] font-semibold text-sd-fg-subtle">
          어드민을 준비하고 있어요
        </span>
      </div>
    </div>
  );
}
