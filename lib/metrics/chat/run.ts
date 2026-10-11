/**
 * 질문 하나를 처리한다 (#163). 라우트와 시험이 같이 쓴다.
 *
 * 1. 지시문(고정 + 오늘, 기간, 데이터 현황) 과 질문으로 모델을 부른다. 모델은 도구를 부르고 구조화된 답을 낸다
 * 2. 답의 숫자를 도구 결과와 대조한다(verify.ts)
 * 3. 걸리면 걸린 곳을 알려 주고 한 번만 다시 쓰게 한다. 도구는 다시 부르지 않는다(비용, 같은 결과)
 * 4. 그래도 걸리면 걸린 문장에 "검증 안 됨"을 붙여 보여 준다. 숨기지 않는다
 */

import { generateText, isStepCount, NoObjectGeneratedError, Output, type LanguageModel, type LanguageModelUsage, type ModelMessage } from "ai";
import { z } from "zod";
import { addDays } from "../dates.ts";
import { previousRange } from "../dashboard/data.ts";
import { METRICS } from "./catalog.ts";
import { dynamicPart, FIXED, type View } from "./instructions.ts";
import { chatTools, type Ctx } from "./tools.ts";
import { numbersIn, repairHypothesisRefs, verifyAnswer, type Answer, type Problem } from "./verify.ts";

const claim = z.object({ text: z.string(), refs: z.array(z.string()).describe("이 문장의 숫자가 나온 도구 호출의 toolCallId") });
export const answerSchema = z.object({
  headline: claim.describe("질문에 대한 답 한 문장"),
  facts: z.array(claim).describe("도구로 확인한 사실"),
  hypotheses: z
    .array(z.object({ text: z.string(), refs: z.array(z.string()).describe("이 가설을 확인하려고 부른 도구 호출의 toolCallId. 확인 못 했으면 비운다") }))
    .describe("가능한 이유. 확인하려고 돌린 비교가 있으면 그 결과를 숫자로 쓰고 인용한다. 원인으로 단정하지 않는다"),
  caveats: z.array(z.string()).describe("덜 들어온 숫자, 적은 표본 등 주의점"),
  followUps: z.array(z.string()).describe("이어서 물을 질문 2~3개"),
});

export type ToolTrace = { id: string; name: string; input: unknown; output: unknown };
export type AskResult = {
  answer: Answer;
  /** 검증을 끝내 통과 못 한 문장 자리(headline, facts[0] 등) */
  unverified: string[];
  problems: Problem[];
  retried: boolean;
  tools: ToolTrace[];
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
  steps: number;
};

const MAX_STEPS = 8;

type Step = {
  toolResults: { toolCallId: string; toolName: string; input: unknown; output: unknown }[];
  response: { messages: ModelMessage[] };
  usage: LanguageModelUsage;
};

/**
 * 모델을 부르고 단계마다 결과를 모아 둔다. 답이 정해진 JSON 모양이 아니면(중간에 잘림 등) SDK 가 generateText 에서 던지는데,
 * 그러면 앞서 부른 도구 결과까지 잃는다. 단계가 끝날 때마다 따로 모아 두어, 던져도 도구 결과와 대화는 남긴다.
 * output 이 null 이면 답 모양을 못 만든 것이다
 */
async function generate(args: Parameters<typeof generateText>[0]): Promise<{ steps: Step[]; output: Answer | null }> {
  const steps: Step[] = [];
  try {
    const r: unknown = await generateText({ ...args, onStepFinish: (st: unknown) => void steps.push(st as Step) } as never);
    return { steps, output: (r as { output: Answer }).output };
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) return { steps, output: null };
    throw e;
  }
}

/**
 * 답 글에서 마크다운 표시를 걷어 낸다. 화면은 마크다운을 그리지 않고 글자 그대로 보여 줘서,
 * 모델이 지시를 어기고 **굵게**, `코드`, 줄머리 "- " 를 넣으면 별표가 그대로 보인다. 굵기와 목록 모양은 화면이 정한다
 */
