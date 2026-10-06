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
import { ACTIVATION_DAYS, fetchActivation, fetchRetention } from "./cohorts.ts";

type Property = keyof typeof GA4_PROPERTIES;

export type Ga4Query = {
  breakdown: string;
  /** date 를 뺀 나눠 보기 축. 여럿이면 KEY_SEP("|")로 이어 key 가 된다 */
  dimensions: string[];
  metrics: string[];
  /** 이 이벤트만 센다(GA4 dimensionFilter eventName) */
  eventName?: string;
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
    // 스토어로 넘긴 기록(app_download_click)이 어디서 온 방문에서 나왔나. 위 event 는 이벤트 이름으로만 나눠서
    // "인스타에서 온 사람이 스토어까지 갔나"를 못 센다. sessions 는 그 이벤트가 있었던 방문 수라,
    // 한 방문에서 여러 번 눌러도 한 번이다(전환율의 분자)
    {
      breakdown: "download_source",
      dimensions: ["sessionSource", "sessionMedium", "sessionCampaignName"],
      metrics: ["eventCount", "sessions"],
      eventName: "app_download_click",
    },
    // 같은 이벤트를 출처와 페이지로. /download 는 QR, 링크트리 다운로드 링크가 가리키는 페이지라
    // 열리자마자 스토어로 넘기며 이 이벤트를 남긴다(2026-10-06 4주 99회 중 79회). 그런 방문은 들어오는 순간
    // "전환"이 되므로, 사이트 전환율은 /download 방문을 분자와 분모에서 모두 빼고 낸다. 출처가 있어야
    // 우리 팀 방문을 빼고 채널별, 인스타별로도 같은 계산을 한다
    {
      breakdown: "download_page",
      dimensions: ["sessionSource", "sessionMedium", "pagePath"],
      metrics: ["eventCount", "sessions"],
      eventName: "app_download_click",
    },
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

/**
 * 여러 축 값을 key 한 칸에 이어 붙일 때 쓰는 구분자.
 * "/" 는 캠페인 이름이나 소스 값(예: 경로가 붙은 referral)에 실제로 들어갈 수 있어
 * 나눌 때 칸이 밀린다. GA4 값에 거의 안 쓰이는 "|" 를 쓴다
 */
export const KEY_SEP = "|";

/** key 를 축 값으로 다시 나눈다 */
export function splitKey(key: string): string[] {
  return key.split(KEY_SEP);
}

/** runReport 응답을 세로로 편다. 첫 축은 늘 date 다 */
export function toRows(property: Property, q: Ga4Query, res: ReportResponse): Ga4Row[] {
  const out: Ga4Row[] = [];
  for (const r of res.rows ?? []) {
    const [date, ...rest] = r.dimensionValues.map((d) => d.value);
    const key = rest.join(KEY_SEP);
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
      ...(q.eventName && {
        dimensionFilter: { filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: q.eventName } } },
      }),
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
      // 앱은 리텐션과 활성화율을 코호트로 따로 묻는다(cohorts.ts). 7일 리텐션과 7일 활성화가 익으려면
      // 일주일이 걸리고 늦게 들어오는 이벤트도 있어, 평소에는 최근 2주(활성화는 창이 닫힌 날부터 8일)를 다시 받는다
      if (property === "app") {
        const id = GA4_PROPERTIES.app;
        const retFrom = opts.from === "all" ? BACKFILL_FROM.ga4.app : (opts.from ?? addDays(to, -14));
        const ret = await fetchRetention(token, id, retFrom, to);
        const actFrom = opts.from === "all" ? BACKFILL_FROM.ga4.app : (opts.from ?? addDays(to, -(ACTIVATION_DAYS - 1) - 7));
        const act = await fetchActivation(token, id, actFrom, to);
        count += ret.length + act.rows.length;
        if (client) {
          const strip = (rows: Ga4Row[]) => rows.map((r) => ({ property: r.property, day: r.day, breakdown: r.breakdown, key: r.key, metric: r.metric, value: r.value }));
          await replaceRange(client, "ga4_daily", { property, breakdown: "retention" }, retFrom, to, strip(ret));
          if (actFrom <= act.to) await replaceRange(client, "ga4_daily", { property, breakdown: "activation" }, actFrom, act.to, strip(act.rows));
        }
      }
      properties.push({ property, from, to, rows: count, error: null });
    } catch (e) {
      properties.push({ property, from, to, rows: 0, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { ok: properties.every((p) => !p.error), dry: opts.dry, properties };
}
