/**
 * 체다 카드의 숫자 쓰는 규칙 (#163). 말풍선 아래 카드가 모두 이 함수로 숫자를 쓴다(문장과 카드의 표기가 갈리지 않게).
 *
 * 근거(2026-10-11 조사)
 * - 퍼센트는 정수로, 연달아 나오면 자릿수를 맞춘다(영국 통계청 ONS 숫자 지침). 83%, 62.6%, 502.5% 가 한 답에 섞여 있었다
 * - 2배가 넘게 늘면 "N배"가 "502%"보다 읽기 쉽다(데이터 저널리즘 지침)
 * - 비율 지표끼리의 차이는 %p(ONS). 10% 에서 9% 는 1%p 내린 것이지 10% 내린 것이 아니다
 * - 표본이 적으면 %를 감추고 개수만(tools.ts lowSample, 20 미만)
 */

export type Change = { dir: "up" | "down" | "flat"; text: string } | null;

/** 증감 표시. a 이번, b 이전, pct 증감률(%), points 비율 차이(%p) */
export function changeText(r: { a: number | null; b: number | null; changePct?: number | null; points?: number | null; lowSample?: boolean }): Change {
  if (r.points !== null && r.points !== undefined) {
    if (r.points === 0) return { dir: "flat", text: "그대로" };
    return { dir: r.points > 0 ? "up" : "down", text: `${Math.abs(Math.round(r.points * 10) / 10)}%p` };
  }
  if (r.a === null || r.b === null) return null;
  const diff = r.a - r.b;
  if (diff === 0) return { dir: "flat", text: "그대로" };
  const dir = diff > 0 ? "up" : "down";
  // 표본이 적으면 % 대신 개수 차이만
  if (r.lowSample || r.b === 0) return { dir, text: `${Math.abs(Math.round(diff * 10) / 10).toLocaleString("ko-KR")}` };
  if (dir === "up" && r.a / r.b >= 2) return { dir, text: `${Math.round((r.a / r.b) * 10) / 10}배` };
  const pct = r.changePct ?? (diff / r.b) * 100;
  return { dir, text: `${Math.abs(Math.round(pct))}%` };
}

/** 값 표기: 천 단위 쉼표, 소수는 한 자리까지 */
export const valueText = (v: number | null) => (v === null ? "-" : v.toLocaleString("ko-KR", { maximumFractionDigits: 1 }));

/** 크기 비교용 점수: 비율은 %p 크기, 개수는 변화율 크기(표본이 적으면 뒤로) */
export function magnitude(r: { a: number | null; b: number | null; points?: number | null; lowSample?: boolean }): number {
  if (r.points !== null && r.points !== undefined) return Math.abs(r.points);
  if (r.a === null || r.b === null) return -1;
  const base = Math.abs(r.a - r.b) / Math.max(1, r.b);
  return r.lowSample ? base / 10 : base;
}
