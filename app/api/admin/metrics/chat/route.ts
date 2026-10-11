import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/server/checkAdmin";
import { addDays, todayIn } from "@/lib/metrics/dates";
import { db } from "@/lib/metrics/db";
import { chatModelFromEnv } from "@/lib/metrics/chat/model";
import { parseView } from "@/lib/metrics/chat/instructions";
import { askMetrics, costUsd, type AskResult, type Progress } from "@/lib/metrics/chat/run";
import { dataSuggestions, FIXED_SUGGESTIONS } from "@/lib/metrics/chat/suggest";
import { eventsList, makeCtx, metricsCompare } from "@/lib/metrics/chat/tools";
import { FEEDBACK_REASONS, FEEDBACKS, INPUT_SOURCES, type Feedback, type InputSource } from "@/lib/metrics/chat/feedback";
import { usageOf, type LogRow } from "@/lib/metrics/chat/usage";

/**
 * 어드민 지표 챗봇 (#163). 지표 화면(/api/admin/metrics)과 같은 방식으로 어드민 토큰을 확인한다.
 *
 * GET   켜져 있는지, 남은 한도(오늘 내 몫, 이번 달 팀 예산), 추천 질문, 자동 완성에 쓸 행사 이름
 * POST  { question, view?, source? } -> 답, 검증 결과, 부른 도구, 토큰. view 는 질문할 때 화면에 걸린 탭과 기간("이 기간"을 푼다)
 *       Accept: application/x-ndjson 이면 한 줄씩 흘려 보낸다. 도구를 부를 때마다 {type:"progress"}, 끝에 {type:"done"} 또는 {type:"error"}
 *       답이 나오기까지 중앙 13초, 길면 45초라(2026-10-11 Vertex 실험) 무엇을 보고 있는지 보여 주려고 흘린다
 * PATCH { id, feedback: "good" | "meh" | "bad", reason?, note? } -> 치즈 표정으로 받은 답 평가. 애매해요, 아쉬워요에는 이유를 받는다
 *
 * 비용 상한은 세 겹이다(usage.ts). 구글 지출 한도, 여기서 세는 사람당 하루 질문 수와 이번 달 팀 비용
 */

export const maxDuration = 60;

const DAILY_LIMIT = Number(process.env.CHAT_DAILY_LIMIT ?? 30);
const MONTHLY_USD = Number(process.env.CHAT_MONTHLY_USD ?? 8);
const MAX_QUESTION = 300;

/** 하루 질문 수를 셀 사람 키. 토큰의 sub(사용자 id), 못 읽으면 토큰 해시 */
function userKey(token: string): string {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as { sub?: string | number };
    if (payload.sub !== undefined) return `u:${payload.sub}`;
  } catch {
    // JWT 가 아니면 아래로
  }
  return `t:${createHash("sha256").update(token).digest("hex").slice(0, 16)}`;
}

async function auth(req: Request): Promise<{ token: string } | NextResponse> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const admin = await checkAdmin(token);
  if (admin === "expired") return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (admin === "denied") return NextResponse.json({ error: "어드민만 볼 수 있어요." }, { status: 403 });
  return { token };
}

// 기록 표(0006 마이그레이션)를 아직 안 만든 프로젝트. PostgREST 가 "표를 못 찾았다"고 할 때의 코드
const NO_TABLE = "PGRST205";
// 0009 마이그레이션 전이라 새 칸이 없을 때
const NO_COLUMN = "PGRST204";
// 0009 전이라 feedback 칸이 아직 good, bad 만 받을 때(check 제약 위반)
const CHECK_FAILED = "23514";
const NO_TABLE_MESSAGE = "질문 기록 표(metrics_chat_log)가 아직 없어요. Supabase SQL Editor 에서 supabase/migrations/0006_metrics_chat.sql 을 한 번 실행해 주세요.";

/**
 * 이번 달(한국 날짜) 기록으로 남은 한도를 센다.
 * 기록 표가 없으면 진짜 모델에서는 멈춘다(비용 상한을 셀 수 없다). 개발용 가짜 모델(비용 0)은 표 없이도 화면을 볼 수 있게 빈 기록으로 둔다
 */
