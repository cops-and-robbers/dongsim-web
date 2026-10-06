/**
 * /download 로 들어온 UTM 을 스토어 주소로 이어 넘긴다 (#144).
 *
 * 링크트리와 행사 QR 이 /download?utm_... 를 가리킨다. 여기서 스토어로 넘길 때
 * 꼬리표를 버리면 "어느 캠페인으로 와서 실제로 설치했나"를 알 수 없다.
 *
 * - Google Play: referrer 에 UTM 을 담는다. 앱의 Firebase(GA4)가 설치 리퍼러를
 *   읽어 첫 실행(first_open)을 캠페인별로 센다
 * - App Store: 캠페인 토큰 ct 와 공급자 토큰 pt 를 붙인다. App Store Connect
 *   분석에 캠페인별 다운로드로 잡힌다. pt 가 없으면 ct 도 의미가 없어 붙이지 않는다
 *
 * 이 파일은 node --test 로 바로 돌리므로 다른 모듈을 부르지 않는다.
 */

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

/** App Store 캠페인 토큰 최대 길이 (애플 규칙) */
export const APPSTORE_CT_MAX = 40;

/**
 * 꼬리표 값으로 받을 글자. 주소에 그대로 이어 붙이는 값이라, 아무 값이나 받으면
 * 남의 캠페인 이름을 흉내 내거나 스토어 주소를 깨뜨리는 값이 들어올 수 있다.
 * 우리가 쓰는 값(instagram, bio, always, download)은 이 안에 다 들어간다.
 */
const SAFE = /^[A-Za-z0-9_.-]{1,64}$/;

export type Utm = Partial<Record<(typeof UTM_KEYS)[number], string>>;

/** 주소의 쿼리에서 쓸 수 있는 UTM 만 꺼낸다. 하나도 없으면 null */
export function readUtm(search: string): Utm | null {
  const q = new URLSearchParams(search);
  const utm: Utm = {};
  for (const key of UTM_KEYS) {
    const v = q.get(key);
    if (v && SAFE.test(v)) utm[key] = v;
  }
  return Object.keys(utm).length ? utm : null;
}

/** Play: ...&referrer=utm_source%3D...%26utm_campaign%3D... */
export function playUrlWithUtm(base: string, utm: Utm): string {
  const url = new URL(base);
  const referrer = new URLSearchParams();
  for (const key of UTM_KEYS) if (utm[key]) referrer.set(key, utm[key] as string);
  url.searchParams.set("referrer", referrer.toString());
  return url.toString();
}

/**
 * 캠페인 토큰. 출처, 캠페인, 버튼을 이어서 40자 안으로 만든다.
 * 예: instagram-always-download
 * 캠페인만 쓰면 "always" 가 인스타 프로필에서 왔는지 행사 QR 에서 왔는지 갈리지 않는다.
 */
export function appStoreCampaignToken(utm: Utm): string | null {
  const parts = [utm.utm_source, utm.utm_campaign, utm.utm_content].filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join("-").slice(0, APPSTORE_CT_MAX);
}

/** App Store: ...?pt=공급자토큰&ct=캠페인&mt=8. 공급자 토큰이 없으면 원래 주소 그대로 */
export function appStoreUrlWithUtm(base: string, utm: Utm, providerToken: string | undefined): string {
  const ct = appStoreCampaignToken(utm);
  if (!providerToken || !/^[0-9]{1,20}$/.test(providerToken) || !ct) return base;
  const url = new URL(base);
  url.searchParams.set("pt", providerToken);
  url.searchParams.set("ct", ct);
  url.searchParams.set("mt", "8");
  return url.toString();
}

/** 두 스토어 주소를 한 번에. UTM 이 없으면 원래 주소 그대로 */
export function storeLinksWithUtm(
  links: { appStore: string; googlePlay: string },
  search: string,
  providerToken: string | undefined,
): { appStore: string; googlePlay: string; campaign: string | null } {
  const utm = readUtm(search);
  if (!utm) return { ...links, campaign: null };
  return {
    appStore: appStoreUrlWithUtm(links.appStore, utm, providerToken),
    googlePlay: playUrlWithUtm(links.googlePlay, utm),
    campaign: appStoreCampaignToken(utm),
  };
}
