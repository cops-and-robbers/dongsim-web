// 계정 삭제 실패 안내 규칙 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  firebaseErrorKind,
  isInAppBrowser,
  statusErrorKind,
} from "./errors.ts";

test("서버 응답 코드를 안내 종류로 바꾼다", () => {
  assert.equal(statusErrorKind(401), "session");
  assert.equal(statusErrorKind(404), "notFound");
  assert.equal(statusErrorKind(409), "activeGame");
  assert.equal(statusErrorKind(400), "failed");
  assert.equal(statusErrorKind(500), "failed");
});

test("로그인 창을 닫으면 실패로 다루지 않는다", () => {
  assert.equal(firebaseErrorKind("auth/popup-closed-by-user"), "cancelled");
  assert.equal(firebaseErrorKind("auth/cancelled-popup-request"), "cancelled");
  assert.equal(firebaseErrorKind("auth/user-cancelled"), "cancelled");
});

test("팝업을 열 수 없으면 브라우저를 바꾸도록 안내한다", () => {
  assert.equal(firebaseErrorKind("auth/popup-blocked"), "browser");
  assert.equal(
    firebaseErrorKind("auth/operation-not-supported-in-this-environment"),
    "browser",
  );
});

test("다른 방법으로 가입한 이메일이면 그 방법을 쓰도록 안내한다", () => {
  assert.equal(
    firebaseErrorKind("auth/account-exists-with-different-credential"),
    "otherProvider",
  );
});

test("알 수 없는 오류는 다시 시도하도록 안내한다", () => {
  assert.equal(firebaseErrorKind("auth/network-request-failed"), "failed");
  assert.equal(firebaseErrorKind(undefined), "failed");
});

test("앱 내 브라우저를 구분한다", () => {
  const inApp = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 KAKAOTALK 10.4.5",
    "Mozilla/5.0 (Linux; Android 14; SM-S911N; wv) AppleWebKit/537.36 Version/4.0 Chrome/120.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 300.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 NAVER(inapp; search; 2000; 12.0.0)",
  ];
  for (const userAgent of inApp) assert.equal(isInAppBrowser(userAgent), true);
});

test("일반 브라우저는 앱 내 브라우저로 보지 않는다", () => {
  const browsers = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; SM-S911N) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
  ];
  for (const userAgent of browsers) assert.equal(isInAppBrowser(userAgent), false);
});
