// 체다 답을 숫자로 잰다 (#163). vertex.mjs 결과 폴더 여러 개(같은 질문을 여러 번 돌린 것)를 받아 한 표로.
//
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/chat-eval/vertex-score.mjs --runs dir1,dir2,dir3 [--json out.json]
//
// 재는 것
// - 정확도: 숫자 검증 통과(다시 쓴 뒤 기준), 정답 숫자(truth), 맥락 불일치(문장이 말한 지표가 아닌 다른 지표의 숫자를 붙임)
// - 의도: 맞는 도구를 맞는 기간, 지표로 불렀나(tools, call)
// - 답 적합: 알아들은 뒤 질문에 맞게 답했나(says, refuse, truth, hypotheses)
// - 안정성: pass^k. 같은 질문을 k 번 돌려 k 번 모두 통과한 비율
// - 속도와 비용: 시간 중앙값, 90%, 최대, 출력 토큰, 비용
// - 가독성: 말풍선(결론과 사실) 글자 수, 문장 수, 한 문장 속 숫자 수
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const RUNS = opt("--runs").split(",");
const { QUESTIONS: G } = await import("./vertex-questions.mjs");
const { HOLDOUT } = await import("./vertex-holdout.mjs");
// 카드(말풍선 아래)에 그려지는 숫자도 사용자가 보는 답이다. 화면과 같은 함수로 고른다
const { evidenceOf } = await import("../../lib/metrics/chat/evidence.ts");
const DEF = new Map([...G.map((c) => [c.id, { ...c, set: "golden" }]), ...HOLDOUT.map((c) => [c.id, { ...c, set: "holdout" }])]);

const nameOk = (want, name) => (want instanceof RegExp ? want.test(name) : want === name);
const NUM = /(?<![A-Za-z\d.])\d[\d,]*(?:\.\d+)?(?![A-Za-z])/g;
const nums = (t) => (t.match(NUM) || []).map((s) => Number(s.replace(/,/g, "")));
// 날짜, 시각, 기간 이름은 값이 아니다
const valueText = (t) =>
  t
    .replace(/\d{4}-\d{2}-\d{2}/g, " ")
    .replace(/\d{1,2}\s*월\s*\d{1,2}\s*일|\d{1,2}\s*일|\d{1,2}\s*월|\d{1,2}\s*시\s*\d{1,2}\s*분|\d{1,2}\s*시/g, " ")
    .replace(/(최근|지난)?\s*\d+\s*주\s*\(\s*\d+\s*일\s*\)|(최근|지난)\s*\d+\s*(일|주|개월|달)|\d+\s*일\s*안/g, " ");
const sentences = (t) => t.split(/(?<=[.?!요])\s+/).map((s) => s.trim()).filter(Boolean);
const close = (x, v) => [0, 1, 2].some((k) => Number(Math.abs(v).toFixed(k)) === x) || Math.abs(v) === x;

/** 도구 결과에서 지표 줄(이름과 값들)을 모은다 */
function rowsOf(output) {
  const rows = [];
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== "object") return;
    if (typeof o.label === "string") {
      const vals = [o.a, o.b, o.value, o.diff, o.diffPoints, o.changePct, o.usual, o.total, o.aOf?.num, o.aOf?.den, o.bOf?.num, o.bOf?.den, o.num, o.den, o.peak?.value].filter((v) => typeof v === "number");
      if (vals.length) {
        // 배수(161/88 = 1.8배)도 그 지표의 값으로 친다
        if (typeof o.a === "number" && typeof o.b === "number" && o.b > 0) vals.push(Math.round((o.a / o.b) * 10) / 10);
        rows.push({ label: o.label.replace(/\(.*?\)/g, "").trim(), vals });
      }
    }
    Object.values(o).forEach(walk);
  };
  walk(output);
  return rows;
}

