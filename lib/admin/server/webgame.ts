/**
 * 온라인 게임 서버의 운영 상태를 대신 읽고 바꾼다. 서버 전용이다.
 * 게임 서버의 어드민 비밀값을 브라우저로 내려보낼 수 없어서 이 경로가 중간에 선다.
 * 오류 메시지에 비밀값을 넣지 않는다.
 */
import { WEBGAME_URL_DEFAULT, type WebgameChange, type WebgameControl } from "@/lib/admin/webgame";

const KEY_ENV = "WEBGAME_ADMIN_KEY";

export const webgameUrl = () => (process.env.WEBGAME_URL || WEBGAME_URL_DEFAULT).replace(/\/$/, "");

/** 비밀값이 연결된 환경인가 */
export const isWebgameConnected = () => Boolean(process.env[KEY_ENV]);

/** 게임 서버는 하나라 운영 배포 말고는 바꾸지 않는다(미리보기 배포 포함). 앱 설정과 같은 규칙 */
export const isWebgameWritable = () => process.env.VERCEL_ENV === "production";

const call = (init?: RequestInit) =>
  fetch(`${webgameUrl()}/admin/control`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${process.env[KEY_ENV]}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

export async function readWebgameControl(): Promise<WebgameControl> {
  const res = await call();
  if (!res.ok) throw new Error(`게임 서버에서 상태를 읽지 못했어요 (${res.status})`);
  return (await res.json()) as WebgameControl;
}

export async function writeWebgameControl(change: WebgameChange, by: string): Promise<WebgameControl> {
  const res = await call({
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...change, by }),
  });
  if (!res.ok) throw new Error(`게임 서버가 바꾸지 않았어요 (${res.status})`);
  return (await res.json()) as WebgameControl;
}
