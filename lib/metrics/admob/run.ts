/**
 * AdMob 수집 한 번 (#143).
 *
 * AdMob API 는 서비스 계정을 받지 않는다. 팀 계정이 한 번 허락해 받은 갱신 토큰
 * (권한 admob.report 하나)을 쓴다. OAuth 앱은 프로덕션으로 게시해 7일 만료를 피했다.
 * 토큰이 끊기면(비밀번호 변경, 허락 취소) 토큰 교환에서 실패하고 실행이 실패로 끝난다 -
 * 그때는 docs/metrics-collection.md 의 "AdMob 다시 허락하기"를 한다.
 *
 * 날짜는 계정 시간대(Asia/Seoul), 수익은 USD 마이크로 단위로 받는다.
 * 매치율, 노출률은 저장하지 않는다. 날짜나 국가를 합칠 때 평균을 내면 틀리므로
 * 요청 수와 노출 수에서 그때그때 계산한다.
 */

import { refreshTokenAccess } from "../google.ts";
import { ADMOB_PUBLISHER_ID, BACKFILL_FROM, REFETCH_DAYS } from "../config.ts";
import { addDays, compactToYmd, todayIn } from "../dates.ts";
import { db, replaceRange } from "../db.ts";

export type AdmobRow = {
  day: string;
  platform: string;
  format: string;
  country: string;
  earningsMicros: number;
  adRequests: number;
  matchedRequests: number;
  impressions: number;
  clicks: number;
};

type Metric = { microsValue?: string; integerValue?: string; doubleValue?: number };
type StreamItem = {
  row?: { dimensionValues: Record<string, { value: string }>; metricValues: Record<string, Metric> };
};

const METRICS = ["ESTIMATED_EARNINGS", "AD_REQUESTS", "MATCHED_REQUESTS", "IMPRESSIONS", "CLICKS"] as const;
const DIMENSIONS = ["DATE", "PLATFORM", "FORMAT", "COUNTRY"] as const;

/** networkReport 응답(머리, 줄들, 꼬리의 배열)에서 줄만 꺼낸다 */
export function toRows(stream: StreamItem[]): AdmobRow[] {
  const int = (m: Metric | undefined) => Number(m?.integerValue ?? m?.microsValue ?? 0);
  return stream
    .filter((x) => x.row)
    .map(({ row }) => {
      const d = row!.dimensionValues;
      const m = row!.metricValues;
      return {
        day: compactToYmd(d.DATE.value),
        platform: d.PLATFORM?.value ?? "unknown",
        format: d.FORMAT?.value ?? "unknown",
        country: d.COUNTRY?.value ?? "unknown",
        earningsMicros: Number(m.ESTIMATED_EARNINGS?.microsValue ?? 0),
        adRequests: int(m.AD_REQUESTS),
        matchedRequests: int(m.MATCHED_REQUESTS),
        impressions: int(m.IMPRESSIONS),
        clicks: int(m.CLICKS),
      };
    });
}

const ymdParts = (s: string) => {
  const [year, month, day] = s.split("-").map(Number);
  return { year, month, day };
};

export type AdmobResult = { ok: boolean; dry: boolean; from: string; to: string; rows: number; earningsUsd: number };

/** from 을 안 넘기면 최근 7일, "all" 이면 처음부터 */
export async function runAdmob(opts: { dry: boolean; now?: Date; from?: string | "all" }): Promise<AdmobResult> {
  const clientId = process.env.ADMOB_CLIENT_ID;
  const clientSecret = process.env.ADMOB_CLIENT_SECRET;
  const refresh = process.env.ADMOB_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refresh) {
    throw new Error("ADMOB_CLIENT_ID, ADMOB_CLIENT_SECRET, ADMOB_REFRESH_TOKEN 환경변수가 없어요");
  }
  const token = await refreshTokenAccess(clientId, clientSecret, refresh);
  const now = opts.now ?? new Date();
  const to = addDays(todayIn("Asia/Seoul", now), -1);
  const from = opts.from === "all" ? BACKFILL_FROM.admob : (opts.from ?? addDays(to, -(REFETCH_DAYS - 1)));

  const res = await fetch(`https://admob.googleapis.com/v1/accounts/${ADMOB_PUBLISHER_ID}/networkReport:generate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      reportSpec: {
        dateRange: { startDate: ymdParts(from), endDate: ymdParts(to) },
        dimensions: DIMENSIONS,
        metrics: METRICS,
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const body = (await res.json().catch(() => null)) as StreamItem[] | { error?: { message?: string } } | null;
  if (!res.ok || !Array.isArray(body)) {
    const msg = body && !Array.isArray(body) ? body.error?.message : "";
    throw new Error(`AdMob 리포트 HTTP ${res.status} ${msg ?? ""}`.trim());
  }
  const rows = toRows(body);
  if (!opts.dry) {
    await replaceRange(
      db(),
      "admob_daily",
      {},
      from,
      to,
      rows.map((r) => ({
        day: r.day,
        platform: r.platform,
        format: r.format,
        country: r.country,
        earnings_micros: r.earningsMicros,
        ad_requests: r.adRequests,
        matched_requests: r.matchedRequests,
        impressions: r.impressions,
        clicks: r.clicks,
      })),
    );
  }
  const earningsUsd = rows.reduce((a, r) => a + r.earningsMicros, 0) / 1e6;
  return { ok: true, dry: opts.dry, from, to, rows: rows.length, earningsUsd: Math.round(earningsUsd * 100) / 100 };
}
