/**
 * App Store 판매 리포트 (Sales and Trends, 하루 요약) (#142).
 *
 * GET /v1/salesReports 가 gzip 으로 묶은 탭 구분 파일을 준다. 그날 판매(다운로드)가
 * 없으면 404 "There were no sales for the date specified" 다 - 오류가 아니라 0건이다.
 * 날짜는 한국 날짜와 맞는다(#154. 처음엔 미국 서부 날짜로 보고 하루 뒤로 옮겼는데, 행사 날 다운로드가
 * 다음 날에 찍혀 GA4 iOS 첫 실행과 견줘 확인했다). 나오는 시각은 정해져 있지 않다. 2026-10-06 한국 17시에는
 * 10/5 치가 있고 10/6 치는 "아직 없음"이었다.
 */

import { gunzipSync } from "node:zlib";
import { ASC_API, AscError } from "./auth.ts";
import { usToYmd } from "../dates.ts";

/**
 * versions 는 그 줄의 수량을 앱 버전별로 나눈 것(예: { "3.1.20": 38 }). 저장 칸에는 없고,
 * 새 버전이 처음 내려받아진 날(= App Store 출시일)을 찾는 데만 쓴다(appstore/releases.ts)
 */
export type SalesRow = { day: string; country: string; productType: string; device: string; units: number; versions: Record<string, number> };

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
  const iVersion = head.indexOf("Version");
  const sum = new Map<string, SalesRow>();
  for (const line of lines.slice(1)) {
    const c = line.split("\t");
    if (c[iApple] !== appId) continue;
    const row = { day: usToYmd(c[iBegin]), country: c[iCountry], productType: c[iType], device: c[iDevice] || "unknown" };
    const key = `${row.day}|${row.country}|${row.productType}|${row.device}`;
    const units = Number(c[iUnits]) || 0;
    const version = iVersion >= 0 ? c[iVersion] : "";
    const prev = sum.get(key) ?? { ...row, units: 0, versions: {} };
    prev.units += units;
    if (version) prev.versions[version] = (prev.versions[version] ?? 0) + units;
    sum.set(key, prev);
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
