/**
 * 한국어 조사 고르기 (#163). "광고 노출이(가)"처럼 괄호로 두 개를 다 쓰지 않고, 앞말 끝 글자의 받침으로 하나를 고른다.
 * 끝이 한글이 아니면(숫자, 영어) 받침을 모르니 읽기 쉬운 쪽으로 둔다: 숫자와 영어는 받침 없는 쪽
 */

/** 끝 글자에 받침이 있나. 한글이 아니면 null */
function batchim(word: string): boolean | null {
  const c = word.trim().at(-1);
  if (!c) return null;
  const code = c.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  return code % 28 !== 0;
}

/** 이/가 */
export const iGa = (word: string) => `${word}${batchim(word) ? "이" : "가"}`;
/** 은/는 */
export const eunNeun = (word: string) => `${word}${batchim(word) ? "은" : "는"}`;
/** 을/를 */
export const eulReul = (word: string) => `${word}${batchim(word) ? "을" : "를"}`;
