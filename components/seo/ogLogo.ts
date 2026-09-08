import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * OG 카드가 쓰는 로케일 로고 (#113).
 *
 * readFile 경로는 여기 글자 그대로 적는다. 호출부가 경로를 변수로 넘기던
 * 시절에는 파일 트레이싱이 경로를 좁히지 못해 **프로젝트 전체(라우트당
 * 29MB)를 모든 함수 번들에 넣었다** - Vercel 함수 저장 한도를 압박한 원인.
 * 새 로케일 로고가 생기면 이 맵에 줄을 추가한다.
 *
 * 치수를 함께 두는 이유: satori 는 SVG 원본 비율을 모르므로 그리는 쪽이
 * 가로·세로를 알아야 한다. 경로와 치수가 항상 짝으로 다니니 한곳에 둔다.
 */
export const OG_LOGOS = {
  ko: {
    w: 285,
    h: 46,
    read: () => readFile(join(process.cwd(), "public/brand/header-logo.svg")),
  },
  en: {
    w: 2174,
    h: 560,
    read: () => readFile(join(process.cwd(), "public/brand/i18n/logo-en.svg")),
  },
  ja: {
    w: 2791,
    h: 560,
    read: () => readFile(join(process.cwd(), "public/brand/i18n/logo-ja.svg")),
  },
} as const;

export type OgLogoLocale = keyof typeof OG_LOGOS;
