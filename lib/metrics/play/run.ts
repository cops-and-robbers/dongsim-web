/**
 * Google Play 수집 한 번 (#147). 라우트(/api/metrics/play)와 수동 실행 스크립트가 같이 쓴다.
 *
 * 1. 버킷에서 우리 패키지 파일 목록을 받는다(같은 개발자 계정의 다른 앱 파일도 보여서 패키지로 거른다)
 * 2. 기본은 지난달과 이번 달 파일만 받는다. 구글이 3~7일 늦게 그 달 파일을 다시 쓰기 때문이다
 * 3. 파일마다 그 달 칸을 통째로 바꾼다(다시 받았을 때 사라진 나라, 버전이 옛 값으로 남지 않게)
 * 4. 프로덕션 트랙 버전이 바뀌었으면 일정에 "Android x.y.z 출시"를 넣는다(releases.ts)
 *
 * dry 면 받아서 세기만 하고 저장하지 않는다.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { serviceAccountFromEnv, serviceAccountToken } from "../google.ts";
import { BACKFILL_FROM, PLAY_PACKAGE } from "../config.ts";
import { db, replaceRange } from "../db.ts";
import { decodePlayFile, monthBounds, parsePlayCsv, parsePlayName, PLAY_REPORTS, type PlayRow } from "./parse.ts";
import { recordAndroidRelease } from "./releases.ts";

export type PlayResult = {
  ok: boolean;
  dry: boolean;
  months: string[];
  files: number;
  rows: number;
  /** overview 의 마지막 날(PT). 구글이 늦게 채워 어제보다 며칠 앞이다 */
  installsUntil: string | null;
  /** 지금 프로덕션 트랙 버전과, 이번에 일정에 넣은 출시 수 */
  release: { version: string | null; added: number } | null;
  warnings: string[];
};

const GCS = "https://storage.googleapis.com/storage/v1/b";

/** gs://pubsite_prod_rev_.../ 에서 버킷 이름만 */
export function bucketFromUri(uri: string): string {
  const name = uri.trim().replace(/^gs:\/\//, "").split("/")[0];
  if (!/^pubsite_prod_[a-z0-9_]+$/i.test(name)) throw new Error("PLAY_GCS_URI 형식이 달라요 (gs://pubsite_prod_... 이어야 해요)");
  return name;
}

/** from(YYYY-MM-DD 또는 YYYY-MM)이 든 달부터 이번 달까지. 없으면 지난달과 이번 달 */
export function monthsToFetch(today: string, from?: string): string[] {
  const end = today.slice(0, 7);
  let start = from ? from.slice(0, 7) : prevMonth(end);
  if (start > end) start = end;
  const out: string[] = [];
  for (let m = start; m <= end; m = nextMonth(m)) out.push(m);
  return out;
}
const prevMonth = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`;
};
const nextMonth = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
};

async function gcsJson(url: string, token: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    // 403 은 권한이 아직 안 열렸거나 버킷 이름이 틀렸을 때 똑같이 난다(docs "권한을 줬는데 403")
    const msg = ((body.error as { message?: string } | undefined)?.message ?? "").replace(/pubsite_prod_[a-z0-9_]+/gi, "<버킷>");
    throw new Error(`Play 버킷 HTTP ${res.status} ${msg}`.trim());
  }
  return body;
}

/** 우리 패키지의 파일 이름 전부 (리포트 폴더마다 접두어로 묻는다) */
async function listFiles(bucket: string, token: string): Promise<string[]> {
  const names: string[] = [];
  for (const r of PLAY_REPORTS) {
    const prefix = `stats/${r.folder}/${r.file}_${PLAY_PACKAGE}_`;
    let page: string | undefined;
    do {
      const q = new URLSearchParams({ prefix, maxResults: "1000", fields: "items(name),nextPageToken" });
      if (page) q.set("pageToken", page);
      const body = await gcsJson(`${GCS}/${bucket}/o?${q}`, token);
      for (const it of (body.items as { name: string }[] | undefined) ?? []) names.push(it.name);
      page = body.nextPageToken as string | undefined;
    } while (page);
  }
  return names;
}

async function download(bucket: string, name: string, token: string): Promise<Uint8Array> {
  const res = await fetch(`${GCS}/${bucket}/o/${encodeURIComponent(name)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Play 파일을 못 받았어요 (HTTP ${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

export async function runPlay(opts: { dry: boolean; from?: string; now?: Date }): Promise<PlayResult> {
  const uri = process.env.PLAY_GCS_URI;
  if (!uri) throw new Error("PLAY_GCS_URI 환경변수가 없어요");
  const bucket = bucketFromUri(uri);
  const token = await serviceAccountToken(serviceAccountFromEnv(), "https://www.googleapis.com/auth/devstorage.read_only");
  const client: SupabaseClient | null = opts.dry ? null : db();
  const now = opts.now ?? new Date();
  // 파일의 달은 PT 기준이지만, 달 경계 하루 차이는 지난달까지 늘 다시 받아서 문제 되지 않는다
  const months = monthsToFetch(now.toISOString().slice(0, 10), opts.from === "all" ? BACKFILL_FROM.play : opts.from);
  const wanted = new Set(months);
  const files = (await listFiles(bucket, token))
    .map((name) => ({ name, meta: parsePlayName(name, PLAY_PACKAGE) }))
    .filter((f): f is { name: string; meta: NonNullable<typeof f.meta> } => !!f.meta && wanted.has(f.meta.month))
    .sort((a, b) => a.name.localeCompare(b.name));

  const warnings: string[] = [];
  let rowCount = 0;
  let installsUntil: string | null = null;
  for (const f of files) {
    let rows: PlayRow[];
    try {
      rows = parsePlayCsv(decodePlayFile(await download(bucket, f.name, token)), f.meta.report, f.meta.dim);
    } catch (e) {
      warnings.push(`${f.meta.report} ${f.meta.dim} ${f.meta.month}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    rowCount += rows.length;
    if (f.meta.report === "installs" && f.meta.dim === "overview") {
      const last = rows.map((r) => r.day).sort().at(-1) ?? null;
      if (last && (!installsUntil || last > installsUntil)) installsUntil = last;
    }
    if (client) {
      const { from, to } = monthBounds(f.meta.month);
      await replaceRange(client, "play_daily", { report: f.meta.report, dim: f.meta.dim }, from, to, rows);
    }
  }
  // 이번 달 설치 파일은 달이 바뀌고 며칠 뒤에야 생긴다. 지난달 파일까지 없으면 이상한 것이다
  const installMonths = new Set(files.filter((f) => f.meta.report === "installs" && f.meta.dim === "overview").map((f) => f.meta.month));
  const missing = months.slice(0, -1).filter((m) => !installMonths.has(m) && m >= BACKFILL_FROM.play);
  if (missing.length) warnings.push(`설치 파일이 없는 달: ${missing.join(", ")}`);

  let release: PlayResult["release"] = null;
  if (client) {
    try {
      release = await recordAndroidRelease(client, now);
    } catch (e) {
      warnings.push(`Android 출시 확인: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { ok: warnings.length === 0, dry: opts.dry, months, files: files.length, rows: rowCount, installsUntil, release, warnings };
}
