// 진짜 Vertex 로 운영과 같은 askMetrics 를 돌려 질문마다 답, 도구, 토큰, 비용, 시간을 남긴다 (#163). 채점은 vertex-grade.mjs.
//
// agy 평가(run.mjs)와 다른 점: 운영 경로 그대로다(AI SDK -> Vertex, 지시문은 시스템, 진짜 토큰과 비용). 그래서 크레딧이 든다(29문항 약 0.4달러).
// 게임 서버 숫자는 어드민 토큰이 있어야 읽혀서, 운영 어드민 화면에서 받아 둔 원본(--raw: { users, histories })을 쓴다.
// 받는 법: 운영 어드민에 로그인한 브라우저에서 adminUsers, adminGameHistories 를 끝까지 읽어 파일로 남긴다. 그 파일은 저장소에 넣지 않는다(사용자 id 가 있다)
//
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/chat-eval/vertex.mjs --raw <원본.json> --out <결과 폴더> [--only id,id] [--par 3] [--repeat k] [--set golden|holdout|all] [--no-record]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHEDDAR_VERSION } from "../../lib/metrics/chat/version.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "").replace(/^'|'$/g, "");
}
process.env.CHAT_MOCK = "0";
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const ONLY = opt("--only")?.split(",");
const OUT = opt("--out");
const RAW = opt("--raw");
if (!OUT || !RAW) throw new Error("--raw 와 --out 을 주세요");
const PAR = Number(opt("--par", 3));
fs.mkdirSync(OUT, { recursive: true });

const { chatModelFromEnv } = await import("../../lib/metrics/chat/model.ts");
const { askMetrics, costUsd } = await import("../../lib/metrics/chat/run.ts");
const { makeCtx } = await import("../../lib/metrics/chat/tools.ts");
const { tallyServer, staffOf } = await import("../../lib/metrics/gameServer.ts");
const { loadEventReport } = await import("../../lib/metrics/eventReportData.ts");
const { loadEvents, loadStaffAccounts } = await import("../../lib/metrics/staff.ts");
const { parseView } = await import("../../lib/metrics/chat/instructions.ts");
const { db } = await import("../../lib/metrics/db.ts");
const { todayIn, ymdRange } = await import("../../lib/metrics/dates.ts");
const { QUESTIONS: GOLDEN_SET } = await import("./vertex-questions.mjs");
const { HOLDOUT } = await import("./vertex-holdout.mjs");
// --set golden(다듬는 데 쓴 29문항) | holdout(확인용 10문항, 다듬는 데 쓰지 않는다) | all
const SET = opt("--set", "golden");
const QUESTIONS = SET === "holdout" ? HOLDOUT.map((c) => ({ ...c, set: "holdout" })) : SET === "all" ? [...GOLDEN_SET.map((c) => ({ ...c, set: "golden" })), ...HOLDOUT.map((c) => ({ ...c, set: "holdout" }))] : GOLDEN_SET.map((c) => ({ ...c, set: "golden" }));

// 게임 서버 원본. 운영진(ADMIN 권한 + 지표 화면의 운영진 계정)은 운영과 똑같이 거른다
const raw = JSON.parse(fs.readFileSync(RAW, "utf8"));
const chat = chatModelFromEnv();
const today = todayIn("Asia/Seoul");
const client = db();
const staff = staffOf(raw.users, (await loadStaffAccounts(client)).map((a) => a.userId));
const server = { ...tallyServer(raw.users, raw.histories, staff), error: null };
const allEvents = await loadEvents(client);
const truthCtx = { server, allEvents, client };
console.log(`model ${chat.modelId} today ${today} out ${OUT}`);

