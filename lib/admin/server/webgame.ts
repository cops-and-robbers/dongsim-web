/**
 * 온라인 게임 서버의 운영 상태를 대신 읽고 바꾼다. 서버 전용이다.
 * 게임 서버의 어드민 비밀값을 브라우저로 내려보낼 수 없어서 이 경로가 중간에 선다.
 * 오류 메시지에 비밀값을 넣지 않는다.
 */
import { WEBGAME_URL_DEFAULT, type WebgameChange, type WebgameControl } from "@/lib/admin/webgame";
import type { WebgameLive, WebgameResult, WebgameUsage } from "@/lib/admin/webgameMonitor";

const KEY_ENV = "WEBGAME_ADMIN_KEY";

export const webgameUrl = () => (process.env.WEBGAME_URL || WEBGAME_URL_DEFAULT).replace(/\/$/, "");

/** 비밀값이 연결된 환경인가 */
export const isWebgameConnected = () => Boolean(process.env[KEY_ENV]);

/** 게임 서버는 하나라 운영 배포 말고는 바꾸지 않는다(미리보기 배포 포함). 앱 설정과 같은 규칙 */
export const isWebgameWritable = () => process.env.VERCEL_ENV === "production";

const call = (init?: RequestInit) =>
  fetch(`${webgameUrl()}/admin/control`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${process.env[KEY_ENV]}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

export async function readWebgameControl(): Promise<WebgameControl> {
  const res = await call();
  if (!res.ok) throw new Error(`게임 서버에서 상태를 읽지 못했어요 (${res.status})`);
  return (await res.json()) as WebgameControl;
}

export async function writeWebgameControl(change: WebgameChange, by: string): Promise<WebgameControl> {
  const res = await call({
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...change, by }),
  });
  if (!res.ok) throw new Error(`게임 서버가 바꾸지 않았어요 (${res.status})`);
  return (await res.json()) as WebgameControl;
}

// ── 모니터링(docs/admin-ui.md "온라인 게임 모니터링") ──

/** 최근 판 결과(최신이 앞, 최대 200). 어드민 비밀값으로만 읽힌다 */
export async function readWebgameResults(): Promise<WebgameResult[]> {
  const res = await fetch(`${webgameUrl()}/admin/results`, {
    headers: { Authorization: `Bearer ${process.env[KEY_ENV]}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`판 결과를 읽지 못했어요 (${res.status})`);
  return (await res.json()) as WebgameResult[];
}

/** 지금 도는 판 수. 게임 입구가 누구나 읽게 열어 둔 값이다 */
export async function readWebgameLive(): Promise<WebgameLive> {
  const res = await fetch(`${webgameUrl()}/live`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.includes("json")) throw new Error(`도는 판 수를 읽지 못했어요 (${res.status})`);
  return (await res.json()) as WebgameLive;
}

// Cloudflare 통계(GraphQL)는 조회가 무료지만 5분에 300번까지라, 1분 동안 같은 값을 나눠 쓴다
const USAGE_TOKEN_ENV = "CLOUDFLARE_ANALYTICS_TOKEN";
const USAGE_ACCOUNT_ENV = "CLOUDFLARE_ACCOUNT_ID";
const USAGE_SHARE_MS = 60_000;
let usageCache: { at: number; value: WebgameUsage } | null = null;

export const isUsageConnected = () => Boolean(process.env[USAGE_TOKEN_ENV] && process.env[USAGE_ACCOUNT_ENV]);

/** 오늘(UTC 0시부터) 계정 전체 사용량. 자동 배포의 사용량 검사(게임 tools/usage-guard.mjs)와 같은 계산이다 */
export async function readWebgameUsage(): Promise<WebgameUsage> {
  const now = Date.now();
  if (usageCache && now - usageCache.at < USAGE_SHARE_MS) return usageCache.value;
  const day = new Date(now);
  const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
  const query = `query($a:String!,$s:Time!,$e:Time!,$d:Date!){viewer{accounts(filter:{accountTag:$a}){
    workers:workersInvocationsAdaptive(limit:50,filter:{datetime_geq:$s,datetime_leq:$e}){sum{requests}}
    doReq:durableObjectsInvocationsAdaptiveGroups(limit:50,filter:{date:$d}){sum{requests}}
    doTime:durableObjectsPeriodicGroups(limit:50,filter:{date:$d}){sum{activeTime}}
  }}}`;
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env[USAGE_TOKEN_ENV]}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      variables: { a: process.env[USAGE_ACCOUNT_ENV], s: start.toISOString(), e: new Date(now).toISOString(), d: start.toISOString().slice(0, 10) },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  type Row = { sum?: Record<string, number> };
  const body = (await res.json().catch(() => null)) as { data?: { viewer?: { accounts?: Record<string, Row[]>[] } } } | null;
  const acc = body?.data?.viewer?.accounts?.[0];
  if (!res.ok || !acc) throw new Error(`Cloudflare 사용량을 읽지 못했어요 (${res.status})`);
  const sum = (rows: Row[] | undefined, k: string) => (rows ?? []).reduce((n, r) => n + (r.sum?.[k] ?? 0), 0);
  // Worker 요청과 Durable Object 요청은 같은 하루 10만 건 한도를 함께 쓴다. 실행량은 128MB 기준 GB-s
  const value: WebgameUsage = {
    requests: sum(acc.workers, "requests") + sum(acc.doReq, "requests"),
    gbs: (sum(acc.doTime, "activeTime") / 1e6) * 0.128,
    at: now,
  };
  usageCache = { at: now, value };
  return value;
}
