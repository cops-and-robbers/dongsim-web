/**
 * 나라 코드(ISO 3166, App Store 와 GA4 countryId 가 주는 값)를 한국어 이름으로.
 * 라이브러리 없이 브라우저 기본 Intl.DisplayNames 를 쓴다. GA4 가 나라를 모를 때 주는 "(not set)" 만 따로 옮긴다
 */
const names = (() => {
  try {
    const n = new Intl.DisplayNames(["ko"], { type: "region" });
    return (code: string) => n.of(code) ?? code;
  } catch {
    return (code: string) => code;
  }
})();

export const UNKNOWN_COUNTRY = "(not set)";

export function countryName(code: string): string {
  if (code === UNKNOWN_COUNTRY || code === "") return "국가 미상";
  try {
    return names(code);
  } catch {
    // 두 글자 코드가 아닌 값이 오면 Intl 이 오류를 던진다. 받은 그대로 보인다
    return code;
  }
}
