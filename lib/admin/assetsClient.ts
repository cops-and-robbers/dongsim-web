// 어드민 화면에서 그림 보관함 경로를 부른다(#224). 토큰이 만료됐으면 한 번 재발급하고 다시 묻는다(eventsClient 와 같은 방식).
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import type { AssetsList } from "@/lib/event/adminApi";
import type { Asset } from "@/lib/event/assets";

async function call(url: string, init?: RequestInit): Promise<Response> {
  const send = () => fetch(url, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${getAccessToken() ?? ""}` }, cache: "no-store" });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  return res;
}

async function read<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? "잠시 뒤 다시 시도해 주세요.");
  return body;
}

export const fetchAssets = async () => read<AssetsList>(await call("/api/admin/assets"));

export async function uploadAsset(form: FormData) {
  return (await read<{ asset: Asset }>(await call("/api/admin/assets", { method: "POST", body: form }))).asset;
}

export async function patchAsset(id: number, patch: { label?: string; archived?: boolean }) {
  return (await read<{ asset: Asset }>(await call(`/api/admin/assets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }))).asset;
}
