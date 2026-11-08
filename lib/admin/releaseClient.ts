// 어드민 화면에서 출시 보드를 부른다. 토큰이 만료됐으면 한 번 재발급하고 다시 묻는다(eventsClient 와 같은 방식).
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import type { ReleaseBoard } from "@/lib/release/board";

export async function fetchReleaseBoard(opts: { fresh?: boolean; scenario?: string } = {}): Promise<ReleaseBoard> {
  const q = new URLSearchParams();
  if (opts.fresh) q.set("fresh", "1");
  if (opts.scenario) q.set("scenario", opts.scenario);
  const url = `/api/admin/release${q.size ? `?${q}` : ""}`;
  const send = () => fetch(url, { headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` }, cache: "no-store" });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  const body = (await res.json().catch(() => ({}))) as ReleaseBoard & { error?: string };
  if (!res.ok) throw new Error(body.error ?? "잠시 뒤 다시 시도해 주세요.");
  return body;
}

export type ReleaseActionBody = { id: string; expect: string; confirm?: string; fraction?: number; notes?: { language: string; text: string }[]; dryRun?: boolean };
export type ReleaseActionResult = { message: string; validated?: boolean };

/** 출시 조작. stale 이면 화면을 연 뒤 스토어 상태가 바뀐 것 */
export class ReleaseActionError extends Error {
  constructor(
    message: string,
    readonly stale: boolean,
  ) {
    super(message);
  }
}

export async function runReleaseAction(body: ReleaseActionBody): Promise<ReleaseActionResult> {
  const send = () =>
    fetch("/api/admin/release/actions", {
      method: "POST",
      headers: { Authorization: `Bearer ${getAccessToken() ?? ""}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  const out = (await res.json().catch(() => ({}))) as ReleaseActionResult & { error?: string; stale?: boolean };
  if (!res.ok) throw new ReleaseActionError(out.error ?? "잠시 뒤 다시 시도해 주세요.", !!out.stale);
  return out;
}
