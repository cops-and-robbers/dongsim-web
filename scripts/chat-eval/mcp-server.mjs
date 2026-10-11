// 지표 챗봇 평가용 MCP 서버 (#163). 운영 챗봇과 같은 도구 7개(lib/metrics/chat/tools.ts chatTools)를 MCP 로 연다.
// agy(Antigravity CLI)의 Gemini 가 이 도구를 직접 불러 실제 Supabase 숫자로 답하게 해서, 진짜 모델의 판단(도구 고르기, 인용, 말투)을 잰다.
//
// - 읽기만 한다. .env.local 의 Supabase 키로 지표 표를 읽고, 아무것도 쓰지 않는다
// - 무료 등급과 같이 광고 수익은 보내지 않는다(구독 경유도 구글로 가는 데이터라서)
// - 게임 서버(가입, 판 수)는 어드민 토큰이 있어야 해서 비어 있다. 모델이 "못 읽었다"고 말하는지가 시험 항목이다
// - 부를 때마다 결과에 toolCallId(t1, t2, ...)를 붙이고, EVAL_LOG 파일에 한 줄씩 남긴다. 채점기가 이 기록으로 답의 인용을 검증한다
// - MCP 는 표준 입출력 위의 JSON-RPC 다. 표준 출력에는 JSON-RPC 만 쓰고, 나머지는 표준 오류로
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const { db } = await import("../../lib/metrics/db.ts");
const { chatTools, makeCtx } = await import("../../lib/metrics/chat/tools.ts");
const { todayIn } = await import("../../lib/metrics/dates.ts");

const ctx = makeCtx({ client: db(), token: "", today: todayIn("Asia/Seoul"), redact: new Set(["ad_earnings_usd"]) });
const tools = chatTools(ctx);
const LOG = process.env.EVAL_LOG;
let n = 0;

const send = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");
const list = Object.entries(tools).map(([name, t]) => {
  const schema = z.toJSONSchema(t.inputSchema);
  delete schema.$schema;
  return { name, description: t.description, inputSchema: schema };
});

async function handle(req) {
  const { id, method, params } = req;
  if (method === "initialize")
    return send({ jsonrpc: "2.0", id, result: { protocolVersion: params?.protocolVersion ?? "2025-06-18", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "dongsim-metrics", version: "1.0.0" } } });
  if (method === "notifications/initialized" || id === undefined) return;
  if (method === "ping") return send({ jsonrpc: "2.0", id, result: {} });
  if (method === "tools/list") return send({ jsonrpc: "2.0", id, result: { tools: list } });
  if (method === "tools/call") {
    const t = tools[params?.name];
    if (!t) return send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: `없는 도구예요: ${params?.name}` }], isError: true } });
    const callId = `t${++n}`;
    const input = params.arguments ?? {};
    const parsed = t.inputSchema.safeParse(input);
    if (!parsed.success) {
      const message = `입력이 도구 모양과 달라요: ${parsed.error.message.slice(0, 300)}`;
      if (LOG) fs.appendFileSync(LOG, JSON.stringify({ id: callId, name: params.name, input, output: { status: "unsupported", message } }) + "\n");
      return send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: message }], isError: true } });
    }
    try {
      const output = await t.execute(parsed.data, { toolCallId: callId, messages: [] });
      if (LOG) fs.appendFileSync(LOG, JSON.stringify({ id: callId, name: params.name, input: parsed.data, output }) + "\n");
      return send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(output) }] } });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      process.stderr.write(`tool error ${params.name}: ${message}\n`);
      return send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: `도구 실행 실패: ${message}` }], isError: true } });
    }
  }
  return send({ jsonrpc: "2.0", id, error: { code: -32601, message: `method not found: ${method}` } });
}

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (!line.trim()) return;
  let req;
  try {
    req = JSON.parse(line);
  } catch {
    return;
  }
  handle(req).catch((e) => process.stderr.write(`handle error: ${e}\n`));
});
