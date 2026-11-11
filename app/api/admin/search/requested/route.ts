import { NextResponse } from "next/server";
import { guard, noStore } from "@/lib/event/adminApi";
import { actorName } from "@/lib/admin/server/remoteConfig";
import { canSend, markRequested } from "@/lib/search/store";
import { SITE } from "@/lib/search/config";

/**
 * 서치 콘솔에서 색인을 요청했다는 기록 (#309). 요청 자체는 API 가 없어 사람이 서치 콘솔에서 누른다.
 * 남겨 두면 "확인할 것"에서 다시 부르지 않고, 그 주소의 기록에 누가 언제 요청했는지 보인다.
 * 기록은 운영과 같은 DB 라서 운영 배포에서만 받는다.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;
  if (!canSend()) return NextResponse.json({ error: "운영 사이트의 어드민에서만 남길 수 있어요." }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { url?: unknown };
  const url = typeof body.url === "string" ? body.url : "";
  if (!url.startsWith(`${SITE}/`) && url !== SITE) return NextResponse.json({ error: "우리 사이트 주소가 아니에요." }, { status: 400 });
  try {
    await markRequested(url, await actorName(g.token));
    return NextResponse.json({ ok: true }, noStore);
  } catch (e) {
    console.error("[search requested]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "기록하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
