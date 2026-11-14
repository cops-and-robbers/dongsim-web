/**
 * 어드민의 국가 표시 규칙 (#319, docs/admin-ui.md "주로 플레이하는 국가").
 * 국가는 플레이 구역에서 나온 값이라 국적이 아니라 "어디서 플레이했나"다. 화면 밖에서 테스트할 수 있게 계산만 모아 둔다
 */

export const HOME_COUNTRY = "KR";

// 브라우저의 한국어 국가 이름이 길거나 우리 문구와 다른 것만 바꾼다
const OVERRIDES: Record<string, string> = {
  AU: "호주", // 오스트레일리아
  HK: "홍콩", // 홍콩(중국 특별행정구)
  MO: "마카오", // 마카오(중국 특별행정구)
  US: "미국",
  GB: "영국",
};

let names: Intl.DisplayNames | null | undefined;

/** 한국어 국가 이름. 처음 보는 나라도 브라우저가 이름을 안다. 모르는 코드면 코드 그대로 */
export function countryName(code: string): string {
  const upper = code.toUpperCase();
  if (OVERRIDES[upper]) return OVERRIDES[upper];
  if (names === undefined) {
    try {
      names = new Intl.DisplayNames(["ko"], { type: "region", fallback: "none" });
    } catch {
      names = null;
    }
  }
  try {
    return names?.of(upper) ?? upper;
  } catch {
    return upper;
  }
}

export type PlayCountry = { readonly countryCode: string | null | undefined; readonly games: number; readonly lastPlayedAt?: string | null };

/**
 * 유저별 플레이 국가 요약. 서버가 많이 한 국가부터(같으면 최근 국가부터) 주고, 국가를 아직 못 찾은 판은 맨 뒤 한 줄이다.
 * - main: 주로 플레이하는 국가. 국가를 아는 판이 하나도 없으면 null
 * - others: 그 외 국가(많이 한 순서)
 * - known: 국가를 아는 판 수, pending: 아직 확인 중인 판 수
 */
export function summarizeCountries(list: readonly PlayCountry[]) {
  const known = list.filter((c): c is PlayCountry & { countryCode: string } => !!c.countryCode);
  const pending = list.filter((c) => !c.countryCode).reduce((sum, c) => sum + c.games, 0);
  return {
    main: known[0] ?? null,
    others: known.slice(1),
    known: known.reduce((sum, c) => sum + c.games, 0),
    pending,
  };
}

/** 목록에 국기를 붙일까. 한국은 대부분이라 붙이지 않는다(예외일 때만 표시) */
export const isAbroad = (code: string | null | undefined): code is string => !!code && code.toUpperCase() !== HOME_COUNTRY;
