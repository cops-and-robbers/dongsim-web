"use client";

// Firebase 웹 앱 초기화 (어드민 구글·애플 로그인용).
// 서버 서비스계정과 같은 프로젝트(copsandrobbers-8c026)여야 idToken 검증이 통과한다.
// 모듈 로드 시점이 아니라 첫 사용 시점에 초기화한다.
// 빌드(프리렌더) 환경엔 env가 없어 즉시 초기화하면 auth/invalid-api-key로 빌드가 깨진다.
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  type Auth,
} from "firebase/auth";

function getFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApp();
  return initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function createGoogleProvider(): GoogleAuthProvider {
  return new GoogleAuthProvider();
}

export function createAppleProvider(): OAuthProvider {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  return provider;
}
