// 지표 챗봇 골든 질문을 진짜 Gemini 로 돌려 채점한다 (#163).
//
// 운영(라우트 → AI SDK → Gemini API)과 같은 지시문, 같은 도구, 같은 답 모양, 같은 검증기를 쓰고, 모델 호출만 agy(Antigravity CLI)로 한다.
// 구독 사용량 안이라 API 키와 과금이 없다. 도구는 mcp-server.mjs 를 agy 에 MCP 로 붙여 모델이 직접 부른다.
//
// 운영과 다른 점(결과를 읽을 때 감안한다)
// - agy 는 자기 에이전트 지시문을 앞에 붙인다. 우리 지시문은 시스템이 아니라 사용자 글로 들어간다
// - 다시 쓰기(검증에 걸리면 한 번 더)는 하지 않는다. 첫 답의 통과율을 잰다
// - 게임 서버 숫자는 비어 있다(어드민 토큰 없음)
//
// 준비(한 번)
//   agy mcp add --env EVAL_LOG=<로그 파일> dongsim-metrics -- node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON <이 폴더>/mcp-server.mjs
//   ~/.gemini/antigravity-cli/settings.json 에 "permissions": { "allow": ["mcp(dongsim-metrics/*)"] } (이 서버 도구만 허용)
// 실행
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/chat-eval/run.mjs --log <로그 파일> --out <결과 폴더> [--model gemini-3.8-flash-low] [--only id,id]
// 다시 채점(모델을 다시 부르지 않고, 저장한 답과 도구 결과를 지금 검증기로)
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/chat-eval/run.mjs --rescore <결과 폴더>
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const { db } = await import("../../lib/metrics/db.ts");
const { makeCtx } = await import("../../lib/metrics/chat/tools.ts");
const { FIXED, dynamicPart, parseView } = await import("../../lib/metrics/chat/instructions.ts");
const { answerSchema, plain } = await import("../../lib/metrics/chat/run.ts");
const { verifyAnswer, numbersIn, repairHypothesisRefs } = await import("../../lib/metrics/chat/verify.ts");
const { addDays, todayIn } = await import("../../lib/metrics/dates.ts");
const { previousRange } = await import("../../lib/metrics/dashboard/data.ts");
const { GOLDEN } = await import("./golden.mjs");

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const LOG = opt("--log");
const RESCORE = opt("--rescore");
const OUT = opt("--out", path.join(os.tmpdir(), "chat-eval"));
const MODEL = opt("--model", "gemini-3.8-flash-low");
const ONLY = opt("--only")?.split(",");
if (!LOG && !RESCORE) throw new Error("--log 로 MCP 서버의 EVAL_LOG 와 같은 파일을 주세요");
fs.mkdirSync(OUT, { recursive: true });
const AGY = path.join(os.homedir(), ".agy", "bin", "agy.exe");
const schemaFile = path.join(OUT, "answer.schema.json");
const schema = z.toJSONSchema(answerSchema);
delete schema.$schema;
fs.writeFileSync(schemaFile, JSON.stringify(schema));

const today = todayIn("Asia/Seoul");
const y = addDays(today, -1);
const ctx = makeCtx({ client: db(), token: "", today });
const last7 = { start: addDays(y, -6), end: y };
const status = await ctx.dashboard(last7, previousRange(last7));

