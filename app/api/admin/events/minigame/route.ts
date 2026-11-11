import { NextResponse } from "next/server";
import { actorName } from "@/lib/admin/server/remoteConfig";
import { guard, isEventsWritable, noStore, storeError } from "@/lib/event/adminApi";
import { readMinigameStored, writeMinigame } from "@/lib/event/server";
import { shortTime, toMs, type HomeMinigame } from "@/lib/event/settings";
import { recordChange } from "@/lib/changes/server";
import { actionOf, diffValues } from "@/lib/changes/model";

const shown = (v: HomeMinigame) => (v ? { from: shortTime(v.from), until: shortTime(v.until) } : null);

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
    const before = await readMinigameStored().catch(() => null);
    const actor = await actorName(checked.token);
    await writeMinigame(value, actor);
    // 변경 기록(#313). 숨김은 "없음"으로 남긴다
    await recordChange({ actor, area: "event", target: "홈 미니게임 칸", action: actionOf(before, value), fields: diffValues(shown(before), shown(value), { from: "보이기 시작", until: "보이기 끝" }), href: "/admin/events" });
    return NextResponse.json({ value }, noStore);
  } catch (e) {
    return storeError(e);
  }
}
