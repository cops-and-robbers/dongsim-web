/**
 * App Store 수집 한 번 (#142). 라우트(/api/metrics/appstore)와 수동 실행 스크립트가 같이 쓴다.
 *
 * 1. 판매 리포트 - 최근 7일(한국 날짜와 맞는다, #154)을 다시 받아 그 기간을 바꾼다.
 *    처음 채울 땐 from 을 넘긴다(2026-04-01, 첫 판매)
 * 2. 분석 리포트 - 아직 처리하지 않은 인스턴스만 받는다. 같은 날짜는 더 최근에
 *    처리된 인스턴스로만 바꾼다
 *
 * dry 면 받아서 세기만 하고 저장하지 않는다.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AscError, ascToken } from "./auth.ts";
import { fetchInstanceRows, listInstances, shouldReplace, dimsKey, type Instance } from "./analytics.ts";
import { fetchSalesDay, type SalesRow } from "./sales.ts";
import { recordReleases } from "./releases.ts";
import { APPSTORE_APP_ID, APPSTORE_VENDOR_NUMBER, REFETCH_DAYS } from "../config.ts";
import { addDays, todayIn, ymdRange } from "../dates.ts";
import { check, db, insertChunks, replaceRange, selectAll } from "../db.ts";

export type AppStoreResult = {
  ok: boolean;
  dry: boolean;
  /** pendingDays: 아직 리포트가 안 나온 최근 날. 실패가 아니라 다음 실행이 다시 받는다 */
  sales: { from: string; to: string; days: number; rows: number; units: number; failedDays: string[]; pendingDays: string[] };
  analytics: { instances: number; processed: number; skippedOlder: number; rows: number; error: string | null };
  warnings: string[];
};

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i]) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * 판매가 하나도 없는 날은 줄이 안 생겨서, 화면이 "그날은 아직 안 받았다"와 "0건"을 못 가른다.
 * 그런 날엔 상품 유형이 빈 0 줄 하나를 남긴다. 합계는 상품 유형(1, 1F, 1T 등)으로 거르므로 숫자에 안 섞인다
 */
export function withMarker(day: string, rows: { day: string; country: string; product_type: string; device: string; units: number }[]) {
  return rows.length ? rows : [{ day, country: "", product_type: "", device: "", units: 0 }];
}

async function collectSales(client: SupabaseClient | null, token: string, from: string, to: string) {
  const days = ymdRange(from, to);
  const settled = await mapLimit(days, 4, (d) => fetchSalesDay(token, APPSTORE_VENDOR_NUMBER, d, APPSTORE_APP_ID));
  const rows: SalesRow[] = [];
  const failedDays: string[] = [];
  const pendingDays: string[] = [];
  // 한국 어제까지 묻는데, 리포트가 언제 나오는지 정해진 시각이 없다. 최근 이틀이 "아직 없음"(404)이면
  // 실패로 치지 않고 기다린다. 다시 받는 창(7일)이 하루씩 밀리며 다음 실행이 채운다
  const recent = new Set(days.slice(-2));
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") rows.push(...r.value);
    else if (r.reason instanceof AscError && r.reason.status === 404 && recent.has(days[i])) pendingDays.push(days[i]);
    else failedDays.push(days[i]);
  });
  // 실패한 날이 섞인 채로 기간을 통째로 바꾸면 그날이 비어 버린다. 받은 날만 바꾼다
  if (client) {
    for (const day of days.filter((d) => !failedDays.includes(d) && !pendingDays.includes(d))) {
      await replaceRange(
        client,
        "appstore_sales_daily",
        {},
        day,
        day,
        withMarker(
          day,
          rows
            .filter((r) => r.day === day)
            .map((r) => ({ day: r.day, country: r.country, product_type: r.productType, device: r.device, units: r.units })),
        ),
      );
    }
  }
  // 새 버전이 처음 내려받아진 날을 일정에 "iOS x.y.z 출시"로 넣는다(releases.ts)
  const releases = client ? await recordReleases(client, rows, from).catch(() => 0) : 0;
  return { from, to, days: days.length, rows: rows.length, units: rows.reduce((a, r) => a + r.units, 0), failedDays, pendingDays, releases };
}