/** 첫 번째 완결된 JSON 객체를 꺼낸다(앞뒤 글, 코드 울타리, 두 번 붙은 답을 견딘다) */
function firstJson(text) {
  const s = text.indexOf("{");
  if (s < 0) return null;
  let depth = 0;
  let str = false;
  for (let i = s; i < text.length; i++) {
    const c = text[i];
    if (str) {
      if (c === "\\") i++;
      else if (c === '"') str = false;
    } else if (c === '"') str = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try {
        return JSON.parse(text.slice(s, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

const nameOk = (want, name) => (want instanceof RegExp ? want.test(name) : want === name);
const texts = (a) => [a.headline.text, ...a.facts.map((f) => f.text), ...a.caveats];

function grade(c, raw, answer, calls) {
  const checks = [];
  const add = (name, ok, note = "") => checks.push({ name, ok, note });
  add("답 모양", !!answer, answer ? "" : "스키마에 맞는 JSON 이 아님");
  if (!answer) return checks;
  const results = new Map(calls.map((t) => [t.id, t.output]));
  // 운영(run.ts)과 같은 순서: 가설 인용 고치기, 지시문 숫자 허용
  answer = repairHypothesisRefs(answer, results);
  const v = verifyAnswer(answer, results, c.q, numbersIn(FIXED));
  add("숫자 검증(첫 답)", v.ok, v.problems.map((p) => `${p.where}: ${p.issue}`).join(" / "));
  const md = /\*\*|`|^#+\s/m.test(raw);
  add("마크다운 안 씀", !md, md ? "서버가 걷어 내지만 지시를 어김" : "");
  const iso = texts(answer).some((t) => /\d{4}-\d{2}-\d{2}/.test(t));
  add("날짜를 한국어로", !iso, iso ? "2026-09-19 꼴 날짜" : "");
  for (const group of c.tools ?? []) add(`도구: ${group.join(" 또는 ")}`, calls.some((t) => group.includes(t.name)), calls.map((t) => t.name).join(","));
  if (c.call) add(`호출: ${c.call.why}`, calls.some((t) => nameOk(c.call.name, t.name) && c.call.test(t.input)), JSON.stringify(calls.map((t) => [t.name, t.input])).slice(0, 300));
  for (const re of c.says ?? []) add(`말함: ${re}`, texts(answer).some((t) => re.test(t)), answer.headline.text);
  if (c.refuse) {
    const nums = texts(answer).flatMap(numbersIn).filter((n) => n > 31);
    add("볼 수 없다고 답함", /볼 수 없|없어요|못 |어려워|알 수 없|않아요/.test(texts(answer).join(" ")) && nums.length === 0, answer.headline.text);
  }
  if (c.hypotheses) add("가설을 따로 둠", answer.hypotheses.length > 0, "");
  const cited = answer.hypotheses.filter((h) => h.refs.length).length;
  if (answer.hypotheses.length) add("가설 중 비교해 본 것", true, `${cited}/${answer.hypotheses.length}`);
  return checks;
}

if (RESCORE) {
  const out = [];
  for (const c of GOLDEN) {
    const f = path.join(RESCORE, `${c.id}.json`);
    if (!fs.existsSync(f)) continue;
    const saved = JSON.parse(fs.readFileSync(f, "utf8"));
    const checks = grade(c, JSON.stringify(saved.answer ?? ""), saved.answer, saved.toolOutputs);
    const failed = checks.filter((x) => !x.ok);
    out.push(!failed.length);
    console.log(`${failed.length ? "FAIL" : "PASS"} ${c.id}${failed.length ? ` | ${failed.map((x) => `${x.name}(${x.note})`).join(" ; ")}` : ""}`);
  }
  console.log(`
다시 채점: 통과 ${out.filter(Boolean).length}/${out.length}`);
  process.exit(0);
}

const rows = [];
for (const c of GOLDEN) {
  if (ONLY && !ONLY.includes(c.id)) continue;
  fs.writeFileSync(LOG, "");
  const view = c.view ? parseView(c.view) : undefined;
  const prompt = `${FIXED}

${dynamicPart(today, status, view)}

# 이번 실행에서 지킬 것
- 데이터는 dongsim-metrics MCP 도구로만 읽어. 파일을 읽거나 명령을 실행하거나 웹을 찾지 마
- 도구 결과의 toolCallId 를 refs 에 그대로 넣어
- 마지막 답은 주어진 JSON 스키마 하나로만 내

# 질문
${c.q}`;
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "chat-eval-"));
  const started = Date.now();
  const r = spawnSync(AGY, ["-p", prompt, "--model", MODEL, "--mode", "plan", "--sandbox", "--output-format", "json", "--json-schema", schemaFile, "--print-timeout", "5m"], {
    cwd: work,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    timeout: 6 * 60 * 1000,
  });
  fs.rmSync(work, { recursive: true, force: true });
  const seconds = Math.round((Date.now() - started) / 1000);
  let res = null;
  try {
    res = JSON.parse(r.stdout);
  } catch {
    // 아래에서 답 모양 실패로 센다
  }
  const raw = String(res?.response ?? "");
  const parsed = answerSchema.safeParse(firstJson(raw));
  const answer = parsed.success
    ? {
        headline: { ...parsed.data.headline, text: plain(parsed.data.headline.text) },
        facts: parsed.data.facts.map((f) => ({ ...f, text: plain(f.text) })),
        hypotheses: parsed.data.hypotheses.map((h) => ({ ...h, text: plain(h.text) })),
        caveats: parsed.data.caveats.map(plain),
        followUps: parsed.data.followUps.map(plain),
      }
    : null;
  const calls = fs
    .readFileSync(LOG, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const checks = grade(c, raw, answer, calls);
  const row = { id: c.id, q: c.q, seconds, tokens: res?.usage?.total_tokens ?? null, denied: res?.denied_actions ?? [], calls: calls.map((t) => ({ id: t.id, name: t.name, input: t.input, status: t.output?.status })), answer, raw: answer ? undefined : raw.slice(0, 800), checks };
  rows.push(row);
  fs.writeFileSync(path.join(OUT, `${c.id}.json`), JSON.stringify({ ...row, toolOutputs: calls }, null, 2));
  const failed = checks.filter((x) => !x.ok);
  console.log(`${failed.length ? "FAIL" : "PASS"} ${c.id} ${seconds}s ${row.tokens ?? "?"}tok tools=${calls.map((t) => t.name).join(",") || "-"}${failed.length ? ` | ${failed.map((x) => `${x.name}(${x.note})`).join(" ; ")}` : ""}`);
}
fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(rows, null, 2));
const pass = rows.filter((r) => r.checks.every((x) => x.ok)).length;
console.log(`\n통과 ${pass}/${rows.length}, 평균 ${Math.round(rows.reduce((a, r) => a + r.seconds, 0) / Math.max(1, rows.length))}초, 토큰 합 ${rows.reduce((a, r) => a + (r.tokens ?? 0), 0)}`);
