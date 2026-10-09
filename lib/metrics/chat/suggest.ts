/**
 * 추천 질문 (#163). 모델이 아니라 규칙으로 만든다(토큰 0).
 * 고정 질문 몇 개에, 최근 7일이 그 앞 7일보다 크게 움직인 지표와 최근 행사로 만든 질문을 더한다.
 * GA4 Insights 처럼 "숫자가 움직인 곳이 질문이 된다"는 생각이다.
 */

import { LOW_SAMPLE } from "./catalog.ts";

type CompareRow = { key: string; label: string; a: number | null; b: number | null; changePct: number | null };

export const FIXED_SUGGESTIONS = ["지난주와 그 전주를 비교해 줘", "지난달 행사 중에 설치와 게임이 가장 많았던 날은?", "최근 28일 설치는 어느 나라에서 왔어?"];

/** 크게 움직인 지표(둘 다 표본이 충분하고 50% 넘게 변함) 최대 2개와 최근 14일 행사 1개 */
export function dataSuggestions(rows: CompareRow[], events: { day: string; label: string }[]): string[] {
  const moved = rows
    .filter((r) => r.a !== null && r.b !== null && r.changePct !== null && Math.min(r.a, r.b) >= LOW_SAMPLE && Math.abs(r.changePct) >= 50)
    .sort((x, y) => Math.abs(y.changePct!) - Math.abs(x.changePct!))
    .slice(0, 2)
    .map((r) => `최근 7일 ${r.label}이(가) ${r.changePct! > 0 ? "늘었는데" : "줄었는데"}, 같은 기간에 무슨 일이 있었어?`);
  const ev = [...events].sort((a, b) => b.day.localeCompare(a.day))[0];
  const evQ = ev ? [`${ev.label}(${Number(ev.day.slice(5, 7))}월 ${Number(ev.day.slice(8))}일) 앞뒤로 설치, 가입, 게임이 어땠어?`] : [];
  return [...moved, ...evQ];
}