async function truthOf(t) {
  const d = server.daily;
  if (t.events) {
    const out = {};
    for (const id of t.events) {
      const ev = allEvents.find((e) => e.id === id);
      const r = await loadEventReport(client, ev, allEvents, server);
      out[ev.label] = { games: r.report.totals.games, unique: r.report.totals.uniqueVisitors, sum: r.report.totals.visitors };
    }
    return out;
  }
  if (t.day) return d.get(t.day)?.[t.key] ?? 0;
  if (t.start) return ymdRange(t.start, t.end).reduce((a, x) => a + (d.get(x)?.[t.key] ?? 0), 0);
  if (t.best) return [...d].sort((a, b) => b[1][t.best] - a[1][t.best])[0];
}

async function one(c, dir = OUT) {
  const ctx = makeCtx({ client, token: "", today });
  ctx.server = async () => server;
  ctx.eventReport = (event) => loadEventReport(client, event, allEvents ?? [], server);
  const t0 = Date.now();
  try {
    const r = await askMetrics({ model: chat.model, ctx, question: c.q, view: c.view ? parseView(c.view) : undefined, providerOptions: chat.providerOptions });
    const out = { id: c.id, set: c.set, kind: c.kind, q: c.q, view: c.view ?? null, ms: Date.now() - t0, cost: costUsd(chat.modelId, r.usage), truth: c.truth ? await truthOf(c.truth) : null, ...r };
    fs.writeFileSync(path.join(dir, `${c.id}.json`), JSON.stringify(out, null, 2));
    return out;
  } catch (e) {
    const out = { id: c.id, set: c.set, kind: c.kind, q: c.q, ms: Date.now() - t0, error: String(e?.message ?? e).slice(0, 500) };
    fs.writeFileSync(path.join(dir, `${c.id}.json`), JSON.stringify(out, null, 2));
    return out;
  }
}

// --repeat k: 같은 질문을 k 번(<out>/run1, run2...). 매번 맞는지(pass^k) 보려고
const REPEAT = Number(opt("--repeat", 1));
const jobs = [];
for (let k = 1; k <= REPEAT; k++) {
  const dir = REPEAT > 1 ? path.join(OUT, `run${k}`) : OUT;
  fs.mkdirSync(dir, { recursive: true });
  for (const c of QUESTIONS) if ((!ONLY || ONLY.includes(c.id)) && !fs.existsSync(path.join(dir, `${c.id}.json`))) jobs.push({ c, dir });
}
const todo = jobs;
const queue = [...todo];
const done = [];
await Promise.all(Array.from({ length: PAR }, async () => {
  for (let j = queue.shift(); j; j = queue.shift()) {
    const r = await one(j.c, j.dir);
    done.push(r);
    console.log(`${r.error ? "ERR " : "ok  "} ${r.id.padEnd(16)} ${String(Math.round(r.ms / 1000)).padStart(3)}s ${r.error ? r.error.slice(0, 120) : `$${r.cost.toFixed(4)} in ${r.usage.inputTokens} out ${r.usage.outputTokens} steps ${r.steps} retried ${r.retried} unverified ${r.unverified.length}`}`);
  }
}));

// 실험 비용도 같은 구글 지출 한도에서 빠진다. 남은 한도("이번 달 약 N번 더")가 알도록 metrics_chat_spend 에 한 줄(0011).
// 표가 없으면 알리고 넘어간다. --no-record 면 남기지 않는다
const spentUsd = done.reduce((a, r) => a + (r.cost || 0), 0);
if (done.length && !args.includes("--no-record")) {
  const label = `${path.basename(OUT)}${ONLY ? ` (${ONLY.join(",")})` : ""}${REPEAT > 1 ? ` x${REPEAT}` : ""}`;
  const rec = await client.from("metrics_chat_spend").insert({ kind: "eval", label, answers: done.length, cost_usd: spentUsd, version: CHEDDAR_VERSION, model: chat.modelId });
  console.log(rec.error ? `비용 기록 못 함(${rec.error.message}). 0011 을 실행했는지 보세요` : `비용 기록: ${label} 답 ${done.length}개 $${spentUsd.toFixed(4)}`);
}
