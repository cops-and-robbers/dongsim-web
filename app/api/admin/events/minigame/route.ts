import { NextResponse } from "next/server";
import { actorName } from "@/lib/admin/server/remoteConfig";
import { guard, isEventsWritable, noStore, storeError } from "@/lib/event/adminApi";
import { writeMinigame } from "@/lib/event/server";
import { toMs, type HomeMinigame } from "@/lib/event/settings";

/**
 * 홈 미니게임 칸을 보이는 기간 (#219). 행사에 매이지 않는 사이트 설정 하나다.
 *
 * PUT { value: { from, until } | null }   null 이면 숨김
 */
const isTime = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) && !Number.isNaN(toMs(v));

export async function PUT(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (!isEventsWritable()) return NextResponse.json({ error: "운영 어드민에서만 바꿀 수 있어요." }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { value?: { from?: unknown; until?: unknown } | null } | null;
  if (!body || body.value === undefined) return NextResponse.json({ error: "보낸 값이 올바르지 않아요." }, { status: 400 });
  let value: HomeMinigame = null;
  if (body.value !== null) {
    const { from, until } = body.value;
    if (!isTime(from) || !isTime(until)) return NextResponse.json({ error: "보이는 기간을 골라 주세요." }, { status: 400 });
    if (toMs(until) <= toMs(from)) return NextResponse.json({ error: "끝이 시작보다 뒤여야 해요." }, { status: 400 });
    value = { from, until };
  }
  try {
    await writeMinigame(value, await actorName(checked.token));
    return NextResponse.json({ value }, noStore);
  } catch (e) {
    return storeError(e);
  }
}
