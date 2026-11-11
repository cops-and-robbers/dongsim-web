/**
 * 구글 서치 콘솔 API (#309). 패키지 없이 fetch 로 부른다(GA4 수집과 같은 방식, lib/metrics/google.ts).
 *
 * 지표 수집용 서비스 계정을 서치 콘솔 속성의 사용자로 추가해야 읽힌다.
 * 읽기는 webmasters.readonly, 사이트맵 제출만 webmasters 범위를 쓴다(제출은 "전체" 권한 사용자만 된다).
 * 오류 메시지에 키나 토큰을 넣지 않는다.
 */

import { serviceAccountFromEnv, serviceAccountToken } from "../metrics/google.ts";
import { SEARCH_PROPERTY } from "./config.ts";

const READ = "https://www.googleapis.com/auth/webmasters.readonly";
const WRITE = "https://www.googleapis.com/auth/webmasters";
const SITE = encodeURIComponent(SEARCH_PROPERTY);

export const readToken = () => serviceAccountToken(serviceAccountFromEnv(), READ);
export const writeToken = () => serviceAccountToken(serviceAccountFromEnv(), WRITE);

async function call<T>(token: string, url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  const body = text ? (JSON.parse(text) as T & { error?: { message?: string; status?: string } }) : ({} as T & { error?: { message?: string } });
  if (!res.ok) {
    const what = new URL(url).pathname.split("/").slice(-1)[0];
    // 403 은 대개 서비스 계정이 속성 사용자로 추가되지 않았거나 권한이 모자란 것이다
    const hint = res.status === 403 ? " (서치 콘솔에 지표 수집 서비스 계정을 사용자로 추가했는지 확인해요)" : "";
    throw new Error(`서치 콘솔 ${what} HTTP ${res.status} ${body.error?.message ?? ""}${hint}`.trim());
  }
  return body;
}

export type IndexStatus = {
  verdict?: string;
  coverageState?: string;
  robotsTxtState?: string;
  indexingState?: string;
  lastCrawlTime?: string;
  pageFetchState?: string;
  googleCanonical?: string;
  userCanonical?: string;
  sitemap?: string[];
  crawledAs?: string;
};

/** 주소 하나의 구글 판정. 사이트당 하루 2,000건, 분당 600건까지 */
export async function inspect(token: string, url: string): Promise<{ status: IndexStatus; link: string | null }> {
  const body = await call<{ inspectionResult?: { indexStatusResult?: IndexStatus; inspectionResultLink?: string } }>(
    token,
    "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
    { method: "POST", body: JSON.stringify({ inspectionUrl: url, siteUrl: SEARCH_PROPERTY }) },
  );
  return { status: body.inspectionResult?.indexStatusResult ?? {}, link: body.inspectionResult?.inspectionResultLink ?? null };
}

export type AnalyticsRow = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };

/** 검색 실적. 날짜는 미국 서부 기준이고 확정된(final) 숫자만 받는다 */
export async function searchAnalytics(
  token: string,
  body: { startDate: string; endDate: string; dimensions: string[]; aggregationType?: string },
): Promise<AnalyticsRow[]> {
  const out: AnalyticsRow[] = [];
  const rowLimit = 25_000;
  for (let startRow = 0; ; startRow += rowLimit) {
    const page = await call<{ rows?: AnalyticsRow[] }>(token, `https://www.googleapis.com/webmasters/v3/sites/${SITE}/searchAnalytics/query`, {
      method: "POST",
      body: JSON.stringify({ ...body, type: "web", dataState: "final", rowLimit, startRow }),
    });
    out.push(...(page.rows ?? []));
    if ((page.rows ?? []).length < rowLimit) return out;
  }
}

export type SitemapInfo = {
  path: string;
  lastSubmitted?: string;
  lastDownloaded?: string;
  isPending?: boolean;
  errors?: string | number;
  warnings?: string | number;
  contents?: { type: string; submitted?: string | number }[];
};

export async function listSitemaps(token: string): Promise<SitemapInfo[]> {
  const body = await call<{ sitemap?: SitemapInfo[] }>(token, `https://www.googleapis.com/webmasters/v3/sites/${SITE}/sitemaps`);
  return body.sitemap ?? [];
}

/** 사이트맵을 (다시) 제출한다. 구글이 사이트맵 핑 주소를 없앤 뒤 남은 길이다(2023) */
export async function submitSitemap(token: string, sitemapUrl: string): Promise<void> {
  await call(token, `https://www.googleapis.com/webmasters/v3/sites/${SITE}/sitemaps/${encodeURIComponent(sitemapUrl)}`, { method: "PUT" });
}
