/**
 * 개발용 가짜 모델 (#163). Gemini 를 연결하기 전에 물어보기 화면과 검증 흐름을 로컬에서 보려고 둔다.
 * CHAT_MOCK=1 이고 개발 서버일 때만 쓴다(model.ts). 운영에서는 켜지지 않는다.
 *
 * 진짜 도구를 진짜 데이터로 부르고, 돌아온 숫자로 답을 만든다.
 * - "전체", "지금까지", "누적", "추세", "언제"가 들어 있으면 수집 시작부터 어제까지 훑어보기(metrics_overview)
 * - 그 밖에는 지난주와 그 전주 비교(metrics_compare)와 같은 기간 일정(events_list)을 함께 부르고, 일정을 인용한 가설을 단다
 * - 질문에 "틀리게"가 들어 있으면 일부러 없는 숫자를 말해 "다시 쓰기"와 "숫자를 확인하지 못했어요" 표시를 볼 수 있다
 */

import { eunNeun } from "./josa.ts";
import { MockLanguageModelV4 } from "ai/test";
import { addDays, todayIn } from "../dates.ts";
import { DATA_FROM } from "./periods.ts";

type Prompt = { role: string; content: unknown }[];
type Out = Record<string, unknown> & { toolCallId: string };

const usage = { inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 0, text: 0, reasoning: undefined } };
const md = (ymd: string) => `${Number(ymd.slice(5, 7))}월 ${Number(ymd.slice(8))}일`;

/** 지금까지 받은 도구 결과(JSON) 전부 */
function toolOutputs(prompt: Prompt): Out[] {
  const out: Out[] = [];
  for (const m of prompt) {
    if (m.role !== "tool" || !Array.isArray(m.content)) continue;
    for (const part of m.content as { type: string; output?: { type: string; value: unknown } }[]) {
      if (part.type === "tool-result" && part.output) out.push(part.output.value as Out);
    }
  }
  return out;
}

const call = (id: string, name: string, input: unknown) => ({ type: "tool-call" as const, toolCallId: id, toolName: name, input: JSON.stringify(input) });

export function devMockModel() {
  return new MockLanguageModelV4({
    doGenerate: async ({ prompt }) => {
      const p = prompt as unknown as Prompt;
      const question = JSON.stringify(p.find((m) => m.role === "user")?.content ?? "");
      const wrong = question.includes("틀리게");
      const wide = /전체|지금까지|누적|추세|언제/.test(question);
      const outs = toolOutputs(p);
      const y = addDays(todayIn("Asia/Seoul"), -1);
      const dow = (new Date(`${y}T00:00:00Z`).getUTCDay() + 6) % 7;
      const lastSun = addDays(y, -dow - 1);
      const lastWeek = { start: addDays(lastSun, -6), end: lastSun };

      if (!outs.length) {
        const content = wide
          ? [call("mock-1", "metrics_overview", { period: { start: DATA_FROM, end: y }, metrics: ["appstore_new", "play_installs", "signups", "new_players", "games"] })]
          : [
              call("mock-1", "metrics_compare", {
                periodA: lastWeek,
                periodB: { start: addDays(lastSun, -13), end: addDays(lastSun, -7) },
                metrics: ["appstore_new", "first_open_android", "first_open_ios", "games", "signups"],
              }),
              call("mock-2", "events_list", { period: { start: addDays(lastSun, -13), end: lastSun } }),
            ];
        return { content, finishReason: { unified: "tool-calls", raw: undefined }, usage, warnings: [] };
      }

      const main = outs.find((o) => o.toolCallId === "mock-1") ?? outs[0];
      const ev = outs.find((o) => o.toolCallId === "mock-2");
      const events = ((ev?.events as { day: string; label: string }[] | undefined) ?? []).slice(0, 2);
      let answer;
      if (Array.isArray(main.movers)) {
        const metrics = (main.metrics as { key: string; label: string; unit: string; total: number | null }[]).filter((m) => m.total !== null);
        const movers = main.movers as { label: string; unit: string; period: { start: string; end: string }; value: number; before: number; changePct: number }[];
        const top = movers[0];
        answer = {
          headline: {
            text: metrics[0] ? `수집을 시작한 뒤 지금까지 ${eunNeun(metrics[0].label)} 모두 ${wrong ? metrics[0].total! + 9 : metrics[0].total}${metrics[0].unit}이에요` : "아직 숫자가 없어요",
            refs: ["mock-1"],
          },
          facts: [
            ...metrics.slice(1, 3).map((m) => ({ text: `${eunNeun(m.label)} 모두 ${m.total}${m.unit}이에요`, refs: ["mock-1"] })),
            ...(top ? [{ text: `가장 크게 움직인 주는 ${md(top.period.start)}부터의 ${top.label}로, 앞 주 ${top.before}${top.unit}에서 ${top.value}${top.unit}로 ${Math.abs(top.changePct)}% ${top.changePct > 0 ? "늘었어요" : "줄었어요"}`, refs: ["mock-1"] }] : []),
          ],
          hypotheses: top ? [{ text: `${md(top.period.start)} 주의 일정과 함께 나타난 변화일 수 있어요. 그 주의 받은 길을 나눠 보면 더 볼 수 있어요`, refs: [] }] : [],
          caveats: ["개발용 가짜 모델이 만든 답이에요. 숫자는 실제 집계에서 왔어요"],
          followUps: top ? [`${md(top.period.start)}부터 일주일 App Store 설치는 어떤 길로 왔어?`] : [],
        };
      } else {
        const rows = ((main.metrics as { label: string; unit: string; a: number | null; b: number | null; changePct: number | null }[] | undefined) ?? []).filter((m) => m.a !== null && m.b !== null);
        const top = rows[0];
        answer = {
          headline: {
            text: top
              ? `지난주 ${eunNeun(top.label)} ${wrong ? (top.a ?? 0) + 7 : top.a}${top.unit}로, 그 전주 ${top.b}${top.unit}과 비교해 ${top.changePct === null ? "비교할 수 없어요" : `${Math.abs(top.changePct)}% ${top.changePct >= 0 ? "늘었어요" : "줄었어요"}`}`
              : "지난주 숫자가 아직 없어요",
            refs: ["mock-1"],
          },
          facts: rows.slice(1).map((m) => ({ text: `${eunNeun(m.label)} 지난주 ${m.a}${m.unit}, 그 전주 ${m.b}${m.unit}이에요`, refs: ["mock-1"] })),
          hypotheses: events.length
            ? [{ text: `같은 2주 사이에 ${events.map((e) => `${md(e.day)} ${e.label}`).join(", ")} 일정이 있었어요. 그 일정과 함께 나타난 변화일 수 있어요`, refs: ["mock-2"] }]
            : [{ text: "같은 2주 사이에 등록된 일정은 없어요. 인스타 게시물이나 검색 유입을 나눠 보면 더 볼 수 있어요", refs: [] }],
          caveats: ["개발용 가짜 모델이 만든 답이에요. 숫자는 실제 집계에서 왔어요"],
          followUps: ["지금까지 App Store 설치가 가장 많았던 주는 언제야?", "최근 28일 설치는 어느 나라에서 왔어?"],
        };
      }
      return { content: [{ type: "text", text: JSON.stringify(answer) }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] };
    },
  });
}
