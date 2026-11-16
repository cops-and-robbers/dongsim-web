import { LOCALES, alternateLanguages, type Locale } from "../i18n/config.ts";

/**
 * 블로그 목록의 색인 여부와 언어 대체 주소(hreflang).
 *
 * 글이 하나도 없는 언어의 목록은 "첫 글을 준비하고 있어요"뿐이라, 사이트맵에 넣고 색인을 바라면
 * 구글에 빈 페이지를 내미는 셈이다(#343, 11/16 /en/blog 본문 259자). 글이 생길 때까지 noindex 로 두고,
 * 다른 언어 목록의 hreflang 에서도 뺀다. hreflang 은 색인될 수 있는 주소끼리 이어야 한다.
 *
 * withPosts 가 null 이면(글 목록을 못 읽음) 예전처럼 모두 색인한다. 조회 오류를 "글 없음"으로 읽으면
 * noindex 가 ISR 캐시에 남는다(#188 과 같은 함정).
 */
export function blogListIndexing(
  siteUrl: string,
  locale: Locale,
  withPosts: ReadonlySet<Locale> | null,
): { index: boolean; languages: Record<string, string> } {
  const all = alternateLanguages(siteUrl, "/blog");
  if (!withPosts) return { index: true, languages: { ...all, "x-default": all.ko } };
  const languages: Record<string, string> = {};
  for (const l of LOCALES) if (withPosts.has(l)) languages[l] = all[l];
  if (withPosts.has("ko")) languages["x-default"] = all.ko;
  return { index: withPosts.has(locale), languages };
}
