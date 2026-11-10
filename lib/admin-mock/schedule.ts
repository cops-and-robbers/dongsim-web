// 로컬에서 일정 화면(#302)을 만져 보는 가짜 일정. dev 에서는 MSW 가 이 값으로 답해 실제 일정(metrics_events)에 닿지 않는다.
// 행사 셋은 행사 화면 가짜 저장소(events.ts)와 같은 id 와 날짜다
import type { MetricsEvent } from "@/lib/metrics/events";

let nextId = 100;
let rows: MetricsEvent[] = [
  { id: 3, day: "2026-07-04", label: "서울 게임 타운", category: "event", startsAt: "12:00", endsAt: "17:00" },
  { id: 21, day: "2026-10-28", label: "3차 QA", category: "test", startsAt: null, endsAt: null },
  { id: 22, day: "2026-10-30", label: "iOS 1.4.0 출시", category: "release", startsAt: null, endsAt: null },
  { id: 23, day: "2026-10-30", label: "Android 1.4.0 출시", category: "release", startsAt: null, endsAt: null },
  { id: 24, day: "2026-11-03", label: "인스타 릴스 광고", category: "promo", startsAt: null, endsAt: null },
  { id: 25, day: "2026-11-03", label: "학교 포스터 붙이기", category: "promo", startsAt: null, endsAt: null },
  { id: 7, day: "2026-11-22", label: "서울 게임 타운", category: "event", startsAt: "12:00", endsAt: "17:00" },
  { id: 9, day: "2026-12-06", label: "대학 축제 부스", category: "event", startsAt: null, endsAt: null },
];

const sorted = () => [...rows].sort((a, b) => a.day.localeCompare(b.day) || a.id - b.id);

export function mockSchedule(): MetricsEvent[] {
  return sorted();
}

type Body = { day?: string; label?: string; category?: MetricsEvent["category"]; startsAt?: string | null; endsAt?: string | null };

export function mockAddSchedule(b: Body): { status: number; body: unknown } {
  if (!b.day || !b.label?.trim() || !b.category) return { status: 400, body: { error: "일정 이름과 성격을 넣어 주세요." } };
  const row: MetricsEvent = { id: nextId++, day: b.day, label: b.label.trim(), category: b.category, startsAt: b.startsAt ?? null, endsAt: b.endsAt ?? null };
  rows.push(row);
  return { status: 200, body: row };
}

export function mockEditSchedule(id: number, b: Body): { status: number; body: unknown } {
  const row = rows.find((r) => r.id === id);
  if (!row) return { status: 404, body: { error: "일정을 찾지 못했어요." } };
  Object.assign(row, { ...(b.label !== undefined && { label: b.label.trim() }), ...(b.category && { category: b.category }), startsAt: b.startsAt ?? null, endsAt: b.endsAt ?? null });
  return { status: 200, body: row };
}

export function mockRemoveSchedule(id: number): void {
  rows = rows.filter((r) => r.id !== id);
}

/** 성적표. 로컬은 게임 기록과 지표 숫자가 없어 앞으로 있을 행사만 안내하고, 지난 행사는 못 만든다고 답한다 */
export function mockScheduleReport(id: number, today: string): { status: number; body: unknown } {
  const event = rows.find((r) => r.id === id && r.category === "event");
  if (!event) return { status: 404, body: { error: "행사 일정을 찾지 못했어요." } };
  if (event.day >= today) return { status: 200, body: { status: "upcoming", event } };
  return { status: 503, body: { error: "로컬에서는 게임 기록과 지표 숫자가 없어 성적표를 만들 수 없어요." } };
}
