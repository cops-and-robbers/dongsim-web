"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  loginWithSocial,
  logout as apiLogout,
  type SocialPlatform,
} from "@/lib/admin/auth/login";
import { reissue, SESSION_EXPIRED_EVENT } from "@/lib/admin/auth/session";
import {
  getAccessToken,
  getStoredProfile,
  setStoredProfile,
  type AdminProfile,
} from "@/lib/admin/auth/tokens";

type Status = "loading" | "authed" | "unauthed";

type AuthContextValue = {
  status: Status;
  profile: AdminProfile | null;
  pending: SocialPlatform | null;
  error: string | null;
  login: (platform: SocialPlatform) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAdminAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [pending, setPending] = useState<SocialPlatform | null>(null);
  const [error, setError] = useState<string | null>(null);

  /*
    새로고침 복구 (#109 UX). 토큰과 프로필이 남아 있으면 일단 로그인 상태로
    보여주되, 그 세션이 살아 있는지는 뒤에서 확인한다.

    저장된 값만 믿으면 만료된 세션으로도 어드민 프레임이 멀쩡히 뜨고,
    화면마다 요청이 조용히 실패하는 "로그인됐는데 아무것도 안 나오는" 상태가
    된다 (실사용 보고). 그렇다고 확인이 끝날 때까지 로딩을 보여주는 것은
    정상 세션(대부분의 경우)에게 매번 값을 물리는 일이라, 낙관적으로 띄우고
    뒤에서 재발급을 한 번 돌린다 - 서버가 거부하면 session.ts 가 만료 이벤트를
    쏘고 아래 리스너가 로그인 화면으로 보낸다. 네트워크 오류는 쫓아내지 않는다.
  */
  useEffect(() => {
    const token = getAccessToken();
    const stored = getStoredProfile();
    if (token && stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(stored);
      setStatus("authed");
      void reissue();
    } else {
      setStatus("unauthed");
    }
  }, []);

  // 세션 만료 신호 - 부팅 검증이든 사용 중 401 재시도든, 죽으면 여기로 모인다
  useEffect(() => {
    const onExpired = () => {
      setStoredProfile(null);
      setProfile(null);
      setStatus("unauthed");
      setError("세션이 만료됐어요. 다시 로그인해 주세요.");
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const isPopupCancel = (e: unknown) => {
    const code = (e as { code?: string })?.code;
    return (
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request"
    );
  };

  const login = useCallback(async (platform: SocialPlatform) => {
    setPending(platform);
    setError(null);
    try {
      const p = await loginWithSocial(platform);
      setStoredProfile(p);
      setProfile(p);
      setStatus("authed");
    } catch (e) {
      if (!isPopupCancel(e)) {
        setError(e instanceof Error ? e.message : "로그인에 실패했어요.");
      }
    } finally {
      setPending(null);
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setStoredProfile(null);
    setProfile(null);
    setStatus("unauthed");
  }, []);

  return (
    <AuthContext.Provider
      value={{ status, profile, pending, error, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