async function usage(key: string, today: string, devMock = false) {
  const dayStart = new Date(`${today}T00:00:00+09:00`).toISOString();
  const monthStart = new Date(`${today.slice(0, 8)}01T00:00:00+09:00`).toISOString();
  const month = await db().from("metrics_chat_log").select("user_key, cost_usd, error, created_at").gte("created_at", monthStart);
  if (month.error?.code === NO_TABLE && devMock) return usageOf([], key, dayStart, today, DAILY_LIMIT, MONTHLY_USD);
  if (month.error?.code === NO_TABLE) throw new Error(NO_TABLE_MESSAGE);
  if (month.error) throw new Error(`질문 기록 읽기: ${month.error.message}`);
  return usageOf(month.data as LogRow[], key, dayStart, today, DAILY_LIMIT, MONTHLY_USD);
}

/** 개발 서버 가짜 모델의 답 번호. 기록 표에 넣지 않아(운영 사용량이 부풀지 않게) 음수로 두고, 평가(PATCH)는 그냥 받는다 */
let mockId = 0;

/** 0009 의 새 칸을 넣어 보고, 아직 없으면 예전 칸만 넣는다. 가짜 모델은 넣지 않는다 */
async function insertLog(base: Record<string, unknown>, extra: Record<string, unknown>): Promise<number | null> {
  if (base.model === "dev-mock") return --mockId;
  const client = db();
  let r = await client.from("metrics_chat_log").insert({ ...base, ...extra }).select("id").single();
  if (r.error?.code === NO_COLUMN) r = await client.from("metrics_chat_log").insert(base).select("id").single();
  return (r.data as { id: number } | null)?.id ?? null;
}

