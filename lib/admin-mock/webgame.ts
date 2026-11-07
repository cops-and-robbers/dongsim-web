// 로컬에서 온라인 게임 화면을 만져 보는 가짜 게임 서버. dev 에서는 MSW 가 이 값으로 답해 실제 게임 서버에 닿지 않는다.
import { validateWebgameChange, WEBGAME_URL_DEFAULT, type WebgameChange, type WebgameState } from "@/lib/admin/webgame";
import type { WebgameMonitor, WebgameResult } from "@/lib/admin/webgameMonitor";

let state: WebgameState = { mode: "soon", message: "", until: null, at: Date.parse("2026-11-06T11:00:00Z"), by: "테스트 관리자", url: WEBGAME_URL_DEFAULT, writable: true };

export const mockWebgame = () => state;

export function mockApplyWebgame(change: WebgameChange): { status: number; body: unknown } {
  const invalid = validateWebgameChange(change);
  if (invalid) return { status: 400, body: { error: invalid } };
  state = { ...state, ...change, message: change.message.trim(), until: change.until || null, at: Date.now(), by: "테스트 관리자" };
  return { status: 200, body: state };
}

// 모니터링 가짜 응답. 실제 판처럼 빠른 판, 느린 판, 끊긴 판, 서버가 밀린 판, 네트워크 기록이 없던 예전 판을 섞는다
export function mockWebgameMonitor(): WebgameMonitor {
  const now = Date.now();
  const min = 60_000;
  const net = (team: "police" | "robber", p50: number, p95: number, rejoins = 0) => ({ team, p50, p95, max: Math.round(p95 * 1.3), samples: 80, rejoins });
  const game = (ago: number, extra: Partial<WebgameResult>): WebgameResult => ({
    at: now - ago * min, winner: "police", reason: "allArrested", police: 2, robbers: 3, humans: 5, scale: 1.05, theme: "town",
    sec: 140, catches: 4, rescues: 1, reveals: 3, outReveals: 0, ...extra,
  });
  const ok5 = [net("police", 32, 48), net("police", 41, 70), net("robber", 36, 55), net("robber", 58, 96), net("robber", 44, 71)];
  const results: WebgameResult[] = [
    game(6, { net: ok5, tick: { maxGapMs: 62, lateTicks: 0, ticks: 3100 } }),
    game(14, { winner: "robber", reason: "timeUp", sec: 180, rescues: 3, theme: "night", net: [net("police", 38, 64), net("robber", 140, 320), net("robber", 47, 80), net("robber", 52, 88)], humans: 4, robbers: 3, tick: { maxGapMs: 70, lateTicks: 0, ticks: 3900 } }),
    game(23, { net: [net("police", 35, 52), net("robber", 61, 110, 2), net("robber", 39, 66)], humans: 3, police: 1, robbers: 2, scale: 1, sec: 95, tick: { maxGapMs: 58, lateTicks: 0, ticks: 2200 } }),
    game(31, { theme: "park", net: ok5, sec: 168, outReveals: 2, tick: { maxGapMs: 640, lateTicks: 3, ticks: 3700 } }),
    game(52, { winner: null, reason: "empty", sec: 41, humans: 2, police: 1, robbers: 1, scale: 1, net: [net("police", 30, 45), net("robber", 210, 560, 1)], tick: { maxGapMs: 55, lateTicks: 0, ticks: 1100 } }),
    game(9 * 60, { winner: "robber", reason: "timeUp", sec: 180, theme: "snow", net: ok5, tick: { maxGapMs: 66, lateTicks: 0, ticks: 3900 } }),
    game(9 * 60 + 8, { net: ok5, theme: "city", sec: 122, tick: { maxGapMs: 120, lateTicks: 1, ticks: 2800 } }),
    game(20 * 60, { humans: 5 }),
    game(20 * 60 + 9, { winner: "robber", reason: "timeUp", sec: 180, humans: 5 }),
  ];
  return {
    live: { playing: 1, until: new Date(now + 3 * min).toISOString() },
    results,
    usage: { requests: 18_420, gbs: 410.5, at: now },
    usageConnected: true,
    errors: {},
  };
}
