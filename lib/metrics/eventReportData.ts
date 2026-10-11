/**
 * 행사 성적표에 넣을 숫자를 모은다 (#165, #163). 성적표 라우트와 지표 챗봇이 같이 쓴다.
 *
 * 그날 숫자와 앞선 같은 요일 평소(다른 행사 날 제외)를 지표 화면과 같은 집계(loadDashboard)와 게임 서버 숫자로 만든다.
 * 계산 자체는 eventReport.ts 다. 여기는 무엇을 어디서 읽는지만 정한다
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { loadDashboard, type DailyPoint } from "./dashboard/data.ts";
import type { Source } from "./dashboard/sources.ts";
import { baselineDays, buildEventReport, type EventReport, type MetricSource } from "./eventReport.ts";
import type { MetricsEvent } from "./events.ts";
import type { ServerDaily } from "./gameServer.ts";
import { loadEventGames } from "./staff.ts";

/** 지표를 모으기 시작한 날. 이보다 앞은 "평소"로 쓰지 않는다 */
export const DATA_FROM = "2026-04-01";

export type EventReportResult = {
  report: EventReport;
  /** 0008 마이그레이션 전이면 고른 게임을 저장할 곳이 없다 */
  canPick: boolean;
  gamesError: string | null;
};

/**
 * 끝난 행사 하나의 성적표. events 는 모든 일정(평소 날에서 다른 행사 날을 빼려고 쓴다).
 * server 는 요청한 어드민 토큰으로 읽은 게임 서버 숫자다(운영진 계정 반영)
 */
export async function loadEventReport(client: SupabaseClient, event: MetricsEvent, events: MetricsEvent[], server: ServerDaily): Promise<EventReportResult> {
  const eventDays = new Set(events.filter((e) => e.category === "event").map((e) => e.day));
  const baseline = baselineDays(event.day, eventDays, DATA_FROM);
  const from = baseline.at(-1) ?? event.day;
  const [d, picked] = await Promise.all([loadDashboard(client, { start: from, end: event.day }), loadEventGames(client, event.id)]);

  const byDay = new Map(d.daily.map((p) => [p.day, p]));
  const has = (s: Source, day: string) => !!d.since[s] && !!d.freshness[s] && day >= d.since[s]! && day <= d.freshness[s]!;
  const col = (s: Source, pick: (p: DailyPoint) => number) => (day: string) => {
    const p = byDay.get(day);
    return p && has(s, day) ? pick(p) : null;
  };
  const srv = (pick: (r: { games: number; signups: number; newPlayers: number }) => number) => (day: string) =>
    server.error ? null : pick(server.daily.get(day) ?? { games: 0, signups: 0, newPlayers: 0 });
  const sources: MetricSource[] = [
    {
      key: "store_new",
      label: "스토어 최초 설치",
      unit: "명",
      // App Store 는 다음 날, Google Play 는 3~7일 늦게 들어온다. Play 가 아직이면 App Store 만 더하고 덜 들어왔다고 적는다
      of: (day) => {
        const a = col("appstore", (p) => p.appStoreNew)(day);
        const p = col("play", (x) => x.playInstalls)(day);
        return a === null && p === null ? null : (a ?? 0) + (p ?? 0);
      },
      pending: (day) => !d.freshness.play || day > d.freshness.play,
    },
    { key: "first_open", label: "앱 첫 실행", unit: "회", of: col("ga4app", (p) => p.firstOpenAndroid + p.firstOpenIos) },
    { key: "store_clicks", label: "스토어로 이동(사이트 버튼, QR, 링크)", unit: "회", of: col("ga4web", (p) => p.downloadClicks) },
    { key: "signups", label: "가입", unit: "명", of: srv((r) => r.signups) },
    { key: "new_players", label: "첫 게임을 한 새 가입자", unit: "명", of: srv((r) => r.newPlayers) },
    { key: "games", label: "그날 진행된 게임(운영진끼리 한 판 제외)", unit: "판", of: srv((r) => r.games) },
  ];
  return {
    report: buildEventReport(event, server.games, picked ?? new Set<string>(), sources, baseline),
    canPick: picked !== null,
    gamesError: server.error,
  };
}
