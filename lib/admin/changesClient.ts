// 어드민 변경 기록(#313)을 부른다. 토큰이 만료됐으면 한 번 재발급하고 다시 묻는다(teamClient 와 같은 방식).
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import type { Change } from "@/lib/changes/model";

export type ChangesResult = { days: number; changes: Change[]; missing: string[] };

export async function fetchChanges(days: number): Promise<ChangesResult> {
  const go = () => fetch(`/api/admin/changes?days=${days}`, { headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` }, cache: "no-store" });
  let res = await go();
  if (res.status === 401 && (await reissue())) res = await go();
  const body = (await res.json().catch(() => ({}))) as ChangesResult & { error?: string };
  if (!res.ok) throw new Error(body.error ?? "변경 기록을 불러오지 못했어요.");
  return body;
}
