/**
 * 스토어 페이지 화면의 읽기와 초안 저장 (docs/admin-ui.md "스토어 페이지"). 서버 전용이다.
 * 스토어 문구는 1분 동안 같은 값을 쓰고, 초안은 여러 사람이 고치니 늘 새로 읽는다.
 */
import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "@/lib/metrics/db";
import { NotCached, retryOnce, unwrapNotCached } from "@/lib/release/reliable";
import { StoreError } from "@/lib/release/stores";
import type { Draft, FieldId, Lang, StorePage } from "./fields";
import { readAndroidPage, readIosPage } from "./read";

const TAG = "store-page";
const TABLE = "store_page_drafts";
const TRY_LATER = "지금은 문구를 가져오지 못했어요. 잠시 뒤 다시 확인해 주세요.";

const failed = (where: string) => (e: unknown) => {
  console.error(`[store-page] ${where}`, e instanceof StoreError ? (e.detail ?? e.message) : e instanceof Error ? e.message : e);
  return { ok: false as const, error: e instanceof StoreError ? e.message : TRY_LATER };
};

type Stores = Pick<StorePage, "readAt" | "ios" | "android">;

async function readStores(): Promise<Stores> {
  const [ios, android] = await Promise.all([retryOnce(() => readIosPage()).catch(failed("App Store")), readAndroidPage().catch(failed("Google Play"))]);
  return { readAt: new Date().toISOString(), ios, android };
}

// 한쪽이라도 못 읽은 결과는 저장하지 않는다(출시 보드와 같은 이유)
const cachedStores = unstable_cache(
  async () => {
    const s = await readStores();
    if (!s.ios.ok || !s.android.ok) throw new NotCached(s);
    return s;
  },
  ["store-page-v1"],
  { tags: [TAG], revalidate: 60 },
);

export const refreshStores = () => revalidateTag(TAG, { expire: 0 });

type Row = { platform: Draft["platform"]; lang: Lang; field: FieldId; value: string; updated_by: string; updated_at: string };
const toDraft = (r: Row): Draft => ({ platform: r.platform, lang: r.lang, field: r.field, value: r.value, updatedBy: r.updated_by, updatedAt: r.updated_at });

/** 표가 아직 없으면(SQL 을 실행하기 전) null */
async function readDrafts(): Promise<Draft[] | null> {
  try {
    const { data, error } = await db().from(TABLE).select("platform,lang,field,value,updated_by,updated_at");
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map(toDraft);
  } catch (e) {
    console.error("[store-page] 초안", e instanceof Error ? e.message : e);
    return null;
  }
}

export async function storePage(): Promise<StorePage> {
  const [stores, drafts] = await Promise.all([unwrapNotCached<Stores>(cachedStores), readDrafts()]);
  const production = process.env.VERCEL_ENV === "production";
  const writable = production && drafts !== null;
  return { ...stores, drafts: drafts ?? [], writable, readOnlyReason: writable ? undefined : production ? "지금은 저장할 수 없어요. 개발 담당자에게 알려 주세요." : "초안은 운영 어드민에서만 저장돼요." };
}

export type SaveInput = { platform: Draft["platform"]; lang: Lang; field: FieldId; value: string | null; expect: string | null };
export type SaveResult = { ok: true; draft: Draft | null } | { ok: false; current: Draft | null };

/**
 * 한 칸을 저장한다. value 가 null 이면 초안을 지운다.
 * 화면이 본 뒤로 다른 사람이 그 칸을 고쳤으면(expect 와 다르면) 덮어쓰지 않는다
 */
export async function saveDraft(input: SaveInput, actor: string): Promise<SaveResult> {
  const where = { platform: input.platform, lang: input.lang, field: input.field };
  const found = await db().from(TABLE).select("platform,lang,field,value,updated_by,updated_at").match(where).maybeSingle();
  if (found.error) throw new Error(found.error.message);
  const current = found.data ? toDraft(found.data as Row) : null;
  if ((current?.updatedAt ?? null) !== input.expect && current?.updatedBy !== actor) return { ok: false, current };
  if (input.value === null) {
    const { error } = await db().from(TABLE).delete().match(where);
    if (error) throw new Error(error.message);
    return { ok: true, draft: null };
  }
  const { data, error } = await db()
    .from(TABLE)
    .upsert({ ...where, value: input.value, updated_by: actor, updated_at: new Date().toISOString() })
    .select("platform,lang,field,value,updated_by,updated_at")
    .single();
  if (error) throw new Error(error.message);
  return { ok: true, draft: toDraft(data as Row) };
}
