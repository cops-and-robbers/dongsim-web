/**
 * 리뷰 받은편지함의 읽기, 수집, 답글 (docs/admin-ui.md "리뷰"). 서버 전용이다.
 * 스토어에서 읽은 리뷰를 store_reviews 에 쌓아 두고 화면은 표를 읽는다. Google Play API 가 최근 7일치만 주기 때문이다.
 */
import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "@/lib/metrics/db";
import { APPSTORE_APP_ID, PLAY_PACKAGE } from "@/lib/metrics/config";
import { serviceAccountFromEnv, serviceAccountToken } from "@/lib/metrics/google";
import { decodePlayFile } from "@/lib/metrics/play/parse";
import { bucketFromUri, download, listPrefix } from "@/lib/metrics/play/run";
import { NotCached, unwrapNotCached } from "@/lib/release/reliable";
import { asc, play, playToken, PLAY_API, releaseAscToken, StoreError } from "@/lib/release/stores";
import { ascWrite } from "@/lib/store-page/sendImages";
import { fromAsc, fromPlay, fromPlayCsv, type Inbox, type Platform, type PlayReview, type Review, type StoreReview } from "./model";

const TABLE = "store_reviews";
const TAG = "store-reviews";
const COLUMNS = "platform,review_id,rating,title,body,translated,author,place,app_version,device,reviewed_at,reply,reply_at,reply_state,reply_by,skipped_by,skipped_at,draft,draft_by";

type Row = { platform: Platform; review_id: string; rating: number; title: string; body: string; translated: string | null; author: string; place: string | null; app_version: string | null; device: string | null; reviewed_at: string; reply: string | null; reply_at: string | null; reply_state: Review["replyState"]; reply_by: string | null; skipped_by: string | null; skipped_at: string | null; draft: string | null; draft_by: string | null };

const toReview = (r: Row): Review => ({ platform: r.platform, id: r.review_id, rating: r.rating, title: r.title, body: r.body, translated: r.translated, author: r.author, place: r.place, appVersion: r.app_version, device: r.device, reviewedAt: r.reviewed_at, reply: r.reply, replyAt: r.reply_at, replyState: r.reply_state, replyBy: r.reply_by, skippedBy: r.skipped_by, skippedAt: r.skipped_at, draft: r.draft, draftBy: r.draft_by });

// 지금까지 전부 4개다(2026-11-08). 한 번에 200개면 충분하다
async function readIos(): Promise<StoreReview[]> {
  const res = await asc(`/apps/${APPSTORE_APP_ID}/customerReviews?limit=200&sort=-createdDate&include=response&fields[customerReviewResponses]=responseBody,lastModifiedDate,state`, releaseAscToken());
  return (res.data ?? []).map((r) => fromAsc(r, res.included ?? []));
}

async function readAndroid(): Promise<StoreReview[]> {
  const token = await playToken();
  const out: StoreReview[] = [];
  let next: string | undefined;
  // 한도는 시간당 200번이다. 7일치라 몇 쪽이면 끝난다
  for (let page = 0; page < 5; page++) {
    const res = await play(`${PLAY_API}/reviews?maxResults=100&translationLanguage=ko${next ? `&token=${encodeURIComponent(next)}` : ""}`, token);
    out.push(...((res.reviews ?? []) as PlayReview[]).map(fromPlay));
    next = (res.tokenPagination as { nextPageToken?: string } | undefined)?.nextPageToken;
    if (!next) break;
  }
  return out;
}

const toStoreRow = (r: StoreReview) => ({ platform: r.platform, review_id: r.id, rating: r.rating, title: r.title, body: r.body, translated: r.translated, author: r.author, place: r.place, app_version: r.appVersion, device: r.device, reviewed_at: r.reviewedAt, reply: r.reply, reply_at: r.replyAt, reply_state: r.replyState });

