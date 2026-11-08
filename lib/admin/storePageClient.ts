// 어드민 화면에서 스토어 페이지를 부른다. 토큰이 만료됐으면 한 번 재발급하고 다시 묻는다(releaseClient 와 같은 방식).
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import type { Draft, FieldId, Lang, Platform, StorePage } from "@/lib/store-page/fields";

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
