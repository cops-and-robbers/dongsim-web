/**
 * 그림 보관함 저장소 (#224). 서버 전용이다.
 * 줄은 Supabase photobooth_assets, 파일은 팀 R2 assets/. 쓰는 행사는 행사 설정(event_settings.settings.kiosk)에서 센다.
 */
import { randomBytes } from "node:crypto";
import { db } from "@/lib/metrics/db";
import { putObject } from "@/lib/photobooth/r2";
import type { Asset, AssetKind } from "@/lib/event/assets";

const COLUMNS = "id, kind, key, label, meta, archived, created_by, created_at";

const toAsset = (r: Record<string, unknown>): Asset => ({
  id: Number(r.id),
  kind: r.kind as AssetKind,
  key: String(r.key),
  label: String(r.label),
  meta: (r.meta ?? {}) as Asset["meta"],
  archived: Boolean(r.archived),
  createdBy: String(r.created_by),
  createdAt: String(r.created_at),
});

export async function listAssets(): Promise<Asset[]> {
  const res = await db().from("photobooth_assets").select(COLUMNS).order("created_at", { ascending: false });
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []).map((r) => toAsset(r as Record<string, unknown>));
}

/** 그림 키마다 그 그림을 쓰는 행사 이름. 보관함 카드에 "행사 2곳에서 써요", 숨기기 막기에 쓴다 */
export async function usage(): Promise<Record<string, string[]>> {
  const res = await db().from("event_settings").select("settings, metrics_events!inner(label)");
  if (res.error) throw new Error(res.error.message);
  const out: Record<string, string[]> = {};
  for (const row of res.data ?? []) {
    const r = row as unknown as { settings: { name?: string; kiosk?: { frames?: { key?: string }[]; characters?: Record<string, { key?: string } | null> } }; metrics_events: { label: string } };
    const name = r.settings?.name || r.metrics_events.label;
    const keys = [...(r.settings?.kiosk?.frames ?? []).map((f) => f.key), ...Object.values(r.settings?.kiosk?.characters ?? {}).map((c) => c?.key)];
    for (const k of keys) if (k) (out[k] ??= []).push(name);
  }
  return out;
}

/** 파일을 R2 에 올리고 줄을 만든다. 키는 올릴 때마다 새로 지어 같은 주소의 내용이 바뀌지 않는다(오래 캐시해도 된다) */
export async function createAsset(input: { kind: AssetKind; label: string; meta: Asset["meta"]; body: ArrayBuffer; type: string; by: string }): Promise<Asset> {
  const ext = input.type === "image/webp" ? "webp" : input.type === "image/svg+xml" ? "svg" : "png";
  const key = `assets/${input.kind}/${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  await putObject(key, input.body, input.type);
  const res = await db()
    .from("photobooth_assets")
    .insert({ kind: input.kind, key, label: input.label, meta: input.meta, created_by: input.by })
    .select(COLUMNS)
    .single();
  if (res.error) throw new Error(res.error.message);
  return toAsset(res.data as Record<string, unknown>);
}

export async function updateAsset(id: number, patch: { label?: string; archived?: boolean }): Promise<Asset | null> {
  const res = await db().from("photobooth_assets").update(patch).eq("id", id).select(COLUMNS).maybeSingle();
  if (res.error) throw new Error(res.error.message);
  return res.data ? toAsset(res.data as Record<string, unknown>) : null;
}

/** PNG 머리(IHDR)에서 크기를 읽는다. 화면이 보낸 크기를 믿지 않으려고 */
export function pngSize(buf: ArrayBuffer): { width: number; height: number } | null {
  const b = new Uint8Array(buf);
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length < 24 || !sig.every((v, i) => b[i] === v)) return null;
  const dv = new DataView(buf);
  return { width: dv.getUint32(16), height: dv.getUint32(20) };
}

/** WebP 크기(VP8X, VP8, VP8L 머리) */
export function webpSize(buf: ArrayBuffer): { width: number; height: number } | null {
  const b = new Uint8Array(buf);
  const tag = (o: number, s: string) => s.split("").every((c, i) => b[o + i] === c.charCodeAt(0));
  if (b.length < 30 || !tag(0, "RIFF") || !tag(8, "WEBP")) return null;
  if (tag(12, "VP8X")) return { width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
  if (tag(12, "VP8L")) {
    const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (tag(12, "VP8 ")) return { width: (b[26] | (b[27] << 8)) & 0x3fff, height: (b[28] | (b[29] << 8)) & 0x3fff };
  return null;
}
