// 계정 삭제 중 생기는 실패를 안내 문구 종류로 바꾼다.
// Firebase 를 싣지 않고도 테스트할 수 있게 client.ts 와 나눠 둔다.

export type DeletionErrorKind =
  | "session"
  | "notFound"
  | "activeGame"
  | "browser"
  | "otherProvider"
  | "failed";

export class AccountDeletionError extends Error {
  readonly kind: DeletionErrorKind;

  constructor(kind: DeletionErrorKind) {
    super(kind);
    this.kind = kind;
  }
}

export function statusErrorKind(status: number): DeletionErrorKind {
  if (status === 401) return "session";
  if (status === 404) return "notFound";
  if (status === 409) return "activeGame";
  return "failed";
}

/** 사용자가 로그인 창을 닫은 경우는 실패가 아니라서 따로 돌려준다. */
export function firebaseErrorKind(
  code: string | undefined,
): DeletionErrorKind | "cancelled" {
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return "cancelled";
    case "auth/popup-blocked":
    case "auth/operation-not-supported-in-this-environment":
    case "auth/web-storage-unsupported":
      return "browser";
    case "auth/account-exists-with-different-credential":
      return "otherProvider";
    default:
      return "failed";
  }
}

// 구글은 앱 내 브라우저의 로그인을 막고, 애플도 팝업이 열리지 않는 경우가 많다.
const IN_APP_BROWSER =
  /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|everytimeApp|DaumApps|\bLine\/|; wv\)/i;

export function isInAppBrowser(userAgent: string): boolean {
  return IN_APP_BROWSER.test(userAgent);
}
