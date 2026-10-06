/**
 * 앱 리텐션과 신규 사용자 퍼널 (#145, #157). 처음 들어온 날(firstSessionDate)이 같은 사람끼리 묶어(코호트) 센다.
 *
 * 하루 단위 합(ga4_daily 의 event, platform)으로는 비율을 못 낸다. 같은 사람이 여러 날 들어오면
 * 여러 번 세지기 때문이다. 그래서 GA4 에 코호트로 따로 묻는다.
 *
 * - 리텐션(breakdown "retention"): 처음 들어온 날 c 의 사람 중 n 일 뒤에 다시 들어온 사람 수.
 *   key 는 n(0, 1, 7). n=0 은 그날 처음 들어온 사람 수(코호트 크기)다. 구글 플레이 자동 테스트 기기는 뺀다
 *   (testDevices.ts). 9/13 코호트는 전체 20명 중 한국과 일본이 3명이었고 나머지 대부분이 테스트 기기였다
 * - 퍼널(breakdown "funnel"): 처음 들어온 날 c 부터 7일 안에 단계마다 몇 명이 갔나(funnel.ts). 나라별로 두고 테스트 기기는 뺀다.
 *   예전 활성화(breakdown "activation", game_start 만)는 퍼널의 게임 플레이로 바꿨다
 *
 * 익은 칸만 저장한다. c+n 이 아직 안 지났으면 0 이 아니라 "아직 모름"이라 넣지 않는다.
 * 대신 익은 칸은 0 이어도 넣는다(GA4 는 0 인 줄을 빼고 준다). 화면은 줄이 있는 코호트만 분모로 쓴다.
 */

import { addDays, ymdRange } from "../dates.ts";
import { NOT_TEST_DEVICE } from "../testDevices.ts";
import { FUNNEL_FROM, FUNNEL_STEPS, FUNNEL_WINDOW, MARK, REPLAY } from "../funnel.ts";
import type { Ga4Row } from "./run.ts";

export const RETENTION_DAYS = [0, 1, 7] as const;
const API = "https://analyticsdata.googleapis.com/v1beta/properties";

type Report = { rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[]; error?: { message?: string } };

/**
 * 퍼널은 하루에 질문이 다섯 개라 수십 번 묻는다. 그중 하나만 연결이 끊겨도(ECONNRESET, 429, 5xx) 전체가 실패하지 않게
 * 두 번까지 잠깐 쉬고 다시 묻는다. 요청이 틀린 오류(4xx)는 다시 물어도 같아서 바로 던진다
 */
async function report(token: string, propertyId: string, body: unknown, what: string, tries = 3): Promise<Report> {
  for (let attempt = 1; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${API}/${propertyId}:runReport`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (e) {
      if (attempt >= tries) throw e;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      continue;
    }
    const json = (await res.json().catch(() => ({}))) as Report;
    if (res.ok) return json;
    if ((res.status === 429 || res.status >= 500) && attempt < tries) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      continue;
    }
    throw new Error(`GA4 ${what} HTTP ${res.status} ${json.error?.message ?? ""}`.trim());
  }
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
        dimensionFilter: NOT_TEST_DEVICE,
        limit: 100_000,
      },
      "리텐션",
    );
    out.push(...retentionRows(res, part, yesterday));
  }
  return out;
}

/** 처음 들어온 날 c 의 사람들이 [start, end] 에 events 중 하나를 남긴 사람 수(플랫폼, 나라별) */
async function usersOf(token: string, propertyId: string, c: string, events: readonly string[], start: string, end: string) {
  const res = await report(
    token,
    propertyId,
    {
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [{ name: "platform" }, { name: "countryId" }],
      metrics: [{ name: "totalUsers" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: "eventName", inListFilter: { values: [...events] } } },
            { filter: { fieldName: "firstSessionDate", stringFilter: { matchType: "EXACT", value: c.replaceAll("-", "") } } },
            NOT_TEST_DEVICE,
          ],
        },
      },
      limit: 10_000,
    },
    "퍼널",
  );
  return (res.rows ?? []).map((r) => ({ platform: r.dimensionValues[0].value, country: r.dimensionValues[1].value, users: Number(r.metricValues[0]?.value ?? 0) }));
}

/** 7일 창이 닫힌 날 c 하나의 퍼널 줄. 둘째 주까지 지났으면 다음 주에도 플레이한 사람과 표시 줄을 같이 */
export async function funnelDay(token: string, propertyId: string, c: string, yesterday: string): Promise<Ga4Row[]> {
  const weekEnd = addDays(c, FUNNEL_WINDOW - 1);
  const replayRipe = addDays(c, REPLAY.end) <= yesterday;
  const asks = [
    ...FUNNEL_STEPS.map((s) => ({ step: s.key as string, events: s.events, start: c, end: weekEnd })),
    ...(replayRipe ? [{ step: "replay", events: REPLAY.events, start: addDays(c, REPLAY.start), end: addDays(c, REPLAY.end) }] : []),
  ];
  // 한 날의 질문은 동시에(최대 5개). GA4 는 속성마다 동시 요청 10개까지다
  const answers = await Promise.all(asks.map((a) => usersOf(token, propertyId, c, a.events, a.start, a.end)));
  const rows: Ga4Row[] = [];
  asks.forEach((a, i) => {
    for (const x of answers[i]) {
      if (x.users > 0) rows.push({ property: "app", day: c, breakdown: "funnel", key: `${a.step}|${x.platform}|${x.country}`, metric: "users", value: x.users });
    }
  });
  if (replayRipe) rows.push({ property: "app", day: c, breakdown: "funnel", key: `replay|${MARK}|${MARK}`, metric: "users", value: 0 });
  return rows;
}

/** from 부터, 7일 창이 닫힌 마지막 날(yesterday - 6)까지. 하루씩 차례로 묻는다 */
export async function fetchFunnel(token: string, propertyId: string, from: string, yesterday: string): Promise<{ rows: Ga4Row[]; from: string; to: string }> {
  const start = from < FUNNEL_FROM ? FUNNEL_FROM : from;
  const to = addDays(yesterday, -(FUNNEL_WINDOW - 1));
  const rows: Ga4Row[] = [];
  for (const c of start <= to ? ymdRange(start, to) : []) rows.push(...(await funnelDay(token, propertyId, c, yesterday)));
  return { rows, from: start, to };
}
