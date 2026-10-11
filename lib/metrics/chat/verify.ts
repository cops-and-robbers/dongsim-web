/**
 * 답변 검증 (#163). 모델 판정이 아니라 코드로 한다(결정적, 비용 0).
 *
 * - 사실(headline, facts)의 숫자는 인용한 도구 결과에 있어야 한다. 반올림, 부호(감소를 양수로 말하기)는 봐준다
 * - 가설이 도구 호출을 인용했으면(확인하려고 비교를 돌렸으면) 그 숫자는 인용한 결과에 있어야 한다.
 *   인용이 없는 가설과 주의점의 숫자는 어떤 도구 결과든 하나에는 있어야 한다. 후속 질문은 질문이라 보지 않는다
 * - 사실에는 인과 표현을 쓰지 않는다. 행사와 설치 증가는 "같은 기간에 함께"까지만 (LLM 은 상관에서 인과를 거의 못 가린다)
 * - 숫자가 있는 사실은 인용(refs)이 있어야 하고, 인용은 실제로 부른 도구여야 한다
 * - 도구를 하나도 안 불렀는데 숫자가 나오면 실패
 * - 표본이 적은(lowSample) 지표의 증감률을 % 로 말하면 실패. 10건에서 39건을 "290% 늘었다"고 하면 부풀려 읽힌다(2026-10-10 실제 Gemini 평가에서 잡음)
 */

export type Claim = { text: string; refs: string[] };
/** show: 말풍선 아래 카드로 보여 줄 지표(체다가 고르고 숫자는 화면이 도구 결과에서 그린다). 예전 답에는 없다 */
export type Show = { ref: string; metrics: string[] };
export type Answer = { headline: Claim; facts: Claim[]; hypotheses: Claim[]; caveats: string[]; followUps: string[]; show?: Show[] };
export type Problem = { where: string; text: string; issue: string };

// 영문자에 붙은 숫자는 이름의 일부라 세지 않는다("GA4", "D7"). 2026-10-10 실제 Gemini 평가에서 "GA4" 의 4 를 근거 없는 숫자로 잡았다
const NUM = /(?<![A-Za-z\d.])\d[\d,]*(?:\.\d+)?(?![A-Za-z])/g;
export const CAUSAL = /때문|덕분|덕에|로 인해|으로 인해|효과로|효과가 있|견인|기여|원인|영향으로|영향을 줬|결과로|이끌었/;

export function numbersIn(text: string): number[] {
  return (text.match(NUM) || []).map((s) => Number(s.replace(/,/g, ""))).filter((n) => Number.isFinite(n));
}

