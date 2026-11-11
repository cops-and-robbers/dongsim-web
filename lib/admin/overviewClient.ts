// 어드민 개요의 서버 카드 값을 부른다. 토큰이 만료됐으면 한 번 재발급하고 다시 묻는다(reviewsClient 와 같은 방식).
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import type { CardKey, OverviewData } from "@/lib/admin/overview/cards";

export async function fetchOverview(keys: CardKey[]): Promise<OverviewData> {
  const url = `/api/admin/overview?cards=${keys.join(",")}`;
  const go = () => fetch(url, { headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` }, cache: "no-store" });
  let res = await go();
  if (res.status === 401 && (await reissue())) res = await go();
  const body = (await res.json().catch(() => ({}))) as OverviewData & { error?: string };
  if (!res.ok) throw new Error(body.error ?? "개요 카드를 불러오지 못했어요.");
  return body;
}
