import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/server/checkAdmin";
import { addDays, todayIn } from "@/lib/metrics/dates";
import { db } from "@/lib/metrics/db";
import { chatModelFromEnv } from "@/lib/metrics/chat/model";
import { askMetrics, costUsd } from "@/lib/metrics/chat/run";
import { dataSuggestions, FIXED_SUGGESTIONS } from "@/lib/metrics/chat/suggest";
import { eventsList, makeCtx, metricsCompare } from "@/lib/metrics/chat/tools";

/**
 * 어드민 지표 챗봇 (#163). 지표 화면(/api/admin/metrics)과 같은 방식으로 어드민 토큰을 확인한다.
 *
 * GET   켜져 있는지, 오늘 남은 질문 수, 추천 질문
 * POST  { question } -> 답, 검증 결과, 부른 도구, 토큰
 * PATCH { id, feedback: "good" | "bad" } -> 답 평가 (골든 질문 후보)
 *
 * 비용 상한은 두 겹이다. 프로젝트의 Spend Cap 과, 여기서 세는 사람당 하루 질문 수와 이번 달 비용 합계
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

/** 오늘(한국 날짜) 이 사람이 한 질문 수와 이번 달 전체 비용 */
async function usage(key: string, today: string) {
  const client = db();
  const dayStart = new Date(`${today}T00:00:00+09:00`).toISOString();
  const monthStart = new Date(`${today.slice(0, 8)}01T00:00:00+09:00`).toISOString();
  const [mine, month] = await Promise.all([
    client.from("metrics_chat_log").select("id", { count: "exact", head: true }).eq("user_key", key).gte("created_at", dayStart),
    client.from("metrics_chat_log").select("cost_usd").gte("created_at", monthStart),
  ]);
  if (mine.error) throw new Error(`질문 기록 읽기: ${mine.error.message}`);
  if (month.error) throw new Error(`비용 기록 읽기: ${month.error.message}`);
  const spent = (month.data as { cost_usd: number }[]).reduce((a, r) => a + r.cost_usd, 0);
  return { usedToday: mine.count ?? 0, spentMonth: spent };
}

export async function GET(req: Request): Promise<NextResponse> {
  const a = await auth(req);
  if (a instanceof NextResponse) return a;
  const today = todayIn("Asia/Seoul");
  const enabled = !!chatModelFromEnv();
  try {
    const ctx = makeCtx({ client: db(), apiBase: process.env.NEXT_PUBLIC_API_BASE_URL, token: a.token, today });
    const y = addDays(today, -1);
    const last7 = { start: addDays(y, -6), end: y };
    const prev7 = { start: addDays(y, -13), end: addDays(y, -7) };
    const [cmp, ev, u] = await Promise.all([
      metricsCompare(ctx, last7, prev7),
      eventsList(ctx, { start: addDays(y, -13), end: y }),
      enabled ? usage(userKey(a.token), today) : Promise.resolve({ usedToday: 0, spentMonth: 0 }),
    ]);
    const data = cmp.status === "ok" ? dataSuggestions(cmp.metrics, ev.status === "ok" ? ev.events : []) : [];
    return NextResponse.json(
      { enabled, remainingToday: Math.max(0, DAILY_LIMIT - u.usedToday), monthFull: u.spentMonth >= MONTHLY_USD, suggestions: [...data, ...FIXED_SUGGESTIONS] },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  const a = await auth(req);
  if (a instanceof NextResponse) return a;
  const chat = chatModelFromEnv();
  if (!chat) return NextResponse.json({ error: "챗봇이 아직 연결되지 않았어요. docs/metrics-chat.md 의 설정을 마쳐 주세요." }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { question?: unknown };
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) return NextResponse.json({ error: "질문을 적어 주세요." }, { status: 400 });
  if (question.length > MAX_QUESTION) return NextResponse.json({ error: `질문은 ${MAX_QUESTION}자까지 적을 수 있어요.` }, { status: 400 });

  const today = todayIn("Asia/Seoul");
  const key = userKey(a.token);
  const client = db();
  try {
    const u = await usage(key, today);
    if (u.usedToday >= DAILY_LIMIT) return NextResponse.json({ error: `오늘 질문 ${DAILY_LIMIT}개를 다 썼어요. 내일 다시 물어봐 주세요.` }, { status: 429 });
    if (u.spentMonth >= MONTHLY_USD) return NextResponse.json({ error: "이번 달 챗봇 예산을 다 썼어요. 다음 달 1일에 다시 열려요." }, { status: 429 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }

  // 무료 등급은 보낸 내용이 구글 개선에 쓰여 광고 수익은 보내지 않는다(model.ts)
  const ctx = makeCtx({ client, apiBase: process.env.NEXT_PUBLIC_API_BASE_URL, token: a.token, today, redact: chat.free ? new Set(["ad_earnings_usd"]) : undefined });
  try {
    const r = await askMetrics({ model: chat.model, ctx, question, providerOptions: chat.providerOptions });
    const cost = chat.free ? 0 : costUsd(chat.modelId, r.usage);
    const log = await client
      .from("metrics_chat_log")
      .insert({
        user_key: key,
        question,
        answer: r.answer,
        tools: r.tools,
        unverified: r.unverified,
        retried: r.retried,
        model: chat.modelId,
        input_tokens: r.usage.inputTokens,
        output_tokens: r.usage.outputTokens,
        cached_tokens: r.usage.cachedInputTokens,
        cost_usd: cost,
      })
      .select("id")
      .single();
    return NextResponse.json({ id: log.data?.id ?? null, ...r, costUsd: cost }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // 실패한 질문도 남긴다(하루 질문 수에 들어간다). 같은 질문을 계속 다시 보내 비용이 새는 것을 막는다
    await client.from("metrics_chat_log").insert({ user_key: key, question, model: chat.modelId, error: message.slice(0, 500) });
    return NextResponse.json({ error: "답을 만들지 못했어요. 잠시 뒤 다시 물어봐 주세요.", detail: message.slice(0, 300) }, { status: 502 });
  }
}

export async function PATCH(req: Request): Promise<NextResponse> {
  const a = await auth(req);
  if (a instanceof NextResponse) return a;
  const body = (await req.json().catch(() => ({}))) as { id?: unknown; feedback?: unknown };
  if (typeof body.id !== "number" || (body.feedback !== "good" && body.feedback !== "bad")) return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  // 자기 질문에만 평가를 남긴다
  const r = await db().from("metrics_chat_log").update({ feedback: body.feedback }).eq("id", body.id).eq("user_key", userKey(a.token));
  if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