/** 도구 결과에 든 숫자 전부. 문자열 속 숫자와 날짜의 연, 월, 일도 넣는다("10월 4일"을 말할 수 있게) */
export function numbersOfResult(value: unknown, out = new Set<number>()): Set<number> {
  // 두 기간 비교 줄이면 배수도 말할 수 있다("1.8배로 늘었어요"). 소수 첫째 자리까지
  const row = value as { a?: unknown; b?: unknown } | null;
  if (row && typeof row === "object" && !Array.isArray(row) && typeof row.a === "number" && typeof row.b === "number" && row.b > 0) out.add(Math.round((row.a / row.b) * 10) / 10);
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

/**
 * "최근 28일", "최근 7일", "13주(91일)" 같은 기간 이름은 숫자가 아니라 이름이다. 지시문의 기간 표에 있는 이름이라 결과에 없어도 된다.
 * 실제 Gemini 평가(2026-10-10)에서 "최근 28일(9월 12일~10월 9일)"의 28 을 근거 없는 숫자로 잡았다
 */
const PERIOD_NAME = /(최근|지난)?\s*\d+\s*주\s*\(\s*\d+\s*일\s*\)|(최근|지난)\s*\d+\s*(일|주|개월|달)/g;
export const withoutPeriodNames = (text: string) => text.replace(PERIOD_NAME, " ");
const withoutDates = (text: string) => text.replace(/\d{1,2}\s*월\s*\d{1,2}\s*일|\d{1,2}\s*일/g, " ");

/** 지시문에 적힌 기준 숫자: 표본 기준(catalog.ts LOW_SAMPLE, LOW_RATIO_DEN), 가입 후 첫 게임 기간(server.ts ACTIVATION_DAYS) */
const RULE_NUMBERS = [20, 30, 7];

/** 글 속 "290%", "17.8 %" 같은 증감률 숫자(%p 는 뺀다) */
const PCT = /(\d[\d,]*(?:\.\d+)?)\s*%(?!p)/g;

/** 인용한 결과에서 표본이 적다고 표시된 지표의 증감률을 글에 썼나 */
function smallSamplePct(text: string, refs: string[], results: Map<string, unknown>): string[] {
  const said = [...text.matchAll(PCT)].map((m) => Number(m[1].replace(/,/g, "")));
  if (!said.length) return [];
  const out: string[] = [];
  for (const r of refs) {
    const metrics = (results.get(r) as { metrics?: { label?: string; lowSample?: boolean; changePct?: number | null }[] } | undefined)?.metrics;
    for (const m of metrics ?? []) {
      if (!m.lowSample || typeof m.changePct !== "number" || m.changePct === 0) continue;
      if (said.some((x) => matches(x, m.changePct!))) out.push(`${m.label ?? "지표"} ${Math.abs(m.changePct)}%`);
    }
  }
  return out;
}

/**
 * 가설이 숫자를 쓰면서 그 숫자가 없는 결과를 인용했으면, 그 숫자가 있는 결과를 인용에 더한다.
 * 실제 Gemini 평가(2026-10-10)에서 두 결과의 숫자를 한 문장에 섞고 하나만 인용하는 일이 15문항 중 둘 있었다.
 * 숫자는 도구 결과에 있으니 지어낸 게 아니고 인용 장부만 틀린 것이라, 다시 쓰게 하지 않고 코드가 고친다.
 * 우연히 같은 작은 숫자로 엉뚱한 결과를 붙이지 않게 10 이상만, 그리고 모든 빠진 숫자를 찾았을 때만 고친다. 사실(facts)은 고치지 않는다
 */
export function repairHypothesisRefs(answer: Answer, results: Map<string, unknown>): Answer {
  const pools = [...results].map(([id, r]) => [id, numbersOfResult(r)] as const);
  return {
    ...answer,
    hypotheses: answer.hypotheses.map((h) => {
      if (!h.refs.length) return h;
      const cited = new Set<number>();
      for (const r of h.refs) if (results.has(r)) numbersOfResult(results.get(r), cited);
      const missing = numbersIn(h.text).filter((n) => !grounded(n, cited));
      if (!missing.length || missing.some((n) => n < 10)) return h;
      const add = new Set<string>();
      for (const n of missing) {
        const hit = pools.find(([, p]) => grounded(n, p));
        if (!hit) return h;
        add.add(hit[0]);
      }
      return { ...h, refs: [...new Set([...h.refs, ...add])] };
    }),
  };
}

export function verifyAnswer(answer: Answer, results: Map<string, unknown>, question = "", ruleNumbers: number[] = []): { ok: boolean; problems: Problem[] } {
  const problems: Problem[] = [];
  // 주의점과 가설은 지시문의 기준 숫자도 말할 수 있다("표본이 20 미만", "분모 30 미만", "7일 안"). 사실(facts)에는 허용하지 않는다
  const all = new Set<number>([...numbersIn(question), ...RULE_NUMBERS, ...ruleNumbers]);
  for (const r of results.values()) numbersOfResult(r, all);
  const noTools = results.size === 0;

  const claims: [string, Claim][] = [["headline", answer.headline], ...answer.facts.map((f, i) => [`facts[${i}]`, f] as [string, Claim])];
  for (const [where, c] of claims) {
    const nums = numbersIn(withoutPeriodNames(c.text));
    if (CAUSAL.test(c.text)) problems.push({ where, text: c.text, issue: "사실에 인과 표현이 있어요. '같은 기간에 함께'로만 쓰거나 가설로 옮기세요" });
    if (!nums.length) continue;
    if (noTools) {
      // 도구 없이 할 수 있는 말은 날짜뿐이다("오늘 숫자는 없고 어제(10월 9일)까지 볼 수 있어요"). 날짜를 빼고도 숫자가 남으면 지어낸 것이다
      if (numbersIn(withoutDates(withoutPeriodNames(c.text))).length) problems.push({ where, text: c.text, issue: "도구를 부르지 않고 숫자를 말했어요" });
      continue;
    }
    const unknown = c.refs.filter((r) => !results.has(r));
    if (!c.refs.length) problems.push({ where, text: c.text, issue: "숫자가 있는데 인용(refs)이 없어요" });
    if (unknown.length) problems.push({ where, text: c.text, issue: `없는 도구 호출을 인용했어요: ${unknown.join(", ")}` });
    const pool = new Set<number>(numbersIn(question));
    for (const r of c.refs) if (results.has(r)) numbersOfResult(results.get(r), pool);
    const missing = nums.filter((n) => !grounded(n, pool));
    if (missing.length) problems.push({ where, text: c.text, issue: `인용한 결과에 없는 숫자: ${missing.join(", ")}` });
    const small = smallSamplePct(c.text, c.refs, results);
    if (small.length) problems.push({ where, text: c.text, issue: `표본이 적은 지표의 증감률을 말했어요(${small.join(", ")}). % 대신 개수로만 말하세요` });
  }
  // 가설은 원인을 말해도 된다(그래서 인과 표현은 보지 않는다). 인용했으면 그 결과의 숫자만, 아니면 아래 느슨한 대조
  answer.hypotheses.forEach((h, i) => {
    if (!h.refs.length) return;
    const where = `hypotheses[${i}]`;
    const unknown = h.refs.filter((r) => !results.has(r));
    if (unknown.length) problems.push({ where, text: h.text, issue: `없는 도구 호출을 인용했어요: ${unknown.join(", ")}` });
    const pool = new Set<number>(numbersIn(question));
    for (const r of h.refs) if (results.has(r)) numbersOfResult(results.get(r), pool);
    const missing = numbersIn(h.text).filter((n) => !grounded(n, pool));
    if (missing.length) problems.push({ where, text: h.text, issue: `인용한 결과에 없는 숫자: ${missing.join(", ")}` });
  });
  const loose: [string, string][] = [
    ...answer.hypotheses.flatMap((h, i) => (h.refs.length ? [] : [[`hypotheses[${i}]`, h.text] as [string, string]])),
    ...answer.caveats.map((t, i) => [`caveats[${i}]`, t] as [string, string]),
  ];
  for (const [where, t] of loose) {
    const missing = numbersIn(t).filter((n) => !grounded(n, all));
    if (missing.length) problems.push({ where, text: t, issue: `도구 결과에 없는 숫자: ${missing.join(", ")}` });
  }
  return { ok: problems.length === 0, problems };
}
