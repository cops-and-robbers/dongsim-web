import { NextResponse } from "next/server";
import { actorName } from "@/lib/admin/server/remoteConfig";
import { guard, noStore } from "@/lib/event/adminApi";
import { isManual, refreshStoreCheck, setDone, storeCheck } from "@/lib/store-check/server";

/**
 * 어드민 스토어 점검 (docs/admin-ui.md "스토어 점검"). 스토어에는 쓰지 않는다.
 *
 * GET   ?fresh=1 이면 스토어를 다시 읽는다      StoreCheck
 * PATCH { id, done }  사람이 끝냈다고 표시한다   { ok: true }
 */
export const maxDuration = 30;

export async function GET(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (new URL(req.url).searchParams.get("fresh") === "1") refreshStoreCheck();
  try {
    return NextResponse.json(await storeCheck(), noStore);
  } catch (e) {
    console.error("[store-check]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "점검 결과를 불러오지 못했어요. 잠시 뒤 다시 확인해 주세요." }, { status: 502 });
  }
}

export async function PATCH(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (process.env.VERCEL_ENV !== "production") return NextResponse.json({ error: "운영 어드민에서만 저장돼요." }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { id?: unknown; done?: unknown };
  if (typeof body.id !== "string" || !isManual(body.id) || typeof body.done !== "boolean") return NextResponse.json({ error: "어느 항목인지 알 수 없어요." }, { status: 400 });
  try {
    await setDone(body.id, body.done, await actorName(checked.token));
    return NextResponse.json({ ok: true }, noStore);
  } catch (e) {
    console.error("[store-check] 저장", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
