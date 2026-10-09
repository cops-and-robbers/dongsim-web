/**
 * 개발용 가짜 모델 (#163). Vertex 를 연결하기 전에 질문 탭 화면과 검증 흐름을 로컬에서 보려고 둔다.
 * CHAT_MOCK=1 이고 개발 서버일 때만 쓴다(model.ts). 운영에서는 켜지지 않는다.
 *
 * 진짜 도구를 진짜 데이터로 부르고(지난주와 그 전주 비교), 돌아온 숫자로 답을 만든다.
 * 질문에 "틀리게"가 들어 있으면 일부러 없는 숫자를 말해 "다시 쓰기"와 "숫자를 확인하지 못했어요" 표시를 볼 수 있다.
 */

import { MockLanguageModelV4 } from "ai/test";
import { addDays, todayIn } from "../dates.ts";

type Prompt = { role: string; content: unknown }[];

const usage = { inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 0, text: 0, reasoning: undefined } };

/** 마지막 도구 결과(JSON)를 꺼낸다 */
function lastToolOutput(prompt: Prompt): { toolCallId: string; metrics?: { key: string; label: string; unit: string; a: number | null; b: number | null; changePct: number | null }[] } | null {
  for (let i = prompt.length - 1; i >= 0; i--) {
    const m = prompt[i];
    if (m.role !== "tool" || !Array.isArray(m.content)) continue;
    for (const part of m.content as { type: string; output?: { type: string; value: unknown } }[]) {
      if (part.type === "tool-result" && part.output) return part.output.value as never;
    }
  }
  return null;
}

export function devMockModel() {
  return new MockLanguageModelV4({
    doGenerate: async ({ prompt }) => {
      const p = prompt as unknown as Prompt;
      const firstUser = JSON.stringify(p.find((m) => m.role === "user")?.content ?? "");
      const wrong = firstUser.includes("틀리게");
      const out = lastToolOutput(p);
      if (!out) {
        const y = addDays(todayIn("Asia/Seoul"), -1);
        const dow = (new Date(`${y}T00:00:00Z`).getUTCDay() + 6) % 7;
        const lastSun = addDays(y, -dow - 1);
        const input = {
          periodA: { start: addDays(lastSun, -6), end: lastSun },
          periodB: { start: addDays(lastSun, -13), end: addDays(lastSun, -7) },
          metrics: ["appstore_new", "first_open_android", "first_open_ios", "games", "signups"],
        };
        return { content: [{ type: "tool-call", toolCallId: "mock-1", toolName: "metrics_compare", input: JSON.stringify(input) }], finishReason: { unified: "tool-calls", raw: undefined }, usage, warnings: [] };
      }
      const rows = (out.metrics ?? []).filter((m) => m.a !== null && m.b !== null);
      const top = rows[0];
      const id = out.toolCallId;
      const answer = {
        headline: {
          text: top ? `지난주 ${top.label}은(는) ${wrong ? (top.a ?? 0) + 7 : top.a}${top.unit}로, 그 전주 ${top.b}${top.unit}과 비교해 ${top.changePct === null ? "비교할 수 없어요" : `${Math.abs(top.changePct)}% ${top.changePct >= 0 ? "늘었어요" : "줄었어요"}`}` : "지난주 숫자가 아직 없어요",
          refs: [id],
        },
        facts: rows.slice(1).map((m) => ({ text: `${m.label}: 지난주 ${m.a}${m.unit}, 그 전주 ${m.b}${m.unit}`, refs: [id] })),
        hypotheses: ["같은 주에 행사가 있었는지 일정을 보면 확인할 수 있어요"],
        caveats: ["개발용 가짜 모델이 만든 답이에요. 숫자는 실제 집계에서 왔어요"],
        followUps: ["지난달 행사 중에 설치와 게임이 가장 많았던 날은?", "최근 28일 설치는 어느 나라에서 왔어?"],
      };
      return { content: [{ type: "text", text: JSON.stringify(answer) }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] };
    },
  });
}
