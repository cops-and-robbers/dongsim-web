// 경찰과 도둑 온라인 게임(저장소 cops-and-robbers-web-game)의 공개 상태를 서버에서 읽는다. 입구 페이지(/online)가 쓴다.
// 게임 서버의 GET /status 는 누구나 읽을 수 있다. 못 읽으면 공개 전으로 본다(아직 열리지 않은 게임으로 보내지 않게)
import { revalidateTag } from "next/cache";
import { WEBGAME_URL_DEFAULT, isWebgameMode, type WebgameStatus } from "@/lib/admin/webgame";
import type { Locale } from "@/lib/i18n/config";

export const webgameBase = () => (process.env.WEBGAME_URL || WEBGAME_URL_DEFAULT).replace(/\/$/, "");

/** 어디서 들어왔는지 남기게 사이트 표시를 붙인 게임 주소. 영어, 일본어는 그 언어의 링크 미리보기가 붙는 주소(/en/play, /ja/play)로 보낸다 */
export const webgamePlayUrl = (medium: string, locale: Locale = "ko") =>
  `${webgameBase()}${locale === "ko" ? "" : `/${locale}`}/play?utm_source=site&utm_medium=${medium}`;

const STATUS_TAG = "webgame-status";

/**
 * 어드민이 입구 상태를 바꾸면 부른다. 읽어 둔 상태와 그걸 쓴 /online 세 언어 페이지를 버린다.
 * 게임 서버가 스스로 바꾸는 것(끝나는 때가 지남)은 아래 5분 주기로 따라간다. 30초였을 때 /online 이
 * 30초마다 다시 만들어져 Vercel CPU 를 썼다(#335)
 */
export const expireWebgameStatus = () => revalidateTag(STATUS_TAG, { expire: 0 });

export async function readWebgameStatus(): Promise<WebgameStatus> {
  try {
    const res = await fetch(`${webgameBase()}/status`, { next: { revalidate: 300, tags: [STATUS_TAG] }, signal: AbortSignal.timeout(5_000) });
    if (!res.ok) throw new Error(String(res.status));
    const body = (await res.json()) as Partial<WebgameStatus>;
    if (!isWebgameMode(body.mode)) throw new Error("mode");
    return { mode: body.mode, message: String(body.message ?? ""), until: body.until ?? null };
  } catch {
    return { mode: "soon", message: "", until: null };
  }
}