export async function GET(req: Request): Promise<NextResponse> {
  const a = await auth(req);
  if (a instanceof NextResponse) return a;
  const today = todayIn("Asia/Seoul");
  const chat = chatModelFromEnv();
  const enabled = !!chat;
  try {
    const ctx = makeCtx({ client: db(), apiBase: process.env.NEXT_PUBLIC_API_BASE_URL, token: a.token, today });
    const y = addDays(today, -1);
    const last7 = { start: addDays(y, -6), end: y };
    const prev7 = { start: addDays(y, -13), end: addDays(y, -7) };
    const [cmp, ev, all, u] = await Promise.all([
      metricsCompare(ctx, last7, prev7),
      eventsList(ctx, { start: addDays(y, -13), end: y }),
      ctx.events().catch(() => null),
      chat ? usage(userKey(a.token), today, chat.modelId === "dev-mock") : Promise.resolve(null),
    ]);
    const data = cmp.status === "ok" ? dataSuggestions(cmp.metrics, ev.status === "ok" ? ev.events : []) : [];
    // 자동 완성에 쓸 행사 이름. 지난 행사만, 최근 것부터
    const events = (all ?? [])
      .filter((e) => e.category === "event" && e.day <= y)
      .sort((p, q) => q.day.localeCompare(p.day))
      .map((e) => ({ day: e.day, label: e.label }));
    return NextResponse.json(
      {
        enabled,
        usage: u,
        // 예전 화면이 읽던 값
        remainingToday: u?.remainingToday ?? DAILY_LIMIT,
        monthFull: u?.month.full ?? false,
        suggestions: [...data, ...FIXED_SUGGESTIONS],
        events,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<Response> {
  const a = await auth(req);
  if (a instanceof NextResponse) return a;
  const chat = chatModelFromEnv();
  if (!chat) return NextResponse.json({ error: "챗봇이 아직 연결되지 않았어요. docs/metrics-chat.md 의 설정을 마쳐 주세요." }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { question?: unknown; view?: unknown; source?: unknown };
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) return NextResponse.json({ error: "질문을 적어 주세요." }, { status: 400 });
  if (question.length > MAX_QUESTION) return NextResponse.json({ error: `질문은 ${MAX_QUESTION}자까지 적을 수 있어요.` }, { status: 400 });
  const source: InputSource = INPUT_SOURCES.includes(body.source as InputSource) ? (body.source as InputSource) : "typed";
  const view = parseView(body.view);

  const today = todayIn("Asia/Seoul");
  const key = userKey(a.token);
  const client = db();
  try {
    const u = await usage(key, today, chat.modelId === "dev-mock");
    if (u.remainingToday <= 0) return NextResponse.json({ error: `오늘 질문 ${DAILY_LIMIT}개를 다 썼어요. 내일 다시 물어봐 주세요.` }, { status: 429 });
    if (u.month.full) return NextResponse.json({ error: "이번 달 챗봇 예산을 다 썼어요. 다음 달 1일에 다시 열려요." }, { status: 429 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }

  // 무료 등급은 보낸 내용이 구글 개선에 쓰여 광고 수익은 보내지 않는다(model.ts)
  const ctx = makeCtx({ client, apiBase: process.env.NEXT_PUBLIC_API_BASE_URL, token: a.token, today, redact: chat.free ? new Set(["ad_earnings_usd"]) : undefined });
  const started = Date.now();
  const base = { user_key: key, question, model: chat.modelId };
  const extra = { source, view: view ?? null };

  /** 답을 만들고 기록한다. 실패한 질문도 남긴다(하루 질문 수에 들어간다). 같은 질문을 계속 다시 보내 비용이 새는 것을 막는다 */
  const run = async (onProgress?: (p: Progress) => void) => {
    let r: AskResult;
    try {
      r = await askMetrics({ model: chat.model, ctx, question, view, providerOptions: chat.providerOptions, onProgress });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await insertLog({ ...base, error: message.slice(0, 500) }, { ...extra, latency_ms: Date.now() - started });
      throw e;
    }
    const cost = chat.free ? 0 : costUsd(chat.modelId, r.usage);
    const id = await insertLog(
      {
        ...base,
        answer: r.answer,
        tools: r.tools,
        unverified: r.unverified,
        retried: r.retried,
        input_tokens: r.usage.inputTokens,
        output_tokens: r.usage.outputTokens,
        cached_tokens: r.usage.cachedInputTokens,
        cost_usd: cost,
      },
      { ...extra, latency_ms: Date.now() - started, steps: r.steps, tool_names: [...new Set(r.tools.map((t) => t.name))], reasoning_tokens: r.usage.reasoningTokens },
    );
    return { id, ...r, costUsd: cost };
  };
  const failed = (e: unknown) => ({ error: "답을 만들지 못했어요. 잠시 뒤 다시 물어봐 주세요.", detail: (e instanceof Error ? e.message : String(e)).slice(0, 300) });

  if (!req.headers.get("accept")?.includes("application/x-ndjson")) {
    try {
      return NextResponse.json(await run(), { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      return NextResponse.json(failed(e), { status: 502 });
    }
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (x: unknown) => controller.enqueue(enc.encode(`${JSON.stringify(x)}\n`));
      try {
        const out = await run((p) => send({ type: "progress", ...p }));
        send({ type: "done", ...out });
      } catch (e) {
        send({ type: "error", ...failed(e) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function PATCH(req: Request): Promise<NextResponse> {
  const a = await auth(req);
  if (a instanceof NextResponse) return a;
  const body = (await req.json().catch(() => ({}))) as { id?: unknown; feedback?: unknown; reason?: unknown; note?: unknown };
  if (typeof body.id !== "number" || !FEEDBACKS.includes(body.feedback as Feedback)) return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  const feedback = body.feedback as Feedback;
  if ((body.id as number) < 0) return NextResponse.json({ ok: true }); // 가짜 모델의 답(기록하지 않았다)
  const reason = FEEDBACK_REASONS.some((r) => r.key === body.reason) ? (body.reason as string) : null;
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 300) : null;
  // 자기 질문에만 평가를 남긴다. 표정을 바꾸면 덮어쓴다
  const update = (fields: Record<string, unknown>) => db().from("metrics_chat_log").update(fields).eq("id", body.id as number).eq("user_key", userKey(a.token));
  let r = await update({ feedback, feedback_reason: reason, feedback_note: note, feedback_at: new Date().toISOString() });
  // 0009 전: 새 칸이 없거나 feedback 이 good, bad 만 받는다. 애매해요는 남길 곳이 없어 아쉬워요 쪽으로 두지 않고 그냥 비운다
  if (r.error?.code === NO_COLUMN || r.error?.code === CHECK_FAILED) r = feedback === "meh" ? { error: null } as typeof r : await update({ feedback });
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
