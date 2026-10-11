// 체다 다음 버전 재료 뽑기 (#163). 한 버전의 질문, 답, 신선도 평가를 묶어 읽기 좋은 글로 낸다.
// 아쉬워요, 보통이에요가 붙은 답을 먼저, 검증 안 된 문장이 있던 답과 실패한 질문을 그다음에 둔다.
// 여기서 고칠 곳(지시문, 도구, 추천 질문, 자동 완성)을 고르고, 같은 질문을 vertex-questions.mjs 에 더해 다음 버전에서 다시 잰다.
//
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/chat-eval/feedback-review.mjs [--version 1.0] [--out 파일.md]
// 사용자 id 는 "어드민 1, 2"처럼 바꿔 적는다. 결과 파일은 저장소에 넣지 않는다(질문 원문이 있다)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "").replace(/^'|'$/g, "");
}
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const { db } = await import("../../lib/metrics/db.ts");
const { CHEDDAR_VERSION } = await import("../../lib/metrics/chat/version.ts");
const { FEEDBACK_FACES, FEEDBACK_REASONS } = await import("../../lib/metrics/chat/feedback.ts");
const VERSION = opt("--version", CHEDDAR_VERSION);

const q = db().from("metrics_chat_log").select("id, created_at, user_key, question, answer, tools, unverified, error, feedback, feedback_reason, feedback_note, source, view, latency_ms, cost_usd").order("created_at");
const r = await (VERSION === "1.0" ? q.or("version.eq.1.0,version.is.null") : q.eq("version", VERSION));
if (r.error) throw new Error(r.error.message);
const rows = r.data;

const who = new Map();
const admin = (k) => (who.has(k) ? who.get(k) : who.set(k, `어드민 ${who.size + 1}`).get(k));
const face = (f) => FEEDBACK_FACES.find((x) => x.key === f)?.label ?? "평가 없음";
const reason = (k) => FEEDBACK_REASONS.find((x) => x.key === k)?.label ?? "";
const day = (iso) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

const count = (p) => rows.filter(p).length;
const rated = count((x) => x.feedback);
const lines = [
  `# 체다 ${VERSION} 돌아보기`,
  "",
  `질문 ${rows.length}개, 어드민 ${new Set(rows.map((x) => x.user_key)).size}명. 평가 ${rated}개: 만족해요 ${count((x) => x.feedback === "good")}, 보통이에요 ${count((x) => x.feedback === "meh")}, 아쉬워요 ${count((x) => x.feedback === "bad")}.`,
  `실패 ${count((x) => x.error)}개, 검증 안 된 문장이 있던 답 ${count((x) => x.unverified?.length)}개.`,
  `입력 방식: 직접 ${count((x) => x.source === "typed")}, 추천 ${count((x) => x.source === "suggestion")}, 자동 완성 ${count((x) => x.source === "autocomplete")}, 이어 묻기 ${count((x) => x.source === "followup")}.`,
  "",
];

const block = (x) => {
  const a = x.answer;
  const out = [`### ${day(x.created_at)}, ${admin(x.user_key)}, ${face(x.feedback)}${x.feedback_reason ? ` (${reason(x.feedback_reason)})` : ""}`, "", `- 질문(${x.source ?? "?"}): ${x.question}`];
  if (x.view) out.push(`- 보던 화면: ${x.view.tab} 탭, ${x.view.range?.start}~${x.view.range?.end}`);
  if (x.feedback_note) out.push(`- 메모: ${x.feedback_note}`);
  if (x.error) out.push(`- 실패: ${x.error}`);
  if (a) {
    out.push(`- 답: ${a.headline?.text}`);
    for (const f of a.facts ?? []) out.push(`  - ${f.text}`);
  }
  if (x.unverified?.length) out.push(`- 검증 안 된 곳: ${x.unverified.join(", ")}`);
  if (x.tools?.length) out.push(`- 부른 도구: ${x.tools.map((t) => t.name).join(", ")}`);
  out.push(`- ${Math.round((x.latency_ms ?? 0) / 1000)}초, $${(x.cost_usd ?? 0).toFixed(4)}`, "");
  return out;
};

const sections = [
  ["아쉬워요", (x) => x.feedback === "bad"],
  ["보통이에요", (x) => x.feedback === "meh"],
  ["실패한 질문", (x) => x.error],
  ["검증 안 된 문장이 있던 답", (x) => !x.feedback && x.unverified?.length],
];
for (const [title, pick] of sections) {
  const xs = rows.filter(pick);
  if (!xs.length) continue;
  lines.push(`## ${title} (${xs.length})`, "");
  for (const x of xs) lines.push(...block(x));
}

const text = lines.join("\n");
const out = opt("--out");
if (out) fs.writeFileSync(out, text);
else console.log(text);
