/**
 * 답 글에서 숫자 값을 찾아 굵게 보일 조각으로 나눈다 (#163).
 *
 * 모델에게 마크다운(굵게, 목록)을 쓰게 하지 않는다. 답마다 모양이 들쭉날쭉하고 별표와 목록 기호가 AI 티를 낸다(2026-10-10).
 * 대신 화면이 정해진 규칙으로 값만 굵게 한다. 글을 다 안 읽어도 "59명", "19판에서 2판으로"가 먼저 눈에 들어온다.
 * 단위가 붙은 값만 고른다(명, 판, 회, 건, %p, %, 달러, 원, 번). 날짜와 시각(9월 19일, 14시 27분)은 값이 아니라 굵게 하지 않는다
 */

export type Piece = { text: string; num: boolean };

const VALUE = /-?\d[\d,]*(?:\.\d+)?\s?(?:%p|%|명|판|회|건|달러|원|번|개)/g;

export function emphasize(text: string): Piece[] {
  const out: Piece[] = [];
  let at = 0;
  for (const m of text.matchAll(VALUE)) {
    const i = m.index ?? 0;
    if (i > at) out.push({ text: text.slice(at, i), num: false });
    out.push({ text: m[0], num: true });
    at = i + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at), num: false });
  return out;
}
