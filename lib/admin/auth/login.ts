"use client";

// 소셜 로그인 → Firebase idToken → 백엔드 어드민 로그인 → JWT 토큰 저장.
// 구글·애플 모두 Firebase 경유(백엔드가 verifyIdToken으로 검증).
import { signInWithPopup, type AuthProvider } from "firebase/auth";
import { auth, googleProvider, appleProvider } from "@/lib/firebase";
import {
  setTokens,
  clearTokens,
  getRefreshToken,
  type AdminProfile,
} from "./tokens";
import { adminAuthUrl } from "./session";

export type SocialPlatform = "GOOGLE" | "APPLE";

const PROVIDERS: Record<SocialPlatform, AuthProvider> = {
  GOOGLE: googleProvider,
  APPLE: appleProvider,
};

type AdminLoginResponse = {
  userId: number;
  nickname: string;
  role: string;
  tokens: { accessToken: string; refreshToken: string };
};

export async function loginWithSocial(
  platform: SocialPlatform
): Promise<AdminProfile> {
  const cred = await signInWithPopup(auth, PROVIDERS[platform]);
  const idToken = await cred.user.getIdToken();

  const res = await fetch(adminAuthUrl("/api/auth/admin/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ socialPlatform: platform, idToken }),
  });

  if (!res.ok) {
    // 파베 로그인은 됐지만 백엔드가 거절한 경우. 파베 세션은 정리한다.
    await auth.signOut().catch(() => {});
    if (res.status === 403) {
      throw new Error("관리자 권한이 없는 계정이에요.");
    }
    if (res.status === 401) {
      throw new Error("인증에 실패했어요. 다시 시도해 주세요.");
    }
    throw new Error("로그인에 실패했어요. 잠시 후 다시 시도해 주세요.");
  }

  const data = (await res.json()) as AdminLoginResponse;
  setTokens(data.tokens);
  return { userId: data.userId, nickname: data.nickname, role: data.role };
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    await fetch(adminAuthUrl("/api/auth/admin/logout"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {});
  }
  clearTokens();
  await auth.signOut().catch(() => {});
}
