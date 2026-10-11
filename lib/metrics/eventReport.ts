/**
 * 행사 성적표 (#165). 행사 하나에서 무엇을 했고, 그날 숫자가 평소보다 어땠나.
 *
 * 지표 화면(사용자가 늘고 있나)과 질문이 달라서 세는 법도 다르다.
 * - 운영진을 빼지 않고 나눠 보여 준다. 행사에서 우리가 몇 판을 돌렸는지(운영진끼리 한 시연 판 포함)도 돌아볼 숫자다
 * - 행사 게임은 일정의 시간과 장소로 찾는다(events.ts isEventGame). 운영진이 섞여 있어 사람 기록만으로는 행사인지 모른다
 * - "평소"는 앞선 같은 요일 네 번의 평균이다. 다른 행사 날은 빼고 더 앞에서 채운다(행사가 주말에 몰려 요일을 맞춘다)
 * - 그날 숫자와 평소의 차이는 "같은 날 함께 나타난 것"이다. 행사 덕분이라고 말하지 않는다
 */

import { addDays } from "./dates.ts";
import { isEventGame, seoulClock, type MetricsEvent } from "./events.ts";
import type { GameKind, GameRow } from "./gameServer.ts";

export const BASELINE_WEEKS = 4;
/** 행사 날을 건너뛰며 평소를 찾을 때 이만큼 앞까지 본다 */
export const BASELINE_LOOKBACK_WEEKS = 8;

/** 앞선 같은 요일 중 다른 행사 날이 아닌 날 최대 네 번. 가까운 날부터 */
export function baselineDays(day: string, eventDays: Set<string>, firstDay: string): string[] {
  const out: string[] = [];
  for (let w = 1; w <= BASELINE_LOOKBACK_WEEKS && out.length < BASELINE_WEEKS; w++) {
    const d = addDays(day, -7 * w);
    if (d < firstDay) break;
    if (!eventDays.has(d)) out.push(d);
  }
  return out;
}

export type ReportGame = { start: string; kind: GameKind; visitors: number; staff: number; minutes: number };

export type DayMetric = {
  key: string;
  label: string;
  unit: string;
  value: number | null;
  /** 평소 평균(소수 한 자리). 평소 날이 없으면 null */
  usual: number | null;
  /** 평소 날마다의 값(가까운 날부터) */
  usualValues: (number | null)[];
  /** 아직 덜 들어온 숫자(Play 는 3~7일 늦다) */
  pending: boolean;
};

export type EventReport = {
  event: MetricsEvent;
  /** 시간이나 장소가 있어 행사 게임을 찾을 수 있나 */
  matchable: boolean;
  games: ReportGame[];
  totals: { games: number; withVisitors: number; staffOnly: number; visitors: number; staff: number };
  /** 참가자 명단이 없는 판(2026-08-17 전)이 섞였나. 그 판의 방문객은 끝까지 남은 인원이라 적게 잡힌다 */
  noRoster: boolean;
  baseline: string[];
  metrics: DayMetric[];
};

/** 하루치 숫자 꺼내기. 그날 숫자가 아직 없으면 null */
export type DayValue = (day: string) => number | null;
export type MetricSource = { key: string; label: string; unit: string; of: DayValue; pending?: (day: string) => boolean };

export function buildEventReport(event: MetricsEvent, games: GameRow[], sources: MetricSource[], baseline: string[]): EventReport {
  const matchable = !!event.place || !!(event.startsAt && event.endsAt);
  const mine = matchable ? games.filter((g) => isEventGame(event, g)) : [];
  const rows: ReportGame[] = mine.map((g) => {
    const t = seoulClock(g.startedAt);
    const hh = String(Math.floor(t.minute / 60)).padStart(2, "0");
    const mm = String(t.minute % 60).padStart(2, "0");
    return { start: `${hh}:${mm}`, kind: g.kind, visitors: g.visitors, staff: g.staff, minutes: g.minutes };
  });
  const staffOnly = rows.filter((g) => g.kind === "staff").length;
  const totals = {
    games: rows.length,
    withVisitors: rows.length - staffOnly,
    staffOnly,
    visitors: rows.reduce((a, g) => a + g.visitors, 0),
    staff: rows.reduce((a, g) => a + g.staff, 0),
  };
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const metrics = sources.map((s): DayMetric => {
    const usualValues = baseline.map((d) => s.of(d));
    const known = usualValues.filter((v): v is number => v !== null);
    return {
      key: s.key,
      label: s.label,
      unit: s.unit,
      value: s.of(event.day),
      usual: known.length ? round1(known.reduce((a, v) => a + v, 0) / known.length) : null,
      usualValues,
      pending: s.pending?.(event.day) ?? false,
    };
  });
  return { event, matchable, games: rows, totals, noRoster: rows.some((g) => g.kind === "unknown"), baseline, metrics };
}
