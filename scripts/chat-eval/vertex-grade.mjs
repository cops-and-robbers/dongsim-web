// vertex.mjs 결과를 채점한다(모델을 다시 부르지 않는다) (#163): 골든 기준, 코드로 센 정답, 답 글의 영어 이름, 비용과 시간 요약
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/chat-eval/vertex-grade.mjs <결과 폴더>
import fs from "node:fs";
import path from "node:path";
const DIR = process.argv[2];
const { QUESTIONS } = await import("./vertex-questions.mjs");
const nameOk = (want, name) => (want instanceof RegExp ? want.test(name) : want === name);
const texts = (a) => [a.headline.text, ...a.facts.map((f) => f.text), ...a.caveats];
const rows = [];
let cost = 0, ms = [], inTok = 0, outTok = 0;
for (const c of QUESTIONS) {
  const f = path.join(DIR, `${c.id}.json`);
  if (!fs.existsSync(f)) continue;
  const r = JSON.parse(fs.readFileSync(f, "utf8"));
  if (r.error) { rows.push([c.id, "ERR", r.error.slice(0, 80)]); continue; }
  cost += r.cost; ms.push(r.ms); inTok += r.usage.inputTokens; outTok += r.usage.outputTokens;
  const fails = [];
  const calls = r.tools;
  for (const g of c.tools ?? []) if (!calls.some((t) => g.includes(t.name))) fails.push(`도구 ${g.join("|")}`);
  if (c.call && !calls.some((t) => nameOk(c.call.name, t.name) && c.call.test(t.input))) fails.push(`호출 ${c.call.why}`);
  for (const re of c.says ?? []) if (!texts(r.answer).some((t) => re.test(t))) fails.push(`말함 ${re}`);
  if (c.refuse && !/볼 수 없|수 없어요|수 없는|못 |어려워|알 수 없|않아요|불가능/.test(r.answer.headline.text)) fails.push("거절");
  const leak = texts(r.answer).concat(r.answer.followUps, r.answer.hypotheses.map((h) => h.text)).filter((t) => /\b[a-z]+_[a-z_]+\b/.test(t));
  if (leak.length) fails.push(`영어 이름 ${leak.length}`);
  if (c.hypotheses && !r.answer.hypotheses.length) fails.push("가설 없음");
  if (r.truth && typeof r.truth === "object" && !Array.isArray(r.truth)) {
    const all = texts(r.answer).concat(r.answer.hypotheses.map((h) => h.text)).join(" ");
    for (const [label, v] of Object.entries(r.truth)) if (v.unique !== null && !all.includes(`${v.unique}명`)) fails.push(`${label} 만난 사람 ${v.unique}명 없음`);
  } else if (r.truth !== null && r.truth !== undefined) {
    const want = Array.isArray(r.truth) ? [String(Number(r.truth[0].slice(5, 7))) + "월 " + Number(r.truth[0].slice(8)) + "일", String(r.truth[1].games)] : [String(r.truth)];
    const all = texts(r.answer).join(" ");
    for (const w of want) if (!all.includes(w)) fails.push(`정답 ${w} 없음`);
  }
  if (r.unverified.length) fails.push(`검증 안 됨 ${r.unverified.join(",")}`);
  rows.push([c.id, fails.length ? "FAIL" : "PASS", fails.join(" ; ")]);
}
for (const r of rows) console.log(r[1].padEnd(5), r[0].padEnd(16), r[2]);
ms.sort((a, b) => a - b);
console.log(`\n${rows.filter((r) => r[1] === "PASS").length}/${rows.length} PASS | 합계 $${cost.toFixed(4)} (문항당 평균 $${(cost / ms.length).toFixed(4)}) | 시간 중앙 ${Math.round(ms[ms.length >> 1] / 1000)}s 최대 ${Math.round(ms.at(-1) / 1000)}s | 토큰 in ${inTok} out ${outTok}`);
