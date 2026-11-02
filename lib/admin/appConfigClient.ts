// 어드민 화면에서 앱 설정 서버 경로를 부른다. 토큰이 만료됐으면 한 번 재발급하고 다시 묻는다.
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import type { AppConfigChanges, AppConfigState, BannerImage } from "@/lib/admin/appConfig";

const URL = "/api/admin/app-config";

/** 저장 후 메뉴의 "점검 중" 표시를 바로 맞춘다. */
export const APP_CONFIG_CHANGED_EVENT = "admin-app-config-changed";

export class AppConfigError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function call(url: string, init?: RequestInit): Promise<Response> {
  const send = () =>
    fetch(url, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${getAccessToken() ?? ""}` },
      cache: "no-store",
    });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  return res;
}

async function read<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new AppConfigError(body.error ?? "잠시 뒤 다시 시도해 주세요.", res.status);
  return body as T;
}

export const fetchAppConfig = async () => read<AppConfigState>(await call(URL));

export async function uploadBannerImage(file: File) {
  const form = new FormData();
  form.append("file", file);
  return read<BannerImage>(await call(`${URL}/banners`, { method: "POST", body: form }));
}

export const fetchMaintenance = async () => read<{ maintenance: boolean }>(await call(`${URL}?only=maintenance`));

export async function applyAppConfig(etag: string, changes: AppConfigChanges) {
  const res = await call(URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ etag, changes }),
  });
  const state = await read<AppConfigState>(res);
  window.dispatchEvent(new Event(APP_CONFIG_CHANGED_EVENT));
  return state;
}
