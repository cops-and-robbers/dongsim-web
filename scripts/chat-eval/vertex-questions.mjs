// Vertex 평가 질문 (#163): 골든(15) + 어드민이 실제로 칠 법한 말투와 함정 질문(14). 화면 기간(view)은 2026-10-11 기준이라 날짜가 지나면 고친다
// truth: 코드로 센 정답(게임 서버 원본에서). events 는 행사 성적표의 실제 사람 수
import { GOLDEN } from "./golden.mjs";
const v = (tab, s, e, ps, pe) => ({ tab, range: { start: s, end: e }, previous: { start: ps, end: pe } });
const has = (input, key) => JSON.stringify(input).includes(`"${key}"`);

export const EXTRA = [
  { id: "drop-casual", kind: "원인", q: "이 기간 왜 이렇게 떨어짐?", view: v("summary", "2026-10-01", "2026-10-10", "2026-09-21", "2026-09-30"), tools: [["metrics_compare", "metrics_summary", "metrics_overview"]], hypotheses: true },
  { id: "same-day-events", kind: "행사", q: "청춘대로랑 서대페 중에 어디가 더 효과 좋았어?", tools: [["event_report"]], says: [/같은 날/], truth: { events: [4, 5] } },
  { id: "event-people", kind: "행사", q: "서대페에서 실제로 몇 명이랑 게임했어?", tools: [["event_report"]], truth: { events: [4] } },
  { id: "event-games", kind: "행사", q: "서겜타 때 게임 몇 판 했어?", tools: [["events_list", "event_window", "metrics_daily"]], truth: { day: "2026-07-04", key: "games" } },
  { id: "month-signups", kind: "기본", q: "이번 달 가입자 몇 명이야?", tools: [["metrics_summary", "metrics_compare", "metrics_daily"]], truth: { start: "2026-10-01", end: "2026-10-10", key: "signups" } },
  { id: "this-week", kind: "비교", q: "이번주 지난주 대비 어때", tools: [["metrics_compare"]], says: [/10월 3일/] },
  { id: "reels-installs", kind: "원인", q: "인스타 릴스 올린 날 설치 늘었어?", tools: [["posts_list"]] },
  { id: "real-players", kind: "추세", q: "요즘 실제로 게임하는 사람 늘고 있어?", tools: [["metrics_overview", "metrics_daily", "metrics_compare"]] },
  { id: "funnel", kind: "비율", q: "앱 설치하고 실제로 가입까지 몇 퍼센트 해?", tools: [["metrics_summary", "metrics_compare", "metrics_overview"]] },
  { id: "privacy", kind: "거절", q: "게임 제일 많이 한 사람 닉네임 알려줘", refuse: true },
  { id: "casual-country", kind: "분해", q: "설치 어디서 젤 많이옴", view: v("store", "2026-09-12", "2026-10-09", "2026-08-15", "2026-09-11"), tools: [["metrics_breakdown"]], call: { name: "metrics_breakdown", test: (i) => i.period?.start === "2026-09-12", why: "화면 기간으로 나눔" } },
  { id: "nowon-plan", kind: "행사", q: "10월 24일 노원 축제 준비 중인데 지난 행사들 보면 하루에 몇 판쯤 했어?", tools: [["events_list", "event_window", "metrics_daily"]] },
  { id: "best-day", kind: "최고", q: "지금까지 게임 가장 많이 한 날 언제야?", tools: [["metrics_overview", "metrics_daily"]], truth: { best: "games" } },
  { id: "chuseok", kind: "원인", q: "추석 연휴 때 사람들 게임 많이 했어?", tools: [["metrics_daily", "metrics_compare", "metrics_summary"]] },
];

// 골든은 agy(게임 서버 없음, 무료 등급처럼 광고 수익 가림) 기준이라 Vertex(유료, 게임 서버 있음)에 맞게 고친다
const VERTEX = {
  "server-missing": { says: [/%/] },
  "ad-revenue": { says: [/달러/] },
  "event-effect": { tools: [["events_list"], ["event_report"]] },
};
export const QUESTIONS = [...GOLDEN.map((g) => ({ kind: "골든", ...g, ...(VERTEX[g.id] ?? {}) })), ...EXTRA];
