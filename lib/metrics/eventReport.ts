/**
 * 행사 성적표 (#165). 행사 하나에서 무엇을 했고, 그날 숫자가 평소보다 어땠나.
 *
 * 지표 화면(사용자가 늘고 있나)과 질문이 달라서 세는 법도 다르다.
 * - 운영진을 빼지 않고 나눠 보여 준다. 행사에서 우리가 몇 판을 돌렸는지(운영진끼리 한 시연 판 포함)도 돌아볼 숫자다
 * - 행사 게임은 사람이 달력에서 그날을 눌러 그날 게임 중에서 고른다(metrics_event_games). 고르기 쉽게 그날 게임을
 *   장소별로 묶어 지도 핀 글자로 보여 주고(dayGames), 행사 시간 안에 시작한 게임은 미리 체크한다(events.ts inEventTime)
 * - "평소"는 앞선 같은 요일 네 번의 평균이다. 다른 행사 날은 빼고 더 앞에서 채운다(행사가 주말에 몰려 요일을 맞춘다)
 * - 그날 숫자와 평소의 차이는 "같은 날 함께 나타난 것"이다. 행사 덕분이라고 말하지 않는다
 */

import { addDays } from "./dates.ts";
import { distanceM, inEventTime, seoulClock, type MetricsEvent } from "./events.ts";
import type { GameKind, GameRow } from "./gameServer.ts";

export const BASELINE_WEEKS = 4;
/** 행사 날을 건너뛰며 평소를 찾을 때 이만큼 앞까지 본다 */
export const BASELINE_LOOKBACK_WEEKS = 8;
/** 게임 구역 가운데가 이 안이면 같은 장소로 묶는다. 한 부스의 판들은 구역을 조금씩 옮겨도 수백 m 안이다 */
export const PLACE_RADIUS_M = 300;

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

export type ReportGame = { id: string; start: string; kind: GameKind; visitors: number; staff: number; minutes: number };

const hhmm = (iso: string) => {
  const m = seoulClock(iso).minute;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const toReport = (g: GameRow): ReportGame => ({ id: g.id, start: hhmm(g.startedAt), kind: g.kind, visitors: g.visitors, staff: g.staff, minutes: g.minutes });

/** 행사 게임 고르기 화면의 장소 하나. 그날 게임 구역 가운데가 300m 안인 판들의 묶음 */
export type DayPlace = { letter: string; lat: number; lng: number; count: number };
/** 행사 게임 고르기 화면의 한 줄. 간단히 시작 시각, 인원, 장소만 보여 준다 */
export type DayGame = { id: string; start: string; people: number; place: string | null; suggested: boolean };

/**
 * 그날 게임과 장소. 장소는 판이 많은 곳부터 A, B, C 이고 지도 핀과 같은 글자다. 구역 가운데를 모르는 판은 장소 없음.
 * 인원은 운영진까지 더한 참가자 수(명단이 없는 판은 끝까지 남은 인원). 행사 시간 안에 시작한 판은 미리 체크한다
 */
export function dayGames(event: MetricsEvent, games: GameRow[]): { places: DayPlace[]; games: DayGame[] } {
  const day = games.filter((g) => seoulClock(g.startedAt).day === event.day).sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1));
  const groups: { center: { lat: number; lng: number }; ids: string[] }[] = [];
  for (const g of day) {
    if (!g.center) continue;
    const hit = groups.find((x) => distanceM(x.center, g.center!) <= PLACE_RADIUS_M);
    if (hit) hit.ids.push(g.id);
    else groups.push({ center: g.center, ids: [g.id] });
  }
  groups.sort((a, b) => b.ids.length - a.ids.length);
  const letterOf = new Map<string, string>();
  const places = groups.map((x, i) => {
    const letter = String.fromCharCode(65 + (i % 26));
    x.ids.forEach((id) => letterOf.set(id, letter));
    return { letter, lat: x.center.lat, lng: x.center.lng, count: x.ids.length };
  });
  return {
    places,
    games: day.map((g) => ({ id: g.id, start: hhmm(g.startedAt), people: g.visitors + g.staff, place: letterOf.get(g.id) ?? null, suggested: inEventTime(event, g.startedAt) })),
  };
}

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
  /** 고른 행사 게임(시작 시각순) */
  games: ReportGame[];
  /**
   * 골라 두었는데 지금 읽은 게임 기록에 없는 판 수. 로컬 dev 서버는 개발용 게임 서버를 봐서, 운영에서 고른 게임이 여기 잡힌다.
   * 0 이 아니면 "고르지 않았다"가 아니라 "못 찾았다"고 알린다
   */
  missing: number;
  /**
   * visitors 는 판마다 방문객을 더한 연인원(두 판 한 사람은 2). uniqueVisitors 는 고른 판에 한 번이라도 나온 사람 수.
   * 명단이 없는 판(2026-08-17 전)이 섞이면 누가 했는지 몰라 uniqueVisitors 는 null
   */
  totals: { games: number; withVisitors: number; staffOnly: number; visitors: number; uniqueVisitors: number | null; staff: number };
  /** 참가자 명단이 없는 판(2026-08-17 전)이 섞였나. 그 판의 방문객은 끝까지 남은 인원이라 적게 잡힌다 */
  noRoster: boolean;
  baseline: string[];
  metrics: DayMetric[];
};

/** 하루치 숫자 꺼내기. 그날 숫자가 아직 없으면 null */
export type DayValue = (day: string) => number | null;
export type MetricSource = { key: string; label: string; unit: string; of: DayValue; pending?: (day: string) => boolean };

export function buildEventReport(event: MetricsEvent, games: GameRow[], picked: Set<string>, sources: MetricSource[], baseline: string[]): EventReport {
  const chosen = games.filter((g) => picked.has(g.id)).sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1));
  const rows = chosen.map(toReport);
  const noRoster = rows.some((g) => g.kind === "unknown");
  const staffOnly = rows.filter((g) => g.kind === "staff").length;
  const totals = {
    games: rows.length,
    withVisitors: rows.length - staffOnly,
    staffOnly,
    visitors: rows.reduce((a, g) => a + g.visitors, 0),
    uniqueVisitors: noRoster ? null : new Set(chosen.flatMap((g) => g.visitorIds ?? [])).size,
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
  return { event, games: rows, missing: [...picked].filter((id) => !games.some((g) => g.id === id)).length, totals, noRoster, baseline, metrics };
}
