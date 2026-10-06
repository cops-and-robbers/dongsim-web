/**
 * 앱 리텐션과 활성화율 (#145). 처음 들어온 날(firstSessionDate)이 같은 사람끼리 묶어(코호트) 센다.
 *
 * 하루 단위 합(ga4_daily 의 event, platform)으로는 비율을 못 낸다. 같은 사람이 여러 날 들어오면
 * 여러 번 세지기 때문이다. 그래서 GA4 에 코호트로 따로 묻는다.
 *
 * - 리텐션(breakdown "retention"): 처음 들어온 날 c 의 사람 중 n 일 뒤에 다시 들어온 사람 수.
 *   key 는 n(0, 1, 7). n=0 은 그날 처음 들어온 사람 수(코호트 크기)다. 2026-10-06 에 4주 합이
 *   신규 사용자, first_open 사용자와 똑같이 342명으로 맞는 걸 확인했다.
 * - 활성화(breakdown "activation"): 처음 들어온 날 c 부터 7일 안에 게임에 참가한(game_start) 사람 수.
 *   코호트 한 번에 묶어 물으면(cohortSpec + 이벤트 필터) 55명을 54명으로 세는 등 어긋나서,
 *   날짜마다 [c, c+6] 기간으로 따로 묻는다.
 *
 * 익은 칸만 저장한다. c+n 이 아직 안 지났으면 0 이 아니라 "아직 모름"이라 넣지 않는다.
 * 대신 익은 칸은 0 이어도 넣는다(GA4 는 0 인 줄을 빼고 준다). 화면은 줄이 있는 코호트만 분모로 쓴다.
 */

import { addDays, compactToYmd, ymdRange } from "../dates.ts";
import type { Ga4Row } from "./run.ts";

export const RETENTION_DAYS = [0, 1, 7] as const;
export const ACTIVATION_DAYS = 7;
const API = "https://analyticsdata.googleapis.com/v1beta/properties";

type Report = { rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[]; error?: { message?: string } };

async function report(token: string, propertyId: string, body: unknown, what: string): Promise<Report> {
  const res = await fetch(`${API}/${propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const json = (await res.json().catch(() => ({}))) as Report;
  if (!res.ok) throw new Error(`GA4 ${what} HTTP ${res.status} ${json.error?.message ?? ""}`.trim());
  return json;
}

/** 코호트 응답을 줄로. 익은 칸은 없는 값을 0 으로 채우고, 코호트 크기가 0 인 날은 뺀다 */
export function retentionRows(res: Report, cohorts: string[], yesterday: string): Ga4Row[] {
  const found = new Map<string, number>();
  for (const r of res.rows ?? []) {
    const [cohort, nth] = r.dimensionValues.map((d) => d.value);
    found.set(`${cohort}|${Number(nth)}`, Number(r.metricValues[0]?.value ?? 0));
  }
  const out: Ga4Row[] = [];
  for (const c of cohorts) {
    if (!found.get(`${c}|0`)) continue;
    for (const n of RETENTION_DAYS) {
      if (addDays(c, n) > yesterday) continue;
      out.push({ property: "app", day: c, breakdown: "retention", key: String(n), metric: "cohortActiveUsers", value: found.get(`${c}|${n}`) ?? 0 });
    }
  }
  return out;
}

/** from~to 에 처음 들어온 사람들의 리텐션. 한 번에 60개 코호트씩 묻는다 */
export async function fetchRetention(token: string, propertyId: string, from: string, yesterday: string): Promise<Ga4Row[]> {
  const cohorts = ymdRange(from, yesterday);
  const out: Ga4Row[] = [];
  for (let i = 0; i < cohorts.length; i += 60) {
    const part = cohorts.slice(i, i + 60);
    const res = await report(
      token,
      propertyId,
      {
        dimensions: [{ name: "cohort" }, { name: "cohortNthDay" }],
        metrics: [{ name: "cohortActiveUsers" }],
        cohortSpec: {
          cohorts: part.map((d) => ({ name: d, dimension: "firstSessionDate", dateRange: { startDate: d, endDate: d } })),
          cohortsRange: { granularity: "DAILY", startOffset: 0, endOffset: Math.max(...RETENTION_DAYS) },
        },
        limit: 100_000,
      },
      "리텐션",
    );
    out.push(...retentionRows(res, part, yesterday));
  }
  return out;
}

/** 7일 창이 닫힌 날 c 하나: 그날 처음 들어와 7일 안에 게임에 참가한 사람 수 */
async function activationOf(token: string, propertyId: string, c: string): Promise<Ga4Row> {
  const res = await report(
    token,
    propertyId,
    {
      dateRanges: [{ startDate: c, endDate: addDays(c, ACTIVATION_DAYS - 1) }],
      dimensions: [{ name: "firstSessionDate" }],
      metrics: [{ name: "totalUsers" }],
      dimensionFilter: { filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "game_start" } } },
    },
    "활성화",
  );
  const row = (res.rows ?? []).find((r) => compactToYmd(r.dimensionValues[0].value) === c);
  return { property: "app", day: c, breakdown: "activation", key: "", metric: "gameStartUsers7d", value: Number(row?.metricValues[0].value ?? 0) };
}

/** from 부터, 7일 창이 닫힌 마지막 날(yesterday - 6)까지. 네 개씩 동시에 묻는다 */
export async function fetchActivation(token: string, propertyId: string, from: string, yesterday: string): Promise<{ rows: Ga4Row[]; to: string }> {
  const to = addDays(yesterday, -(ACTIVATION_DAYS - 1));
  const days = from <= to ? ymdRange(from, to) : [];
  const rows: Ga4Row[] = [];
  for (let i = 0; i < days.length; i += 4) {
    rows.push(...(await Promise.all(days.slice(i, i + 4).map((c) => activationOf(token, propertyId, c)))));
  }
  return { rows, to };
}
