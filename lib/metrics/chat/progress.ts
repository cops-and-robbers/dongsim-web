/**
 * 답을 기다리는 동안 치즈가 하는 말 (#163). 라우트가 흘려 보내는 진행 신호(run.ts Progress)를 한 줄씩 바꾼다.
 *
 * "분석 중", "생각하는 중" 같은 말은 쓰지 않는다. 무엇을 꺼내 봤는지 그대로 말한다.
 * 기다리는 13초(중앙, 2026-10-11 실험) 동안 무엇을 보고 있는지 알면 덜 답답하고, 답의 근거가 어디서 왔는지도 미리 보인다
 */

const TOOL_LINE: Record<string, string> = {
  metrics_summary: "기간 합계를 꺼냈어요",
  metrics_compare: "두 기간 숫자를 나란히 놓았어요",
  metrics_daily: "날짜별 숫자를 꺼냈어요",
  metrics_breakdown: "어디서 왔는지 나눠 봤어요",
  metrics_overview: "지금까지 흐름을 훑었어요",
  events_list: "그 기간 일정을 찾았어요",
  event_window: "행사 앞뒤를 견줘 봤어요",
  event_report: "행사 성적표를 펼쳤어요",
  posts_list: "올린 게시물을 찾았어요",
};

export type ProgressEvent = { kind: "tool"; name: string } | { kind: "check" } | { kind: "rewrite" };

/** 지금까지 받은 신호로 화면에 보일 줄. 같은 도구를 잇달아 부르면 한 줄로 */
export function progressLines(events: ProgressEvent[]): string[] {
  const out: string[] = [];
  for (const e of events) {
    const line = e.kind === "tool" ? (TOOL_LINE[e.name] ?? "숫자를 하나 더 꺼냈어요") : e.kind === "check" ? "답에 쓴 숫자를 한 번 더 맞춰 봤어요" : "안 맞는 숫자가 있어 다시 쓰고 있어요";
    if (out.at(-1) !== line) out.push(line);
  }
  return out;
}

/** 오래 걸릴 때 덧붙이는 말. 20초가 넘으면 기다려 달라고, 40초가 넘으면 거의 다 됐다고 하지 않고 그대로 알린다 */
export function waitingLine(seconds: number): string | null {
  if (seconds >= 40) return "평소보다 오래 걸리고 있어요. 1분이 지나면 멈추고 알려 드릴게요";
  if (seconds >= 20) return "숫자가 꽤 많네요. 조금만 더 기다려 주세요";
  return null;
}