async function storedProcessingDates(client: SupabaseClient, report: string, days: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (days.length === 0) return map;
  // 날짜마다 칸이 많아 1,000줄을 쉽게 넘는다. 잘리면 빠진 날을 "저장 안 됨"으로 보고
  // 더 오래된 처리일 파일로 덮어쓸 수 있어 끝까지 읽는다
  const rows = await selectAll<{ day: string; processing_date: string }>(
    (a, b) =>
      client
        .from("appstore_analytics_daily")
        .select("day, processing_date")
        .eq("report", report)
        .in("day", days)
        .order("day")
        .order("dims_key")
        .range(a, b),
    "분석 리포트 처리일 읽기",
  );
  for (const r of rows) if (!map.has(r.day) || r.processing_date > (map.get(r.day) as string)) map.set(r.day, r.processing_date);
  return map;
}

async function collectAnalytics(client: SupabaseClient | null, token: string) {
  const instances = await listInstances(token, APPSTORE_APP_ID);
  let done = new Set<string>();
  if (client && instances.length) {
    const rows = check(
      await client.from("appstore_analytics_instances").select("instance_id").in("instance_id", instances.map((i) => i.id)),
      "처리한 인스턴스 읽기",
    ) as { instance_id: string }[];
    done = new Set(rows.map((r) => r.instance_id));
  }
  // 오래된 처리일부터 - 같은 날짜가 뒤에서 더 최근 값으로 바뀌도록
  const todo = instances.filter((i) => !done.has(i.id)).sort((a, b) => a.processingDate.localeCompare(b.processingDate));
  let processed = 0;
  let skippedOlder = 0;
  let rowCount = 0;
  for (const inst of todo as Instance[]) {
    const rows = await fetchInstanceRows(token, inst.id);
    rowCount += rows.length;
    processed++;
    if (!client) continue;
    const days = [...new Set(rows.map((r) => r.day))];
    const stored = await storedProcessingDates(client, inst.report, days);
    for (const day of days) {
      if (!shouldReplace(stored.get(day) ?? null, inst.processingDate)) {
        skippedOlder++;
        continue;
      }
      await replaceRange(
        client,
        "appstore_analytics_daily",
        { report: inst.report },
        day,
        day,
        rows
          .filter((r) => r.day === day)
          .map((r) => ({
            report: inst.report,
            day: r.day,
            dims_key: dimsKey(r.dims),
            dims: r.dims,
            counts: r.counts,
            unique_counts: r.uniqueCounts,
            processing_date: inst.processingDate,
          })),
      );
    }
    await insertChunks(client, "appstore_analytics_instances", [
      { instance_id: inst.id, report: inst.report, granularity: inst.granularity, processing_date: inst.processingDate, rows: rows.length },
    ]);
  }
  return { instances: instances.length, processed, skippedOlder, rows: rowCount };
}

/** salesOnly: 판매 리포트만 받는다(주간 리포트가 보내기 직전에 일요일 치를 채울 때) */
export async function runAppStore(opts: { dry: boolean; now?: Date; from?: string; salesOnly?: boolean }): Promise<AppStoreResult> {
  const now = opts.now ?? new Date();
  const token = ascToken(now);
  const client = opts.dry ? null : db();
  const warnings: string[] = [];
  // 판매 리포트 날짜는 한국 날짜와 맞는다(#154). 한국 어제까지 묻고, 아직 안 나온 날은 기다린다
  const to = addDays(todayIn("Asia/Seoul", now), -1);
  const from = opts.from ?? addDays(to, -(REFETCH_DAYS - 1));
  const sales = await collectSales(client, token, from, to);
  if (sales.failedDays.length) warnings.push(`판매 리포트를 못 받은 날: ${sales.failedDays.join(", ")}`);

  if (opts.salesOnly) {
    return { ok: sales.failedDays.length === 0, dry: opts.dry, sales, analytics: { instances: 0, processed: 0, skippedOlder: 0, rows: 0, error: null }, warnings };
  }
  let analytics: AppStoreResult["analytics"];
  try {
    analytics = { ...(await collectAnalytics(client, token)), error: null };
  } catch (e) {
    // 분석 리포트가 실패해도 판매 리포트는 이미 저장됐다. 실행은 실패로 알린다
    analytics = { instances: 0, processed: 0, skippedOlder: 0, rows: 0, error: e instanceof Error ? e.message : String(e) };
  }
  return { ok: sales.failedDays.length === 0 && !analytics.error, dry: opts.dry, sales, analytics, warnings };
}
