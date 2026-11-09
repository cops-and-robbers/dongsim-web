/**
 * 당근 키워드 광고 수집 한 번.
 *
 * 당근 광고 OpenAPI(베타)의 소재 목록과 성과 조회만 부른다. 키는 조회 전용이 없어
 * 광고를 고치고 끌 수도 있으니, 여기서는 조회 두 가지 말고는 부르지 않는다.
 *
 * 소재 단위로 하루씩 받는다. OpenAPI 는 키워드로 나눠 주지 않는다. 키워드별 성과는
 * 당근 광고 MCP 나 엑셀 보고서로 그때그때 본다(docs/metrics-collection.md).
 * 설치 수 칸도 있지만 측정 서비스(MMP)를 연결해야 채워져서 받지 않는다.
 */

import { BACKFILL_FROM, DAANGN_ADVERTISER_ID, REFETCH_DAYS } from "../config.ts";
import { addDays, todayIn, ymdRange } from "../dates.ts";
import { db, replaceRange } from "../db.ts";

const API = "https://ads-openapi.kr.karrotmarket.com";
const PAGE_SIZE = 100;
/** 성과 조회 한 번에 넣을 수 있는 소재 수와 기간(명세: 50개, 31일) */
const MAX_IDS = 50;
const MAX_DAYS = 31;

export type Material = { id: string; title?: string; groupId: string; campaignId: string };
export type Performance = { id: string; duration: string; impression?: number; click?: number; cost?: string | number };
export type DaangnRow = {
  day: string;
  materialId: string;
  campaignId: string;
  groupId: string;
  materialName: string;
  impressions: number;
  clicks: number;
  costWon: number;
};

/**
 * 응답의 날짜(duration)를 한국 날짜로. 한국 자정의 UTC 시각으로 온다(11/9 는 2026-11-08T15:00:00.000Z, 2026-11-09 실측).
 * 노출이 없는 날은 줄이 아예 오지 않는다. 모르는 모양이면 틀린 날에 넣지 않고 멈춘다
 */
export function dayOf(duration: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(duration)) return duration;
  const t = Date.parse(duration);
  if (Number.isNaN(t)) throw new Error(`당근 성과 날짜를 읽지 못했어요: ${duration}`);
  return todayIn("Asia/Seoul", new Date(t));
}

/** 성과 줄에 소재 정보를 붙인다. 비용은 문자열로 온다 */
export function toRows(performances: Performance[], materials: Material[]): DaangnRow[] {
  const byId = new Map(materials.map((m) => [m.id, m]));
  return performances.map((p) => {
    const m = byId.get(p.id);
    if (!m) throw new Error(`목록에 없는 소재의 성과가 왔어요: ${p.id}`);
    const costWon = Number(p.cost ?? 0);
    if (Number.isNaN(costWon)) throw new Error(`당근 비용을 읽지 못했어요: ${p.cost}`);
    return {
      day: dayOf(p.duration),
      materialId: p.id,
      campaignId: m.campaignId,
      groupId: m.groupId,
      materialName: m.title ?? "",
      impressions: p.impression ?? 0,
      clicks: p.click ?? 0,
      costWon,
    };
  });
}

/** 기간을 한 번에 조회할 수 있는 길이로 자른다 */
export function periods(from: string, to: string, size = MAX_DAYS): { from: string; to: string }[] {
  const days = ymdRange(from, to);
  const out: { from: string; to: string }[] = [];
  for (let i = 0; i < days.length; i += size) {
    out.push({ from: days[i], to: days[Math.min(i + size, days.length) - 1] });
  }
  return out;
}

async function call<T>(key: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "X-API-KEY": key, "X-ADVERTISER-ID": DAANGN_ADVERTISER_ID, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  const body = (await res.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!res.ok || !body) throw new Error(`당근 광고 API ${path.split("?")[0]} HTTP ${res.status} ${body?.message ?? ""}`.trim());
  return body;
}

/** 꺼 둔 소재와 지운 소재도 받는다. 안 받으면 다시 받는 기간 안의 그 소재 성과가 지워진다 */
async function allMaterials(key: string): Promise<Material[]> {
  const out: Material[] = [];
  for (let pageNumber = 1; ; pageNumber++) {
    const status = ["ON", "OFF", "DELETED"].map((s) => `liveStatuses=${s}`).join("&");
    const page = await call<{ materials: Material[]; pagination: { totalPageCount: number } }>(
      key,
      `/v1/materials?${status}&pageNumber=${pageNumber}&pageSize=${PAGE_SIZE}`,
    );
    out.push(...page.materials);
    if (pageNumber >= page.pagination.totalPageCount) return out;
  }
}

export type DaangnResult = { ok: boolean; dry: boolean; from: string; to: string; materials: number; rows: number; costWon: number };

/** from 을 안 넘기면 최근 7일, "all" 이면 광고를 처음 만든 날부터 */
export async function runDaangn(opts: { dry: boolean; now?: Date; from?: string | "all" }): Promise<DaangnResult> {
  const key = process.env.DAANGN_ADS_API_KEY;
  if (!key) throw new Error("DAANGN_ADS_API_KEY 환경변수가 없어요");
  const to = addDays(todayIn("Asia/Seoul", opts.now ?? new Date()), -1);
  const from = opts.from === "all" ? BACKFILL_FROM.daangn : (opts.from ?? addDays(to, -(REFETCH_DAYS - 1)));

  const materials = await allMaterials(key);
  const performances: Performance[] = [];
  for (const p of periods(from, to)) {
    for (let i = 0; i < materials.length; i += MAX_IDS) {
      const { performances: page } = await call<{ performances: Performance[] }>(key, "/v1/performance", {
        method: "POST",
        body: JSON.stringify({
          startDateTime: `${p.from}T00:00:00+09:00`,
          endDateTime: `${p.to}T23:59:59+09:00`,
          timeGranularity: "DAY",
          analysisItem: "Material",
          ids: materials.slice(i, i + MAX_IDS).map((m) => m.id),
        }),
      });
      performances.push(...page);
    }
  }
  const rows = toRows(performances, materials);

  // 목록이 비어 왔는데 기간을 지우면 쌓아 둔 기록만 사라진다
  if (!opts.dry && materials.length > 0) {
    await replaceRange(
      db(),
      "daangn_ads_daily",
      {},
      from,
      to,
      rows.map((r) => ({
        day: r.day,
        material_id: r.materialId,
        campaign_id: r.campaignId,
        group_id: r.groupId,
        material_name: r.materialName,
        impressions: r.impressions,
        clicks: r.clicks,
        cost_won: r.costWon,
      })),
    );
  }
  return {
    ok: true,
    dry: opts.dry,
    from,
    to,
    materials: materials.length,
    rows: rows.length,
    costWon: Math.round(rows.reduce((a, r) => a + r.costWon, 0)),
  };
}
