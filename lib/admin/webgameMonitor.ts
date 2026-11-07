// 어드민 "온라인 게임 > 모니터링"이 쓰는 타입과 판정 규칙. 서버 경로와 화면이 함께 쓰고, 시험(webgameMonitor.test.mjs)이 직접 부른다.
// 그래서 "@/" 경로를 쓰지 않는다. 근거는 docs/admin-ui.md "온라인 게임 모니터링"

export type WebgameTeam = "police" | "robber";

/** 판 결과 한 줄(게임 서버 GET /admin/results). 이름과 캐릭터 번호는 들어 있지 않다 */
export type WebgameResult = {
  at: number;
  winner: WebgameTeam | null;
  reason: string;
  police: number;
  robbers: number;
  humans: number;
  scale: number;
  theme: string;
  sec: number;
  catches: number;
  rescues: number;
  reveals: number;
  outReveals?: number;
  /** 사람별 네트워크. 게임 #21 이전 판에는 없다 */
  net?: { team: WebgameTeam; p50: number | null; p95: number | null; max: number | null; samples: number; rejoins: number }[];
  /** 서버 계산 간격. 게임 #21 이전 판에는 없다 */
  tick?: { maxGapMs: number; lateTicks: number; ticks: number };
};

export type WebgameLive = { playing: number; until: string | null };

/** 오늘(UTC 0시부터) 계정 전체 사용량. 자동 배포의 사용량 검사(게임 tools/usage-guard.mjs)와 같은 계산 */
export type WebgameUsage = { requests: number; gbs: number; at: number };

export type WebgameMonitor = {
  live: WebgameLive | null;
  results: WebgameResult[] | null;
  usage: WebgameUsage | null;
  /** 통계 토큰이 연결됐는지. 아니면 사용량 칸에 연결 안내를 띄운다 */
  usageConnected: boolean;
  /** 칸마다 따로 실패할 수 있다. 하나가 실패해도 나머지는 보인다 */
  errors: Partial<Record<"live" | "results" | "usage", string>>;
};

// 무료 요금제 하루 한도와 자동 배포가 멈추는 선(게임 docs/cost-guard.md)
export const USAGE_LIMIT = { requests: 100_000, gbs: 13_000 } as const;
export const USAGE_STOP_AT = 0.7;

// 왕복 시간 판정. 손으로 쫓고 잡는 게임이라 0.25초를 넘으면 조작이 밀린다고 느끼기 시작하고, 0.5초면 잡기가 빗나간다고 본다(팀 판단)
export const RTT_SLOW_MS = 250;
export const RTT_BAD_MS = 500;
// 서버 계산은 0.05초마다 돈다. 0.1초를 넘긴 간격이 있으면 서버가 밀린 것(게임 server/room.ts LATE_TICK_MS)
export const LATE_TICK_MS = 100;

export const WINNER_LABEL: Record<WebgameTeam, string> = { police: "경찰 승", robber: "도둑 승" };

export const REASON_LABEL: Record<string, string> = {
  allArrested: "모두 체포",
  timeUp: "시간 끝",
  empty: "모두 나감",
  timeLimit: "시간 초과로 정리",
};

export const reasonLabel = (reason: string) => REASON_LABEL[reason] ?? reason;

/** 한 판에서 사람들 중 가장 나쁜 쪽 5% 왕복 시간과, 사람별 중간값의 중간 */
export function rttOf(r: WebgameResult): { median: number | null; worst: number | null } {
  const rows = (r.net ?? []).filter((n) => n.samples > 0);
  const p50 = rows.map((n) => n.p50).filter((v): v is number => v !== null).sort((a, b) => a - b);
  const p95 = rows.map((n) => n.p95).filter((v): v is number => v !== null);
  return {
    median: p50.length ? p50[Math.floor((p50.length - 1) / 2)] : null,
    worst: p95.length ? Math.max(...p95) : null,
  };
}

export type Issue = { kind: "slow" | "bad" | "rejoin" | "lag"; tone: "amber" | "red"; text: string };

/** 판에서 눈여겨볼 것. 색만으로 알리지 않게 늘 글자를 함께 둔다 */
export function issuesOf(r: WebgameResult): Issue[] {
  const out: Issue[] = [];
  const { worst } = rttOf(r);
  if (worst !== null && worst >= RTT_BAD_MS) out.push({ kind: "bad", tone: "red", text: `왕복 ${worst}ms` });
  else if (worst !== null && worst >= RTT_SLOW_MS) out.push({ kind: "slow", tone: "amber", text: `왕복 ${worst}ms` });
  const rejoins = (r.net ?? []).reduce((n, p) => n + p.rejoins, 0);
  if (rejoins > 0) out.push({ kind: "rejoin", tone: "amber", text: `끊김 ${rejoins}번` });
  if (r.tick && r.tick.lateTicks > 0) out.push({ kind: "lag", tone: r.tick.maxGapMs >= 500 ? "red" : "amber", text: `서버 밀림 ${r.tick.lateTicks}번` });
  return out;
}

