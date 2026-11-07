// 어드민 화면에서 온라인 게임 서버 경로를 부른다. 토큰이 만료됐으면 한 번 재발급하고 다시 묻는다(appConfigClient 와 같은 방식).
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import type { WebgameChange, WebgameState } from "@/lib/admin/webgame";
import type { WebgameMonitor } from "@/lib/admin/webgameMonitor";

const URL = "/api/admin/webgame";

/** 바꾼 뒤 사이드바의 "점검 중" 표시를 바로 다시 읽게 알린다(앱 설정의 APP_CONFIG_CHANGED_EVENT 와 같은 방식) */
export const WEBGAME_CHANGED_EVENT = "admin-webgame-changed";

async function call(init?: RequestInit): Promise<Response> {
  const send = () =>
    fetch(URL, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${getAccessToken() ?? ""}` },
      cache: "no-store",
    });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  return res;
}

async function read(res: Response): Promise<WebgameState> {
  const body = (await res.json().catch(() => ({}))) as WebgameState & { error?: string };
  if (!res.ok) throw new Error(body.error ?? "잠시 뒤 다시 시도해 주세요.");
  return body;
}

export const fetchWebgame = async () => read(await call());

export async function applyWebgame(change: WebgameChange) {
  const next = await read(await call({ method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(change) }));
  window.dispatchEvent(new Event(WEBGAME_CHANGED_EVENT));
  return next;
}

/** 모니터링 한 번에 읽기(판 결과, 도는 판 수, 사용량). 칸마다 실패는 errors 로 온다 */
export async function fetchWebgameMonitor(): Promise<WebgameMonitor> {
  const send = () =>
    fetch(`${URL}/monitor`, { headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` }, cache: "no-store" });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  const body = (await res.json().catch(() => ({}))) as WebgameMonitor & { error?: string };
  if (!res.ok) throw new Error(body.error ?? "잠시 뒤 다시 시도해 주세요.");
  return body;
}
