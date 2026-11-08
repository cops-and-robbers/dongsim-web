// 어드민 화면에서 스토어 페이지를 부른다. 토큰이 만료됐으면 한 번 재발급하고 다시 묻는다(releaseClient 와 같은 방식).
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import type { Draft, FieldId, Lang, Platform, StorePage } from "@/lib/store-page/fields";
import type { FileInfo, ImageDraft, ImageItem, ImageSlot, ImageSlotId, NewImage } from "@/lib/store-page/images";

async function send(url: string, init: RequestInit = {}): Promise<Response> {
  const go = () => fetch(url, { ...init, headers: { Authorization: `Bearer ${getAccessToken() ?? ""}`, ...(init.body ? { "Content-Type": "application/json" } : {}) }, cache: "no-store" });
  const res = await go();
  if (res.status === 401 && (await reissue())) return go();
  return res;
}

export async function fetchStorePage(fresh = false): Promise<StorePage> {
  const res = await send(`/api/admin/store-page${fresh ? "?fresh=1" : ""}`);
  const body = (await res.json().catch(() => ({}))) as StorePage & { error?: string };
  if (!res.ok) throw new Error(body.error ?? "잠시 뒤 다시 시도해 주세요.");
  return body;
}

export type SaveBody = { platform: Platform; lang: Lang; field: FieldId; value: string | null; expect: string | null };

/** 다른 사람이 먼저 고쳤을 때. current 는 지금 저장된 초안 */
export class DraftConflict extends Error {
  constructor(readonly current: Draft | null) {
    super("다른 분이 방금 이 칸을 고쳤어요.");
  }
}

export async function saveStoreDraft(body: SaveBody): Promise<Draft | null> {
  const res = await send("/api/admin/store-page", { method: "PUT", body: JSON.stringify(body) });
  const out = (await res.json().catch(() => ({}))) as { draft?: Draft | null; current?: Draft | null; error?: string };
  if (res.status === 409) throw new DraftConflict(out.current ?? null);
  if (!res.ok) throw new Error(out.error ?? "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
  return out.draft ?? null;
}

export type SaveImageBody = { platform: Platform; lang: Lang; slot: ImageSlotId; items: ImageItem[] | null; expect: string | null };

export class ImageConflict extends Error {
  constructor(readonly current: ImageDraft | null) {
    super("다른 분이 방금 이 칸을 고쳤어요.");
  }
}

export async function saveImageDraft(body: SaveImageBody): Promise<ImageDraft | null> {
  const res = await send("/api/admin/store-page/images", { method: "PUT", body: JSON.stringify(body) });
  const out = (await res.json().catch(() => ({}))) as { draft?: ImageDraft | null; current?: ImageDraft | null; error?: string };
  if (res.status === 409) throw new ImageConflict(out.current ?? null);
  if (!res.ok) throw new Error(out.error ?? "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
  return out.draft ?? null;
}

/** 파일을 저장소에 바로 올린다. 함수 본문 4.5MB 제한을 피하려고 서버는 주소만 준다 */
export async function uploadStoreFile(platform: Platform, slot: ImageSlot, file: File, info: FileInfo, onProgress: (ratio: number) => void): Promise<NewImage> {
  const res = await send("/api/admin/store-page/images", { method: "POST", body: JSON.stringify({ platform, slot: slot.id, type: file.type, bytes: file.size }) });
  const out = (await res.json().catch(() => ({}))) as { uploadUrl?: string; url?: string; key?: string; error?: string };
  if (!res.ok || !out.key || out.url === undefined || out.uploadUrl === undefined) throw new Error(out.error ?? "올릴 준비를 하지 못했어요.");
  // 로컬 가짜 응답은 주소를 비워 두고 파일을 브라우저 안에서만 보여 준다
  if (!out.uploadUrl) onProgress(1);
  else
    await new Promise<void>((ok, fail) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", out.uploadUrl!);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? ok() : fail(new Error("올리지 못했어요. 잠시 뒤 다시 시도해 주세요.")));
      xhr.onerror = () => fail(new Error("올리지 못했어요. 인터넷 연결을 확인해 주세요."));
      xhr.send(file);
    });
  return { kind: "new", key: out.key, url: out.url || URL.createObjectURL(file), width: info.width, height: info.height, bytes: file.size, type: file.type, name: file.name, seconds: info.seconds };
}