/** 문장이 지표 이름을 말했는데, 그 숫자가 그 지표가 아니라 다른 지표에만 있으면 맥락 불일치 */
function contextMismatch(text, refs, tools) {
  const cited = tools.filter((t) => refs.includes(t.id));
  const rows = cited.flatMap((t) => rowsOf(t.output));
  let bad = 0;
  for (const s of sentences(text)) {
    const named = rows.filter((r) => r.label.length >= 2 && s.includes(r.label));
    if (!named.length) continue;
    for (const n of nums(valueText(s))) {
      // 이름이 문장에 통째로 있거나, 이름 낱말 둘 이상이 문장에 있는 지표(참가 인원 -> 게임 참가 인원 합)의 값이면 정상
      const related = rows.filter((r) => named.includes(r) || r.label.split(/\s+/).filter((w) => w.length >= 2 && s.includes(w.replace(/[을를은는이가]$/, ""))).length >= 2);
      const inNamed = related.some((r) => r.vals.some((v) => close(n, v)));
      // 숫자가 든 다른 지표의 이름 낱말이 문장에 하나도 없을 때만 센다(보수적으로). "새 가입자"의 "가입"을 "가입" 지표로 읽는 오탐을 막는다
      const words = (label) => label.split(/\s+/).filter((w) => w.length >= 2);
      const inOther = rows.some((r) => !named.includes(r) && r.vals.some((v) => close(n, v)) && !words(r.label).some((w) => s.includes(w.replace(/[을를은는이가]$/, ""))));
      if (!inNamed && inOther) {
        bad++;
        if (process.env.DEBUG_MISMATCH) console.error(`맥락 불일치 ${n} | ${s} | 말한 지표: ${named.map((r) => r.label).join(", ")}`);
      }
    }
  }
  return bad;
}

const texts = (a) => [a.headline.text, ...a.facts.map((f) => f.text), ...a.caveats];
function judge(c, r) {
  const a = r.answer;
  const calls = r.tools ?? [];
  const intent = [];
  for (const g of c.tools ?? []) intent.push(calls.some((t) => g.includes(t.name)));
  if (c.call) intent.push(calls.some((t) => nameOk(c.call.name, t.name) && c.call.test(t.input)));
  const fit = [];
  for (const re of c.says ?? []) fit.push(texts(a).some((t) => re.test(t)));
  if (c.refuse) fit.push(/볼 수 없|수 없어요|수 없는|못 |어려워|알 수 없|않아요|불가능/.test(a.headline.text));
  if (c.hypotheses) fit.push(a.hypotheses.length > 0);
  if (r.truth && typeof r.truth === "object" && !Array.isArray(r.truth)) {
    const all = [...texts(a), ...a.hypotheses.map((h) => h.text), JSON.stringify(evidenceOf(r.tools ?? [], a))].join(" ");
    for (const v of Object.values(r.truth)) if (v.unique !== null) fit.push(all.includes(`${v.unique}명`) || JSON.stringify(r.tools).includes(`"uniqueVisitors":${v.unique}`));
  } else if (r.truth !== null && r.truth !== undefined) {
    const want = Array.isArray(r.truth) ? [String(r.truth[1].games)] : [String(r.truth)];
    const shown = JSON.stringify(evidenceOf(r.tools ?? [], a));
    const all = texts(a).join(" ");
    for (const w of want) fit.push(all.includes(w) || new RegExp(`[:\[,]${w}[,}\]]`).test(shown));
  }
  const bubble = [a.headline.text, ...a.facts.map((f) => f.text)].join(" ");
  const ss = sentences(bubble);
  const perSentence = ss.map((s) => nums(valueText(s)).length);
  const mismatch = [a.headline, ...a.facts].reduce((n, cl) => n + contextMismatch(cl.text, cl.refs ?? [], calls), 0);
  return {
    verified: (r.unverified ?? []).length === 0,
    intentOk: intent.every(Boolean),
    intentN: intent.length,
    fitOk: fit.every(Boolean),
    fitN: fit.length,
    mismatch,
    chars: bubble.length,
    sentences: ss.length,
    maxNums: Math.max(0, ...perSentence),
    avgNums: perSentence.length ? perSentence.reduce((x, y) => x + y, 0) / perSentence.length : 0,
  };
}

