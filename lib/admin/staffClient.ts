// 지표에서 빼는 운영진 계정(#165)을 읽고 바꾼다. 토큰이 만료됐으면 한 번 재발급하고 다시 묻는다(changesClient 와 같은 방식).
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";

async function call(url: string, init: RequestInit = {}): Promise<Response> {
  const send = () => fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${getAccessToken() ?? ""}` }, cache: "no-store" });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  return res;
}

/** 운영진으로 지정한 회원 번호들. 관리자 권한 계정은 여기 없어도 자동으로 운영진이다 */
export async function fetchStaffIds(): Promise<Set<string>> {
  const res = await call("/api/admin/metrics/staff");
  const body = (await res.json().catch(() => null)) as { userId: string }[] | null;
  if (!res.ok || !Array.isArray(body)) throw new Error("운영진 목록을 불러오지 못했어요.");
  return new Set(body.map((a) => String(a.userId)));
}

export async function setStaff(userId: string, on: boolean): Promise<void> {
  const res = await call(`/api/admin/metrics/staff?userId=${encodeURIComponent(userId)}`, {
    method: on ? "PUT" : "DELETE",
    headers: { "Content-Type": "application/json" },
    body: on ? JSON.stringify({ note: "어드민에서 지정" }) : undefined,
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(b.error ?? "바꾸지 못했어요. 잠시 뒤 다시 해 주세요.");
  }
}
