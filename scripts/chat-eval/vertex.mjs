// 진짜 Vertex 로 운영과 같은 askMetrics 를 돌려 질문마다 답, 도구, 토큰, 비용, 시간을 남긴다 (#163). 채점은 vertex-grade.mjs.
//
// agy 평가(run.mjs)와 다른 점: 운영 경로 그대로다(AI SDK -> Vertex, 지시문은 시스템, 진짜 토큰과 비용). 그래서 크레딧이 든다(29문항 약 0.4달러).
// 게임 서버 숫자는 어드민 토큰이 있어야 읽혀서, 운영 어드민 화면에서 받아 둔 원본(--raw: { users, histories })을 쓴다.
// 받는 법: 운영 어드민에 로그인한 브라우저에서 adminUsers, adminGameHistories 를 끝까지 읽어 파일로 남긴다. 그 파일은 저장소에 넣지 않는다(사용자 id 가 있다)
//
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/chat-eval/vertex.mjs --raw <원본.json> --out <결과 폴더> [--only id,id] [--par 3]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const { QUESTIONS } = await import("./vertex-questions.mjs");

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

async function one(c) {
  const ctx = makeCtx({ client, token: "", today });
  ctx.server = async () => server;
  ctx.eventReport = (event) => loadEventReport(client, event, allEvents ?? [], server);
  const t0 = Date.now();
  try {
    const r = await askMetrics({ model: chat.model, ctx, question: c.q, view: c.view ? parseView(c.view) : undefined, providerOptions: chat.providerOptions });
    const out = { id: c.id, kind: c.kind, q: c.q, view: c.view ?? null, ms: Date.now() - t0, cost: costUsd(chat.modelId, r.usage), truth: c.truth ? await truthOf(c.truth) : null, ...r };
    fs.writeFileSync(path.join(OUT, `${c.id}.json`), JSON.stringify(out, null, 2));
    return out;
  } catch (e) {
    const out = { id: c.id, kind: c.kind, q: c.q, ms: Date.now() - t0, error: String(e?.message ?? e).slice(0, 500) };
    fs.writeFileSync(path.join(OUT, `${c.id}.json`), JSON.stringify(out, null, 2));
    return out;
  }
}

const todo = QUESTIONS.filter((c) => !ONLY || ONLY.includes(c.id)).filter((c) => !fs.existsSync(path.join(OUT, `${c.id}.json`)));
const queue = [...todo];
await Promise.all(Array.from({ length: PAR }, async () => {
  for (let c = queue.shift(); c; c = queue.shift()) {
    const r = await one(c);
    console.log(`${r.error ? "ERR " : "ok  "} ${r.id.padEnd(16)} ${String(Math.round(r.ms / 1000)).padStart(3)}s ${r.error ? r.error.slice(0, 120) : `$${r.cost.toFixed(4)} in ${r.usage.inputTokens} out ${r.usage.outputTokens} steps ${r.steps} retried ${r.retried} unverified ${r.unverified.length}`}`);
  }
}));
