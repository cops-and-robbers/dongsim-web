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

  // 새로고침 복구: 토큰과 프로필이 남아 있으면 로그인 상태로 간주한다.
  useEffect(() => {
    const token = getAccessToken();
    const stored = getStoredProfile();
    if (token && stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(stored);
      setStatus("authed");
    } else {
      setStatus("unauthed");
    }
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