/** 지금부터 24시간을 한 시간 칸으로 나눠 판 수를 센다. 마지막 칸이 지금 시각이 든 칸 */
export function gamesByHour(results: readonly WebgameResult[], now: number): { start: number; games: number }[] {
  const HOUR = 3_600_000;
  const last = Math.floor(now / HOUR) * HOUR;
  const bins = Array.from({ length: 24 }, (_, i) => ({ start: last - (23 - i) * HOUR, games: 0 }));
  for (const r of results) {
    const i = 23 - Math.floor((last - Math.floor(r.at / HOUR) * HOUR) / HOUR);
    if (i >= 0 && i < 24) bins[i].games++;
  }
  return bins;
}

/** 한국 날짜로 오늘 끝난 판 수 */
export function gamesToday(results: readonly WebgameResult[], now: number): number {
  const day = (t: number) => new Date(t + 9 * 3_600_000).toISOString().slice(0, 10);
  const today = day(now);
  return results.filter((r) => day(r.at) === today).length;
}

/** 최근 판들(왕복 시간이 있는 판만)에서 사람별 중간값을 모은 중간 */
export function recentMedianRtt(results: readonly WebgameResult[], take = 10): number | null {
  const values = results
    .slice(0, take)
    .flatMap((r) => (r.net ?? []).map((n) => n.p50))
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);
  return values.length ? values[Math.floor((values.length - 1) / 2)] : null;
}

export type Summary = {
  tone: "good" | "warn" | "idle";
  /** 최근 24시간에 끝난 판 수 */
  games: number;
  /** 그중 살펴볼 판 수 */
  flagged: number;
  /** 문제 종류별 판 수. 느림은 아주 느림을 함께 센다 */
  counts: { slow: number; rejoin: number; lag: number };
  /** 오늘 사용량이 자동 배포가 멈추는 선을 넘었는지 */
  usageOver: boolean;
};

/** 화면 맨 위 한 줄 답("지금 괜찮나?")의 재료. 최근 24시간 판과 오늘 사용량을 본다 */
export function summarize(results: readonly WebgameResult[], now: number, usage: WebgameUsage | null): Summary {
  const recent = results.filter((r) => now - r.at < 24 * 3_600_000);
  const counts = { slow: 0, rejoin: 0, lag: 0 };
  let flagged = 0;
  for (const r of recent) {
    const kinds = new Set(issuesOf(r).map((i) => (i.kind === "bad" ? "slow" : i.kind)));
    if (kinds.size) flagged++;
    for (const k of kinds) counts[k as keyof typeof counts]++;
  }
  const usageOver = !!usage && (usage.requests / USAGE_LIMIT.requests >= USAGE_STOP_AT || usage.gbs / USAGE_LIMIT.gbs >= USAGE_STOP_AT);
  const tone = flagged || usageOver ? "warn" : recent.length ? "good" : "idle";
  return { tone, games: recent.length, flagged, counts, usageOver };
}

/** 오늘이면 "오늘 01:34", 어제면 "어제 16:40", 그 전은 "11.05 12:00"(한국 시간) */
export function whenLabel(at: number, now: number): string {
  const kst = (t: number) => new Date(t + 9 * 3_600_000).toISOString();
  const d = kst(at), today = kst(now).slice(0, 10), yesterday = kst(now - 24 * 3_600_000).slice(0, 10);
  const time = d.slice(11, 16);
  if (d.slice(0, 10) === today) return `오늘 ${time}`;
  if (d.slice(0, 10) === yesterday) return `어제 ${time}`;
  return `${d.slice(5, 7)}.${d.slice(8, 10)} ${time}`;
}

/** 다음 사용량 초기화(UTC 0시, 한국 오전 9시)까지 남은 시간 */
export function untilReset(now: number): { hours: number; minutes: number } {
  const next = Math.floor(now / 86_400_000 + 1) * 86_400_000;
  const left = Math.max(0, next - now);
  return { hours: Math.floor(left / 3_600_000), minutes: Math.floor((left % 3_600_000) / 60_000) };
}
