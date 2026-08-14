// 다국어(i18n) 설정 - 한국어는 루트(prefix 없음), 영어=/en, 일본어=/ja.
// 라이브러리 없이 이 Next 16의 사전(dictionary) 방식으로 구성한다.

export const LOCALES = ["ko", "en", "ja"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ko";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

// pathname의 첫 세그먼트로 로케일 판별 (없으면 한국어).
export function localeFromPathname(pathname: string): Locale {
  const seg = pathname.split("/")[1] ?? "";
  return isLocale(seg) ? seg : "ko";
}

// 기준 경로에 로케일 접두어 부여. 한국어는 접두어 없음. (path는 "/"로 시작)
export function localizedPath(path: string, locale: Locale): string {
  if (locale === "ko") return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

// 로케일 접두어를 떼어 기준 경로(항상 "/"로 시작)로 변환.
export function stripLocale(pathname: string): string {
  const seg = pathname.split("/")[1] ?? "";
  if (isLocale(seg) && seg !== "ko") {
    const rest = pathname.slice(seg.length + 1);
    return rest === "" ? "/" : rest;
  }
  return pathname;
}

// 로케일별 브랜드 표기 - 로고 텍스트와 일치. 일본은 현지 명칭 ケイドロ.
export const BRAND_NAME: Record<Locale, string> = {
  ko: "경찰과 도둑",
  en: "Cops and Robbers",
  ja: "ケイドロ",
};

// 언어 전환 버튼에 노출되는 이름.
export const LOCALE_LABEL: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
};

// <html lang> 용 BCP-47 태그.
export const HTML_LANG: Record<Locale, string> = {
  ko: "ko",
  en: "en",
  ja: "ja",
};

// 로케일 × 다크모드 로고. (라이트=경찰, 다크=도둑 톤에 맞춘 별도 버전)
export function logoSrc(locale: Locale, dark: boolean): string {
  return `/brand/i18n/logo-${locale}${dark ? "-dark" : ""}.svg`;
}
export function appIconSrc(locale: Locale): string {
  return `/brand/i18n/app-icon-${locale}.svg`;
}

// 영어·일본어로 번역하지 않고 한국어에만 존재하는 실제 페이지들.
// /en·/ja로 접근하면 proxy가 한국어로 리다이렉트한다(콘텐츠는 그것뿐이므로).
// 이 목록에 없는 /en·/ja 경로는 그냥 통과 → 없는 경로면 해당 언어의 404가 뜬다.
export const KO_ONLY_PATHS: readonly string[] = [
  "/team/members",
  "/design",
  "/download",
  "/join",
  "/event",
  "/photobooth",
  "/p",
  "/terms",
  "/privacy",
  "/location",
  "/marketing",
];

export function isKoOnlyPath(basePath: string): boolean {
  return KO_ONLY_PATHS.some(
    (path) => basePath === path || basePath.startsWith(`${path}/`),
  );
}

// 특정 기준 경로(ko 기준, "/"로 시작)의 언어별 절대 URL 맵. hreflang·sitemap 공용.
// 예) alternateLanguages(url, "/game") => { ko: url/game, en: url/en/game, ja: url/ja/game }
export function alternateLanguages(
  siteUrl: string,
  path: string = "/",
): Record<Locale, string> {
  return {
    ko: `${siteUrl}${localizedPath(path, "ko")}`,
    en: `${siteUrl}${localizedPath(path, "en")}`,
    ja: `${siteUrl}${localizedPath(path, "ja")}`,
  };
}
