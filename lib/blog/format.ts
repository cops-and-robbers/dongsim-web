import type { Locale } from "@/lib/i18n/config";

/**
 * 글의 날짜를 그 글의 언어로 쓴다.
 *
 * 기준은 보는 사람의 언어가 아니라 글의 언어다. 일본어 글은 한국어 목록에서
 * 보더라도 일본어 날짜를 단다. 날짜는 글에 딸린 정보이기 때문이다.
 *
 *   ko  2026년 8월 15일
 *   en  August 15, 2026
 *   ja  2026年8月15日
 */
const FORMATS: Record<Locale, Intl.DateTimeFormat> = {
  // 노션 날짜는 시각 없이 오므로 표준시를 UTC 로 못박는다.
  // 안 그러면 서버가 있는 곳에 따라 하루가 밀린다.
  ko: new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeZone: "UTC" }),
  en: new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }),
  ja: new Intl.DateTimeFormat("ja-JP", { dateStyle: "long", timeZone: "UTC" }),
};

/** "2026-08-15" → 글 언어에 맞는 날짜. 값이 비었거나 이상하면 빈 문자열. */
export function formatPostDate(iso: string, locale: Locale = "ko"): string {
  if (!iso) return "";
  // 날짜만 있는 문자열은 UTC 자정으로 읽는다. 시각이 붙어 오면 그대로 맡긴다.
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return "";
  return (FORMATS[locale] ?? FORMATS.ko).format(d);
}
