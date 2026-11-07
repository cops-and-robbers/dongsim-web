// 어드민 화면에서 행사 경로를 부른다(#219). 토큰이 만료됐으면 한 번 재발급하고 다시 묻는다(webgameClient 와 같은 방식).
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import type { EventDetail, EventsList } from "@/lib/event/adminApi";
import type { EventSettings, HomeMinigame } from "@/lib/event/settings";

/** 서버가 409(남이 먼저 저장)를 돌려줬을 때. 화면은 새로 불러오기를 권한다 */
export class EventConflict extends Error {}

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
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.status === 409) throw new EventConflict(body.error ?? "다른 분이 먼저 저장했어요.");
  if (!res.ok) throw new Error(body.error ?? "잠시 뒤 다시 시도해 주세요.");
  return body;
}

const json = (method: string, body: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const fetchEvents = async () => read<EventsList>(await call("/api/admin/events"));
export const fetchEvent = async (id: number) => read<EventDetail>(await call(`/api/admin/events/${id}`));
export const saveEvent = async (id: number, settings: EventSettings, version: number) =>
  read<EventDetail>(await call(`/api/admin/events/${id}`, json("PUT", { settings, version })));
export const saveMinigame = async (value: HomeMinigame) => read<{ value: HomeMinigame }>(await call("/api/admin/events/minigame", json("PUT", { value })));
