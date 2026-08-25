import type { Locale } from "./config";

// 헤더·푸터 등 공통 UI 문구. 클라이언트 컴포넌트에서 쓰므로 페이지 본문 사전(messages.ts)과
// 분리해 번들을 작게 유지한다. en·ja는 미번역 항목(블로그·미니게임·약관)을 노출하지 않는다.

export type ChromeNav = { path: string; label: string };

export type Chrome = {
  nav: ChromeNav[];
  download: string;
  downloadShort: string;
  languageLabel: string;
  skipToContent: string;
  footer: {
    tagline: string;
    browseHeading: string;
    minigame: string | null; // null이면 숨김 (en·ja)
    contactHeading: string;
    contactNote: string;
    legal: ChromeNav[]; // en·ja는 빈 배열
  };
};

const ko: Chrome = {
  nav: [
    { path: "/game", label: "게임 소개" },
    { path: "/blog", label: "이야기" },
    { path: "/team", label: "팀 소개" },
  ],
  download: "다운로드",
  downloadShort: "앱 다운로드",
  languageLabel: "언어 선택",
  skipToContent: "본문 바로가기",
  footer: {
    tagline: "추억의 게임에서 가치를 찾습니다",
    browseHeading: "둘러보기",
    minigame: "미니게임",
    contactHeading: "문의",
    contactNote: "제휴, 피드백, 버그 제보 모두 환영해요.",
    legal: [
      { path: "/terms", label: "이용약관" },
      { path: "/privacy", label: "개인정보 처리방침" },
      { path: "/location", label: "위치정보 이용약관" },
      { path: "/marketing", label: "마케팅 정보 수신 동의" },
      { path: "/licenses", label: "오픈소스 라이선스" },
    ],
  },
};

const en: Chrome = {
  nav: [
    { path: "/game", label: "Game" },
    { path: "/blog", label: "Stories" },
    { path: "/team", label: "Team" },
  ],
  download: "Download",
  downloadShort: "Get the app",
  languageLabel: "Select language",
  skipToContent: "Skip to content",
  footer: {
    tagline: "The games you grew up with, reinvented.",
    browseHeading: "Menu",
    minigame: null,
    contactHeading: "Contact",
    contactNote: "Partnerships, feedback, and bug reports are all welcome.",
    legal: [
      { path: "/en/terms", label: "Terms of Service" },
      { path: "/en/privacy", label: "Privacy Policy" },
      { path: "/en/location", label: "Location Data Terms" },
      { path: "/en/marketing", label: "Marketing Consent" },
      { path: "/en/licenses", label: "Open Source Licenses" },
    ],
  },
};

const ja: Chrome = {
  nav: [
    { path: "/game", label: "ゲーム紹介" },
    { path: "/blog", label: "ストーリー" },
    { path: "/team", label: "チーム紹介" },
  ],
  download: "ダウンロード",
  downloadShort: "アプリを入手",
  languageLabel: "言語を選択",
  skipToContent: "本文へスキップ",
  footer: {
    tagline: "懐かしい遊びに、あたらしい価値を。",
    browseHeading: "メニュー",
    minigame: null,
    contactHeading: "お問い合わせ",
    contactNote: "提携・フィードバック・不具合報告、お気軽にどうぞ。",
    legal: [
      { path: "/ja/terms", label: "利用規約" },
      { path: "/ja/privacy", label: "プライバシーポリシー" },
      { path: "/ja/location", label: "位置情報利用規約" },
      { path: "/ja/marketing", label: "マーケティング情報の受信同意" },
      { path: "/ja/licenses", label: "オープンソースライセンス" },
    ],
  },
};

export const CHROME: Record<Locale, Chrome> = { ko, en, ja };