/** 도구 이름. 답 글에 나오면 지운다(괄호째) */
const TOOL_NAMES = ["metrics_summary", "metrics_compare", "metrics_daily", "metrics_breakdown", "metrics_overview", "events_list", "event_window", "event_report", "posts_list"];
const LABEL = new Map<string, string>([...METRICS.map((m) => [m.key, m.label] as const), ["appstore_way", "받은 길"]]);
/** 지표 키(appstore_new 등)를 한국어 이름으로. 긴 키부터 바꿔야 d1_return 이 d1 로 먼저 잘리지 않는다 */
const KEY_RE = new RegExp(`\\b(${[...LABEL.keys()].sort((a, b) => b.length - a.length).join("|")})\\b`, "g");
const TOOL_RE = new RegExp(`\\s?\\(?\\b(${TOOL_NAMES.join("|")})\\b\\)?`, "g");

/**
 * 답 글에서 도구 이름과 지표 키를 걷어 낸다. 지시해도 모델이 이어 묻기나 주의점에 "event_window", "(games, new_players)"를 쓴다
 * (2026-10-11 Vertex 실험 28문항 중 4문항). 화면을 보는 사람에게는 뜻 없는 영어다
 */
export function humanize(text: string): string {
  return text.replace(TOOL_RE, "").replace(KEY_RE, (k) => LABEL.get(k) ?? k);
}