const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : null);
const q = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))] : null;
};

const per = new Map(); // id -> [{...judge, ms, cost, out}]
for (const dir of RUNS) {
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const r = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const c = DEF.get(r.id);
    if (!c) continue;
    if (r.error || !r.answer) {
      per.set(r.id, [...(per.get(r.id) ?? []), { error: true, ms: r.ms }]);
      continue;
    }
    per.set(r.id, [...(per.get(r.id) ?? []), { ...judge(c, r), ms: r.ms, cost: r.cost, out: r.usage?.outputTokens ?? 0, retried: r.retried, set: c.set }]);
  }
}

function summary(filter) {
  const ids = [...per.keys()].filter((id) => filter(DEF.get(id)));
  const runs = ids.flatMap((id) => per.get(id));
  const ok = runs.filter((r) => !r.error);
  const passOf = (r) => !r.error && r.verified && r.intentOk && r.fitOk && r.mismatch === 0;
  const passK = ids.filter((id) => per.get(id).every(passOf)).length;
  return {
    questions: ids.length,
    answers: runs.length,
    errors: runs.length - ok.length,
    // 정확도
    verifiedPct: pct(ok.filter((r) => r.verified).length, runs.length),
    mismatchAnswersPct: pct(ok.filter((r) => r.mismatch > 0).length, ok.length),
    // 의도와 답
    intentPct: pct(ok.filter((r) => r.intentN > 0 && r.intentOk).length, ok.filter((r) => r.intentN > 0).length),
    fitPct: pct(ok.filter((r) => r.fitN > 0 && r.fitOk).length, ok.filter((r) => r.fitN > 0).length),
    // 종합
    passPct: pct(runs.filter(passOf).length, runs.length),
    passK: `${passK}/${ids.length}`,
    passKPct: pct(passK, ids.length),
    // 속도와 비용
    p50s: Math.round(q(runs.map((r) => r.ms), 0.5) / 100) / 10,
    p90s: Math.round(q(runs.map((r) => r.ms), 0.9) / 100) / 10,
    maxS: Math.round(Math.max(...runs.map((r) => r.ms)) / 100) / 10,
    outTokens: Math.round(q(ok.map((r) => r.out), 0.5)),
    costPerQ: Math.round((ok.reduce((x, r) => x + r.cost, 0) / ok.length) * 10000) / 10000,
    retriedPct: pct(ok.filter((r) => r.retried).length, ok.length),
    // 가독성
    bubbleChars: Math.round(q(ok.map((r) => r.chars), 0.5)),
    sentences: q(ok.map((r) => r.sentences), 0.5),
    maxNumsPerSentence: q(ok.map((r) => r.maxNums), 0.5),
    avgNumsPerSentence: Math.round((ok.reduce((x, r) => x + r.avgNums, 0) / ok.length) * 10) / 10,
  };
}

const out = { runs: RUNS, golden: summary((c) => c.set === "golden"), holdout: summary((c) => c.set === "holdout") };
const rows = Object.keys(out.golden);
console.log(["항목".padEnd(20), "golden".padStart(10), "holdout".padStart(10)].join(""));
for (const k of rows) console.log([k.padEnd(20), String(out.golden[k] ?? "-").padStart(10), String(out.holdout[k] ?? "-").padStart(10)].join(""));
const failed = [...per].filter(([, rs]) => !rs.every((r) => !r.error && r.verified && r.intentOk && r.fitOk && r.mismatch === 0)).map(([id, rs]) => `${id}: ${rs.map((r) => (r.error ? "오류" : [!r.verified && "검증", !r.intentOk && "의도", !r.fitOk && "답", r.mismatch && `맥락${r.mismatch}`].filter(Boolean).join("+") || "통과")).join(" / ")}`);
if (failed.length) console.log("\n매번 통과하지 못한 질문\n" + failed.join("\n"));
const json = opt("--json");
if (json) fs.writeFileSync(json, JSON.stringify({ ...out, failed }, null, 2));
