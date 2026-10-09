/**
 * 답변 검증 (#163). 모델 판정이 아니라 코드로 한다(결정적, 비용 0).
 *
 * - 사실(headline, facts)의 숫자는 인용한 도구 결과에 있어야 한다. 반올림, 부호(감소를 양수로 말하기)는 봐준다
 * - 가설과 주의점의 숫자도 어떤 도구 결과든 하나에는 있어야 한다. 후속 질문은 질문이라 보지 않는다
 * - 사실에는 인과 표현을 쓰지 않는다. 행사와 설치 증가는 "같은 기간에 함께"까지만 (LLM 은 상관에서 인과를 거의 못 가린다)
 * - 숫자가 있는 사실은 인용(refs)이 있어야 하고, 인용은 실제로 부른 도구여야 한다
 * - 도구를 하나도 안 불렀는데 숫자가 나오면 실패
 */

export type Claim = { text: string; refs: string[] };
export type Answer = { headline: Claim; facts: Claim[]; hypotheses: string[]; caveats: string[]; followUps: string[] };
export type Problem = { where: string; text: string; issue: string };

const NUM = /\d[\d,]*(?:\.\d+)?/g;
export const CAUSAL = /때문|덕분|덕에|로 인해|으로 인해|효과로|효과가 있|견인|기여|원인|영향으로|영향을 줬|결과로|이끌었/;

export function numbersIn(text: string): number[] {
  return (text.match(NUM) || []).map((s) => Number(s.replace(/,/g, ""))).filter((n) => Number.isFinite(n));
}

/** 도구 결과에 든 숫자 전부. 문자열 속 숫자와 날짜의 연, 월, 일도 넣는다("10월 4일"을 말할 수 있게) */
export function numbersOfResult(value: unknown, out = new Set<number>()): Set<number> {
  if (typeof value === "number" && Number.isFinite(value)) out.add(value);
  else if (typeof value === "string") {
    for (const m of value.matchAll(/(\d{4})-(\d{2})-(\d{2})/g)) [m[1], m[2], m[3]].forEach((x) => out.add(Number(x)));
    for (const n of numbersIn(value.replace(/\d{4}-\d{2}-\d{2}/g, ""))) out.add(n);
  } else if (Array.isArray(value)) value.forEach((v) => numbersOfResult(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => numbersOfResult(v, out));
  return out;
}

/** 말한 숫자 x 가 결과 값 v 와 같다고 볼 수 있나 */
export function matches(x: number, v: number): boolean {
  const a = Math.abs(v);
  if (x === a) return true;
  for (const k of [0, 1, 2]) if (Number(a.toFixed(k)) === x) return true;
  return false;
}

const grounded = (x: number, pool: Set<number>) => [...pool].some((v) => matches(x, v));

export function verifyAnswer(answer: Answer, results: Map<string, unknown>, question = ""): { ok: boolean; problems: Problem[] } {
  const problems: Problem[] = [];
  const all = new Set<number>(numbersIn(question));
  for (const r of results.values()) numbersOfResult(r, all);
  const noTools = results.size === 0;

  const claims: [string, Claim][] = [["headline", answer.headline], ...answer.facts.map((f, i) => [`facts[${i}]`, f] as [string, Claim])];
  for (const [where, c] of claims) {
    const nums = numbersIn(c.text);
    if (CAUSAL.test(c.text)) problems.push({ where, text: c.text, issue: "사실에 인과 표현이 있어요. '같은 기간에 함께'로만 쓰거나 가설로 옮기세요" });
    if (!nums.length) continue;
    if (noTools) {
      problems.push({ where, text: c.text, issue: "도구를 부르지 않고 숫자를 말했어요" });
      continue;
    }
    const unknown = c.refs.filter((r) => !results.has(r));
    if (!c.refs.length) problems.push({ where, text: c.text, issue: "숫자가 있는데 인용(refs)이 없어요" });
    if (unknown.length) problems.push({ where, text: c.text, issue: `없는 도구 호출을 인용했어요: ${unknown.join(", ")}` });
    const pool = new Set<number>(numbersIn(question));
    for (const r of c.refs) if (results.has(r)) numbersOfResult(results.get(r), pool);
    const missing = nums.filter((n) => !grounded(n, pool));
    if (missing.length) problems.push({ where, text: c.text, issue: `인용한 결과에 없는 숫자: ${missing.join(", ")}` });
  }
  const loose: [string, string][] = [
    ...answer.hypotheses.map((t, i) => [`hypotheses[${i}]`, t] as [string, string]),
    ...answer.caveats.map((t, i) => [`caveats[${i}]`, t] as [string, string]),
  ];
  for (const [where, t] of loose) {
    const missing = numbersIn(t).filter((n) => !grounded(n, all));
    if (missing.length) problems.push({ where, text: t, issue: `도구 결과에 없는 숫자: ${missing.join(", ")}` });
  }
  return { ok: problems.length === 0, problems };
}