export function plain(text: string): string {
  return humanize(text)
    // 도구 결과의 2026-09-09 꼴 날짜를 그대로 옮겨 써도 "9월 9일"로(실제 Gemini 평가에서 지시를 어긴 적이 있다)
    .replace(/\b\d{4}-(\d{2})-(\d{2})\b\s?/g, (_, m: string, d: string) => `${Number(m)}월 ${Number(d)}일`)
    .replace(/\*\*|__|`/g, "")
    .replace(/^\s*(?:[-*•]|\d+\.)\s+/, "")
    .replace(/^#+\s*/, "")
    .trim();
}
const clean = (a: Answer): Answer => ({
  headline: { ...a.headline, text: plain(a.headline.text) },
  facts: a.facts.map((f) => ({ ...f, text: plain(f.text) })),
  hypotheses: a.hypotheses.map((h) => ({ ...h, text: plain(h.text) })),
  caveats: a.caveats.map(plain),
  followUps: a.followUps.map(plain),
});

const addUsage = (a: AskResult["usage"], u: LanguageModelUsage) => ({
  inputTokens: a.inputTokens + (u.inputTokens ?? 0),
  outputTokens: a.outputTokens + (u.outputTokens ?? 0),
  cachedInputTokens: a.cachedInputTokens + (u.inputTokenDetails?.cacheReadTokens ?? 0),
});

export async function askMetrics(opts: {
  model: LanguageModel;
  ctx: Ctx;
  question: string;
  /** 질문할 때 화면에 걸려 있던 탭과 기간 */
  view?: View;
  providerOptions?: Record<string, Record<string, unknown>>;
}): Promise<AskResult> {
  const { model, ctx, question } = opts;
  // 데이터 현황(소스별 마지막 날)은 최근 7일 집계에 같이 들어 있다. 도구가 같은 집계를 다시 쓰면 기억해 둔 것을 쓴다
  const y = addDays(ctx.today, -1);
  const last7 = { start: addDays(y, -6), end: y };
  const status = await ctx.dashboard(last7, previousRange(last7));
  const instructions = `${FIXED}\n\n${dynamicPart(ctx.today, status, opts.view)}`;
  // 무료 등급은 분당 요청 수가 작아 두 사람이 같이 물으면 429 가 날 수 있다. SDK 가 기다렸다 다시 보내게 3번까지 둔다
  const common = { model, instructions, output: Output.object({ schema: answerSchema }), maxOutputTokens: 4096, maxRetries: 3, providerOptions: opts.providerOptions as never };

  const first = await generate({ ...common, prompt: question, tools: chatTools(ctx), stopWhen: isStepCount(MAX_STEPS) } as never);
  const tools: ToolTrace[] = first.steps.flatMap((st) => st.toolResults.map((r) => ({ id: r.toolCallId, name: r.toolName, input: r.input, output: r.output })));
  const results = new Map(tools.map((t) => [t.id, t.output]));
  // 단계마다 쌓인 메시지(도구 호출, 도구 결과, 답). 마지막 단계만 넘기면 모델이 도구 결과 없이 다시 쓰게 된다(2026-10-09 실제 데이터 시험에서 잡음)
  const history = first.steps.flatMap((st) => st.response.messages);
  let usage = first.steps.reduce((u, st) => addUsage(u, st.usage), { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 });
  let out = first.output;
  let retried = false;
  // 답이 중간에 잘렸거나 모양이 틀리면 도구 결과는 그대로 두고 한 번만 짧게 다시 쓰게 한다.
  // agy 로 돌린 실제 Gemini 평가(2026-10-10)에서 15문항 중 하나가 첫 문장 중간에서 잘렸다
  if (!out) {
    retried = true;
    const again = await generate({
      ...common,
      messages: [
        { role: "user", content: question },
        ...history,
        { role: "user", content: "답이 중간에 잘렸거나 정해진 JSON 모양이 아니었어요. 도구는 다시 부르지 말고, 위 도구 결과로 같은 내용을 더 짧게 JSON 하나로 다시 써 주세요. 사실은 다섯 문장까지." },
      ],
      stopWhen: isStepCount(1),
    } as never);
    usage = again.steps.reduce((u, st) => addUsage(u, st.usage), usage);
    out = again.output;
    if (!out) throw new Error("답 모양을 만들지 못했어요(두 번 잘림)");
  }
  let answer = clean(out);
  // 주의점과 가설은 지시문에 적힌 숫자("3~7일 늦게", 데이터 현황의 "10월 5일까지")를 말할 수 있다
  const ruleNumbers = numbersIn(instructions);
  answer = repairHypothesisRefs(answer, results);
  let check = verifyAnswer(answer, results, question, ruleNumbers);

  if (!check.ok) {
    retried = true;
    const feedback = [
      "방금 답을 코드로 검증했더니 아래 문장이 걸렸어요. 도구는 다시 부르지 말고, 위 도구 결과만으로 답 전체를 다시 써 주세요.",
      "도구 결과에 없는 숫자는 빼고, 원인을 단정하는 말은 hypotheses 로 옮기세요.",
      ...check.problems.map((p) => `- ${p.where}: "${p.text}" -> ${p.issue}`),
    ].join("\n");
    const messages: ModelMessage[] = [{ role: "user", content: question }, ...history, { role: "user", content: feedback }];
    const second = await generate({ ...common, messages, stopWhen: isStepCount(1) } as never);
    usage = second.steps.reduce((u, st) => addUsage(u, st.usage), usage);
    // 다시 쓴 답이 모양을 못 갖추면 첫 답을 그대로 두고 걸린 문장에 표시만 한다
    if (second.output) {
      answer = repairHypothesisRefs(clean(second.output), results);
      check = verifyAnswer(answer, results, question, ruleNumbers);
    }
  }
  const unverified = [...new Set(check.problems.map((p) => p.where).filter((w) => w === "headline" || w.startsWith("facts")))];
  return { answer, unverified, problems: check.problems, retried, tools, usage, steps: first.steps.length };
}

/**
 * 비용 추정(달러). Gemini API 가격표(2026-10-09, 100만 토큰당)를 쓴다. Vertex 가격 페이지는 확인하지 못했다.
 * 캐시로 읽은 입력은 캐시 단가로 센다. 생각 토큰은 출력에 들어 있다
 */
export const PRICES: Record<string, { input: number; output: number; cached: number }> = {
  "gemini-3.8-flash": { input: 0.75, output: 3.75, cached: 0.075 },
  "gemini-3.5-flash-lite": { input: 0.3, output: 2.5, cached: 0.03 },
  "gemini-3.1-flash-lite": { input: 0.25, output: 1.5, cached: 0.025 },
};
export function costUsd(modelId: string, u: AskResult["usage"]): number {
  const p = PRICES[modelId] ?? PRICES["gemini-3.8-flash"];
  const fresh = Math.max(0, u.inputTokens - u.cachedInputTokens);
  return (fresh * p.input + u.cachedInputTokens * p.cached + u.outputTokens * p.output) / 1_000_000;
}
