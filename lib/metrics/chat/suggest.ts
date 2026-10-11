/**
 * 추천 질문 (#163). 모델이 아니라 규칙으로 만든다(토큰 0).
 * 고정 질문 몇 개에, 최근 7일이 그 앞 7일보다 크게 움직인 지표와 최근 행사로 만든 질문을 더한다.
 * GA4 Insights 처럼 "숫자가 움직인 곳이 질문이 된다"는 생각이다.
 */

import { LOW_SAMPLE } from "./catalog.ts";
import { iGa } from "./josa.ts";

type CompareRow = { key: string; label: string; a: number | null; b: number | null; changePct: number | null };

/**
 * 탭마다 먼저 보여 줄 질문. 챗봇 패널은 어느 탭에서든 열려서, 지금 보는 탭에 맞는 질문을 앞에 둔다.
 * "이 기간"은 서버가 화면에서 보던 기간으로 푼다(instructions.ts 화면에서 보고 있는 것). 모두 도구로 답할 수 있는 질문만
 */
export const TAB_SUGGESTIONS: Record<"summary" | "instagram" | "traffic" | "store" | "app", string[]> = {
  summary: ["이 기간을 이전 기간과 비교해 줘", "이 기간 앱 첫 실행이 가장 많았던 날은?"],
  instagram: ["이 기간 인스타 조회수가 가장 많았던 날은?", "이 기간 인스타에서 온 사이트 방문은 이전 기간보다 늘었어?"],
  traffic: ["이 기간 사이트 방문은 어느 채널에서 왔어?", "이 기간 스토어로 이동은 이전 기간보다 늘었어?"],
  store: ["이 기간 설치는 어느 나라에서 왔어?", "이 기간 App Store 설치는 검색과 링크 중 어디로 더 왔어?"],
  app: ["이 기간 가입과 진행된 게임은 이전 기간과 비교해 어땠어?", "이 기간 광고 노출은 이전 기간보다 늘었어?"],
};

export const FIXED_SUGGESTIONS = ["지난주와 그 전주를 비교해 줘", "지난달 행사 중에 설치와 게임이 가장 많았던 날은?", "최근 28일 설치는 어느 나라에서 왔어?"];

/** 크게 움직인 지표(둘 다 표본이 충분하고 50% 넘게 변함) 최대 2개와 최근 14일 행사 1개 */
export function dataSuggestions(rows: CompareRow[], events: { day: string; label: string }[]): string[] {
  const moved = rows
    .filter((r) => r.a !== null && r.b !== null && r.changePct !== null && Math.min(r.a, r.b) >= LOW_SAMPLE && Math.abs(r.changePct) >= 50)
    .sort((x, y) => Math.abs(y.changePct!) - Math.abs(x.changePct!))
    .slice(0, 2)
    .map((r) => `최근 7일 ${iGa(r.label)} ${r.changePct! > 0 ? "늘었는데" : "줄었는데"}, 같은 기간에 무슨 일이 있었어?`);
  const ev = [...events].sort((a, b) => b.day.localeCompare(a.day))[0];
  const evQ = ev ? [`${ev.label}(${Number(ev.day.slice(5, 7))}월 ${Number(ev.day.slice(8))}일) 앞뒤로 설치, 가입, 게임이 어땠어?`] : [];
  return [...moved, ...evQ];
}

/**
 * 창을 처음 열 때 보여 줄 질문 셋. 체다는 탭이 아니라 고른 기간의 데이터 전체로 답해서, 질문도 그 기간 기준이다(2026-10-11).
 * 탭마다 다른 질문이나 "최근 7일"처럼 고른 기간과 어긋나는 질문은 두지 않는다. 그 기간에 행사가 있었으면 행사 질문을 가운데 둔다
 */
export function starters(range: { start: string; end: string } | null, events: { day: string; label: string }[]): string[] {
  const inRange = range ? events.filter((e) => e.day >= range.start && e.day <= range.end).sort((a, b) => b.day.localeCompare(a.day)) : [];
  const event = inRange[0] ? inRange[0].label.trim().split(/[\s,(]/)[0] : null;
  return ["이 기간에 가장 크게 달라진 게 뭐야?", event ? `${event} 효과 있었어?` : "이 기간 설치는 어디서 왔어?", "이전 기간이랑 비교하면 어때?"];
}
