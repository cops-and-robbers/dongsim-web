// 경찰과 도둑 온라인 게임(저장소 cops-and-robbers-web-game)의 공개 상태를 서버에서 읽는다. 입구 페이지(/online)가 쓴다.
// 게임 서버의 GET /status 는 누구나 읽을 수 있다. 못 읽으면 공개 전으로 본다(아직 열리지 않은 게임으로 보내지 않게)
import { WEBGAME_URL_DEFAULT, isWebgameMode, type WebgameStatus } from "@/lib/admin/webgame";

export const webgameBase = () => (process.env.WEBGAME_URL || WEBGAME_URL_DEFAULT).replace(/\/$/, "");

/** 어디서 들어왔는지 남기게 사이트 표시를 붙인 게임 주소 */
export const webgamePlayUrl = (medium: string) => `${webgameBase()}/play?utm_source=site&utm_medium=${medium}`;

export async function readWebgameStatus(): Promise<WebgameStatus> {
  try {
    const res = await fetch(`${webgameBase()}/status`, { next: { revalidate: 30 }, signal: AbortSignal.timeout(5_000) });
    if (!res.ok) throw new Error(String(res.status));
    const body = (await res.json()) as Partial<WebgameStatus>;
    if (!isWebgameMode(body.mode)) throw new Error("mode");
    return { mode: body.mode, message: String(body.message ?? ""), until: body.until ?? null };
  } catch {
    return { mode: "soon", message: "", until: null };
  }
}
