// 어드민 토큰/프로필 저장소.
// 지금은 localStorage에 둔다(간단 시작). refreshToken은 이후 httpOnly 쿠키로 옮기는 것을 권장.
// firebase 의존 없음 - Relay 네트워크 계층에서도 안전하게 import 가능.

const ACCESS_KEY = "cnr_admin_access";
const REFRESH_KEY = "cnr_admin_refresh";
const PROFILE_KEY = "cnr_admin_profile";

export type AdminProfile = {
  userId: number;
  nickname: string;
  role: string;
};

export type Tokens = { accessToken: string; refreshToken: string };

let accessMem: string | null = null;

export function setTokens(t: Tokens): void {
  accessMem = t.accessToken;
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_KEY, t.accessToken);
  localStorage.setItem(REFRESH_KEY, t.refreshToken);
}

export function getAccessToken(): string | null {
  if (accessMem) return accessMem;
  if (typeof window === "undefined") return null;
  return (accessMem = localStorage.getItem(ACCESS_KEY));
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function clearTokens(): void {
  accessMem = null;
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

export function setStoredProfile(p: AdminProfile | null): void {
  if (typeof window === "undefined") return;
  if (p) localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  else localStorage.removeItem(PROFILE_KEY);
}

export function getStoredProfile(): AdminProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminProfile;
  } catch {
    return null;
  }
}