async function save(rows: StoreReview[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await db().from(TABLE).upsert(rows.map(toStoreRow), { onConflict: "platform,review_id" });
  if (error) throw new Error(error.message);
}

/** 지난 Google Play 리뷰를 달별 파일에서 채운다. 이미 있는 리뷰는 건드리지 않는다(API 가 준 이름과 초안을 지키려고). 쌓인 수를 돌려준다 */
export async function backfillPlayReviews(): Promise<number> {
  const uri = process.env.PLAY_GCS_URI;
  if (!uri) throw new Error("PLAY_GCS_URI 환경변수가 없어요");
  const bucket = bucketFromUri(uri);
  const token = await serviceAccountToken(serviceAccountFromEnv(), "https://www.googleapis.com/auth/devstorage.read_only");
  const names = await listPrefix(bucket, `reviews/reviews_${PLAY_PACKAGE}_`, token);
  const rows = (await Promise.all(names.map(async (n) => fromPlayCsv(decodePlayFile(await download(bucket, n, token)))))).flat();
  // 한 파일과 다음 달 파일에 같은 리뷰가 있으면 최근 수정본만 남긴다
  const latest = new Map<string, StoreReview>();
  for (const r of rows) if (!latest.has(r.id) || r.reviewedAt > latest.get(r.id)!.reviewedAt) latest.set(r.id, r);
  if (latest.size) {
    const { error } = await db().from(TABLE).upsert([...latest.values()].map(toStoreRow), { onConflict: "platform,review_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }
  return latest.size;
}

export type SyncResult = { ios: number | null; android: number | null; error: string | null };

/** 두 스토어를 읽어 표에 쌓는다. 한쪽이 실패해도 다른 쪽은 저장한다 */
export async function syncReviews(): Promise<SyncResult> {
  const read = async (name: string, fn: () => Promise<StoreReview[]>) => {
    try {
      const rows = await fn();
      await save(rows);
      return rows.length;
    } catch (e) {
      console.error(`[reviews] ${name}`, e instanceof StoreError ? (e.detail ?? e.message) : e instanceof Error ? e.message : e);
      return null;
    }
  };
  const [ios, android] = await Promise.all([read("App Store", readIos), read("Google Play", readAndroid)]);
  const failed = [ios === null && "App Store", android === null && "Google Play"].filter(Boolean).join(", ");
  return { ios, android, error: failed ? `${failed} 리뷰를 지금 읽지 못했어요. 저장된 리뷰만 보여 드려요.` : null };
}

// 화면을 열 때마다 스토어를 부르지 않게 1분은 같은 결과를 쓴다. 실패한 결과는 남기지 않는다
const cachedSync = unstable_cache(
  async () => {
    const s = await syncReviews();
    if (s.error) throw new NotCached(s);
    return s;
  },
  ["store-reviews-v1"],
  { tags: [TAG], revalidate: 60 },
);

export const refreshReviews = () => revalidateTag(TAG, { expire: 0 });

async function readRows(): Promise<Review[] | null> {
  try {
    const { data, error } = await db().from(TABLE).select(COLUMNS).order("reviewed_at", { ascending: false }).limit(1000);
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map(toReview);
  } catch (e) {
    console.error("[reviews] 읽기", e instanceof Error ? e.message : e);
    return null;
  }
}

const production = () => process.env.VERCEL_ENV === "production";

export async function inbox(): Promise<Inbox> {
  // 표는 운영과 미리보기, 로컬이 같이 쓴다. 쌓는 일은 운영에서만 한다
  const sync = production() ? await unwrapNotCached<SyncResult>(cachedSync).catch(() => null) : null;
  const reviews = await readRows();
  if (!reviews) return { reviews: [], syncError: null, writable: false, readOnlyReason: "리뷰 표가 아직 없어요. 개발 담당자에게 알려 주세요." };
  return { reviews, syncError: sync?.error ?? null, writable: production(), readOnlyReason: production() ? undefined : "답글은 운영 어드민에서만 쓸 수 있어요." };
}

/** 메뉴 숫자용. 스토어는 부르지 않고 표만 읽는다 */
export const allReviews = readRows;

async function findRow(platform: Platform, id: string): Promise<Row | null> {
  const { data, error } = await db().from(TABLE).select(COLUMNS).match({ platform, review_id: id }).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Row | null) ?? null;
}

async function update(platform: Platform, id: string, values: Partial<Row>): Promise<Review> {
  const { data, error } = await db().from(TABLE).update(values).match({ platform, review_id: id }).select(COLUMNS).single();
  if (error) throw new Error(error.message);
  return toReview(data as Row);
}

export const saveReviewDraft = (platform: Platform, id: string, draft: string | null, actor: string) => update(platform, id, { draft, draft_by: draft ? actor : null });
export const skipReview = (platform: Platform, id: string, actor: string) => update(platform, id, { skipped_by: actor, skipped_at: new Date().toISOString() });
export const reopenReview = (platform: Platform, id: string) => update(platform, id, { skipped_by: null, skipped_at: null });

/** 답글을 스토어에 올린다. 두 스토어 모두 다시 보내면 바꿔 쓰는 방식이라 두 번 눌려도 하나만 남는다 */
export async function postReply(platform: Platform, id: string, text: string, actor: string): Promise<Review> {
  if (!(await findRow(platform, id))) throw new StoreError("이 리뷰를 찾지 못했어요. 새로고침해 주세요.");
  const now = new Date().toISOString();
  if (platform === "ios") {
    const out = await ascWrite("POST", "/customerReviewResponses", { data: { type: "customerReviewResponses", attributes: { responseBody: text }, relationships: { review: { data: { type: "customerReviews", id } } } } }, releaseAscToken());
    const a = out.data.attributes ?? {};
    return update(platform, id, { reply: text, reply_at: (a.lastModifiedDate as string | undefined) ?? now, reply_state: a.state === "PUBLISHED" ? "published" : "pending", reply_by: actor, draft: null, draft_by: null, skipped_by: null, skipped_at: null });
  }
  await play(`${PLAY_API}/reviews/${encodeURIComponent(id)}:reply`, await playToken(), { method: "POST", body: JSON.stringify({ replyText: text }) });
  return update(platform, id, { reply: text, reply_at: now, reply_state: "published", reply_by: actor, draft: null, draft_by: null, skipped_by: null, skipped_at: null });
}
