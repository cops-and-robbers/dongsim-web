/**
 * App Store 판매 리포트 (Sales and Trends, 하루 요약) (#142).
 *
 * GET /v1/salesReports 가 gzip 으로 묶은 탭 구분 파일을 준다. 그날 판매(다운로드)가
 * 없으면 404 "There were no sales for the date specified" 다 - 오류가 아니라 0건이다.
 * 날짜는 미국 서부 기준이고, 다음 날 오전 8시(PT)쯤 나온다.
 */

import { gunzipSync } from "node:zlib";
import { ASC_API, AscError } from "./auth.ts";
import { usToYmd } from "../dates.ts";

export type SalesRow = { day: string; country: string; productType: string; device: string; units: number };

/**
 * 파일 한 장을 우리 앱의 (날짜, 국가, 상품 유형, 기기)별 수량으로 줄인다.
 * 한 계정에 앱이 여럿이면 다른 앱 줄이 섞여 오므로 Apple ID 로 거른다.
 */
export function parseSalesTsv(text: string, appId: string): SalesRow[] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const head = lines[0].split("\t");
  const col = (name: string) => {
    const i = head.indexOf(name);
    if (i < 0) throw new Error(`판매 리포트에 "${name}" 열이 없어요`);
    return i;
  };
  const iApple = col("Apple Identifier");
  const iType = col("Product Type Identifier");
  const iUnits = col("Units");
  const iBegin = col("Begin Date");
  const iCountry = col("Country Code");
  const iDevice = col("Device");
  const sum = new Map<string, SalesRow>();
  for (const line of lines.slice(1)) {
    const c = line.split("\t");
    if (c[iApple] !== appId) continue;
    const row = { day: usToYmd(c[iBegin]), country: c[iCountry], productType: c[iType], device: c[iDevice] || "unknown" };
    const key = `${row.day}|${row.country}|${row.productType}|${row.device}`;
    const units = Number(c[iUnits]) || 0;
    const prev = sum.get(key);
    if (prev) prev.units += units;
    else sum.set(key, { ...row, units });
  }
  return [...sum.values()];
}

/** 하루치 판매 리포트. 판매가 없는 날은 빈 배열 */
export async function fetchSalesDay(token: string, vendor: string, day: string, appId: string): Promise<SalesRow[]> {
  const q = new URLSearchParams({
    "filter[frequency]": "DAILY",
    "filter[reportType]": "SALES",
    "filter[reportSubType]": "SUMMARY",
    "filter[vendorNumber]": vendor,
    "filter[reportDate]": day,
  });
  const res = await fetch(`${ASC_API}/salesReports?${q}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/a-gzip" },
    signal: AbortSignal.timeout(30_000),
  });
  if (res.status === 404) {
    // 404 는 두 가지다. "그날 판매가 없다"면 0건이지만, 리포트가 아직 안 나온 날을 0건으로
    // 저장하면 그날이 비어 버린다. 문구로 갈라, 아직 안 나온 날은 실패로 남겨 다음 실행이 다시 받게 한다
    const body = (await res.json().catch(() => ({}))) as { errors?: { detail?: string }[] };
    const detail = body.errors?.[0]?.detail ?? "";
    if (/no sales/i.test(detail)) return [];
    throw new AscError(`판매 리포트가 아직 없어요 (${day}): ${detail || "404"}`, 404);
  }
  if (!res.ok) throw new AscError(`판매 리포트 HTTP ${res.status} (${day})`, res.status);
  const text = gunzipSync(Buffer.from(await res.arrayBuffer())).toString("utf8");
  return parseSalesTsv(text, appId);
}
