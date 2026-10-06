/**
 * GA4 수집 한 번 (#142). 서비스 계정(metrics-collector)이 웹, 앱 두 속성을 뷰어로 읽는다.
 *
 * 질문마다 나눠 보는 축이 달라 리포트를 여러 번 묻고, 세로로 길게(ga4_daily) 저장한다.
 * 매번 최근 7일을 다시 받아 그 기간을 바꾼다 - GA4 는 집계에 하루이틀, 앱에서
 * 오프라인으로 쌓인 이벤트는 그보다 늦게 들어온다. 날짜는 속성 시간대 기준이다.
 *
 * GA4 의 합계 숫자는 보관 기간이 없어(4월 숫자가 지금도 조회된다) 처음엔 데이터가
 * 있는 날부터 전부 채운다.
 */

import { serviceAccountFromEnv, serviceAccountToken } from "../google.ts";
import { BACKFILL_FROM, GA4_PROPERTIES, REFETCH_DAYS } from "../config.ts";
import { addDays, compactToYmd, todayIn } from "../dates.ts";
import { db, replaceRange } from "../db.ts";

type Property = keyof typeof GA4_PROPERTIES;

export type Ga4Query = {
  breakdown: string;
  /** date 를 뺀 나눠 보기 축. 여럿이면 "/" 로 이어 key 가 된다 */
  dimensions: string[];
  metrics: string[];
};

/** 무엇을 왜 받는지. 화면과 주간 리포트가 이 이름(breakdown)으로 읽는다 */
export const QUERIES: Record<Property, Ga4Query[]> = {
  web: [
    { breakdown: "total", dimensions: [], metrics: ["activeUsers", "newUsers", "sessions"] },
    // 인스타 링크트리, 행사 QR 의 UTM 이 여기로 들어온다
    {
      breakdown: "session_campaign",
      dimensions: ["sessionSource", "sessionMedium", "sessionCampaignName", "sessionManualAdContent"],
      metrics: ["sessions", "totalUsers"],
    },
    // app_download_click 등 웹 이벤트
    { breakdown: "event", dimensions: ["eventName"], metrics: ["eventCount", "totalUsers"] },
  ],
  app: [
    { breakdown: "platform", dimensions: ["platform"], metrics: ["activeUsers", "newUsers", "sessions"] },
    // first_open, login, game_start, game_over, app_remove 등
    { breakdown: "event", dimensions: ["eventName", "platform"], metrics: ["eventCount", "totalUsers"] },
    // /download 가 Play 로 넘긴 referrer(#144)가 첫 실행의 캠페인으로 잡힌다
    {
      breakdown: "first_user_campaign",
      dimensions: ["firstUserSource", "firstUserMedium", "firstUserCampaignName", "platform"],
      metrics: ["newUsers"],
    },
  ],
};

export type Ga4Row = { property: Property; day: string; breakdown: string; key: string; metric: string; value: number };

type ReportResponse = {
  rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[];
  rowCount?: number;
};

/** runReport 응답을 세로로 편다. 첫 축은 늘 date 다 */
export function toRows(property: Property, q: Ga4Query, res: ReportResponse): Ga4Row[] {
  const out: Ga4Row[] = [];
  for (const r of res.rows ?? []) {
    const [date, ...rest] = r.dimensionValues.map((d) => d.value);
    const key = rest.join("/");
    q.metrics.forEach((metric, i) => {
      const value = Number(r.metricValues[i]?.value ?? 0);
      if (value !== 0) out.push({ property, day: compactToYmd(date), breakdown: q.breakdown, key, metric, value });
    });
  }
  return out;
}

const LIMIT = 100_000;

async function runReport(token: string, propertyId: string, q: Ga4Query, from: string, to: string): Promise<ReportResponse> {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      dateRanges: [{ startDate: from, endDate: to }],
      dimensions: [{ name: "date" }, ...q.dimensions.map((name) => ({ name }))],
      metrics: q.metrics.map((name) => ({ name })),
      limit: LIMIT,
      keepEmptyRows: false,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const body = (await res.json().catch(() => ({}))) as ReportResponse & { error?: { message?: string } };
  if (!res.ok) throw new Error(`GA4 ${q.breakdown} HTTP ${res.status} ${body.error?.message ?? ""}`.trim());
  // 한도를 넘으면 잘린 줄로 기간을 바꾸게 된다. 그러면 기간을 나눠 물어야 한다
  if ((body.rowCount ?? 0) > LIMIT) throw new Error(`GA4 ${q.breakdown} 줄이 ${body.rowCount}개라 한 번에 못 받아요`);
  return body;
}

export type Ga4Result = {
  ok: boolean;
  dry: boolean;
  properties: { property: Property; from: string; to: string; rows: number; error: string | null }[];
};

/** from 을 안 넘기면 최근 7일, "all" 이면 데이터가 있는 날부터 전부 */
export async function runGa4(opts: { dry: boolean; now?: Date; from?: string | "all" }): Promise<Ga4Result> {
  const now = opts.now ?? new Date();
  const token = await serviceAccountToken(serviceAccountFromEnv(), "https://www.googleapis.com/auth/analytics.readonly");
  const client = opts.dry ? null : db();
  // 오늘은 아직 쌓이는 중이라 어제까지만 받는다
  const to = addDays(todayIn("Asia/Seoul", now), -1);
  const properties: Ga4Result["properties"] = [];
  for (const property of Object.keys(GA4_PROPERTIES) as Property[]) {
    const from =
      opts.from === "all" ? BACKFILL_FROM.ga4[property] : (opts.from ?? addDays(to, -(REFETCH_DAYS - 1)));
    try {
      let count = 0;
      for (const q of QUERIES[property]) {
        const rows = toRows(property, q, await runReport(token, GA4_PROPERTIES[property], q, from, to));
        count += rows.length;
        if (client) {
          await replaceRange(
            client,
            "ga4_daily",
            { property, breakdown: q.breakdown },
            from,
            to,
            rows.map((r) => ({ property: r.property, day: r.day, breakdown: r.breakdown, key: r.key, metric: r.metric, value: r.value })),
          );
        }
      }
      properties.push({ property, from, to, rows: count, error: null });
    } catch (e) {
      properties.push({ property, from, to, rows: 0, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { ok: properties.every((p) => !p.error), dry: opts.dry, properties };
}
