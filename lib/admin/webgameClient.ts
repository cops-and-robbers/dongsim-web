// 어드민 화면에서 온라인 게임 서버 경로를 부른다. 토큰이 만료됐으면 한 번 재발급하고 다시 묻는다(appConfigClient 와 같은 방식).
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import type { WebgameChange, WebgameState } from "@/lib/admin/webgame";

const URL = "/api/admin/webgame";

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

export const applyWebgame = async (change: WebgameChange) =>
  read(await call({ method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(change) }));
