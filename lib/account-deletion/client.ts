"use client";

import type { UserCredential } from "firebase/auth";
import {
  AccountDeletionError,
  firebaseErrorKind,
  statusErrorKind,
} from "./errors";

export type DeletionPlatform = "GOOGLE" | "APPLE";

export type DeletionSession = {
  nickname: string;
  inActiveGame: boolean;
  confirm: () => Promise<void>;
  cancel: () => Promise<void>;
};

type WithdrawalPreview = {
  nickname: string;
  inActiveGame: boolean;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.copsandrobbers.app";

type FirebaseModules = {
  sdk: typeof import("firebase/auth");
  app: typeof import("@/lib/firebase");
};

let firebaseModules: Promise<FirebaseModules> | null = null;

function loadFirebase(): Promise<FirebaseModules> {
  firebaseModules ??= Promise.all([
    import("firebase/auth"),
    import("@/lib/firebase"),
  ])
    .then(([sdk, app]) => ({ sdk, app }))
    .catch((error) => {
      firebaseModules = null;
      throw error;
    });
  return firebaseModules;
}

// 사파리는 클릭 뒤 시간이 지나면 팝업을 막는다. 첫 화면에는 싣지 않되,
// 버튼을 누르기 전에 받아 두어 클릭과 팝업 사이에 다운로드가 끼지 않게 한다.
export function preloadFirebase(): void {
  loadFirebase().catch(() => {});
}

async function postWithdrawal<T>(
  path: string,
  platform: DeletionPlatform,
  idToken: string,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ socialPlatform: platform, idToken }),
  });
  if (!response.ok) {
    throw new AccountDeletionError(statusErrorKind(response.status));
  }
  return response.json() as Promise<T>;
}

/**
 * 소셜 로그인 후 삭제할 계정을 확인한다.
 * 사용자가 로그인 창을 닫으면 null 을 돌려준다.
 */
export async function startAccountDeletion(
  platform: DeletionPlatform,
): Promise<DeletionSession | null> {
  const { sdk, app } = await loadFirebase();
  const auth = app.getFirebaseAuth();
  const provider =
    platform === "GOOGLE"
      ? app.createGoogleProvider()
      : app.createAppleProvider();

  let credential: UserCredential;
  try {
    credential = await sdk.signInWithPopup(auth, provider);
  } catch (error) {
    const kind = firebaseErrorKind((error as { code?: string }).code);
    if (kind === "cancelled") return null;
    throw new AccountDeletionError(kind);
  }

  const signOut = () => auth.signOut().catch(() => {});

  async function revokeAppleToken(): Promise<void> {
    const accessToken =
      sdk.OAuthProvider.credentialFromResult(credential)?.accessToken;
    if (!accessToken) throw new AccountDeletionError("failed");
    await sdk.revokeAccessToken(auth, accessToken);
  }

  async function confirm(): Promise<void> {
    try {
      // 애플 연결은 Firebase 계정이 있어야 끊을 수 있어서 삭제보다 먼저 한다.
      if (platform === "APPLE") await revokeAppleToken();
      await postWithdrawal(
        "/api/auth/withdrawal",
        platform,
        await credential.user.getIdToken(),
      );
    } finally {
      await signOut();
    }
  }

  try {
    const preview = await postWithdrawal<WithdrawalPreview>(
      "/api/auth/withdrawal/preview",
      platform,
      await credential.user.getIdToken(),
    );
    return { ...preview, confirm, cancel: signOut };
  } catch (error) {
    await signOut();
    throw error;
  }
}
