import { NextResponse } from "next/server";
import { actorName } from "@/lib/admin/server/remoteConfig";
import { guard, isEventsWritable, noStore, storeError, type EventDetail } from "@/lib/event/adminApi";
import { ConflictError, readEventDays, readHistory, readMinigameStored, readStored, writeStored } from "@/lib/event/server";
import { normalize, validate, type EventSettings } from "@/lib/event/settings";

/**
 * 어드민 행사 하나 (#219).
 *
 * GET                       EventDetail
 * PUT { settings, version } 연 뒤에 남이 먼저 저장했으면 409. 바꾼 사람 이름은 토큰으로 백엔드에 묻는다
 */

// RouteContext 전역 타입은 next typegen 이 만들어서, 생성 파일 없이 도는 CI 타입 검사에서는 없다. 그래서 직접 적는다
type Ctx = { params: Promise<{ id: string }> };

async function findEvent(id: string) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return null;
  return (await readEventDays()).find((e) => e.id === n) ?? null;
}

async function detail(id: string): Promise<EventDetail | null> {
  const event = await findEvent(id);
  if (!event) return null;
  const [stored, history, minigame] = await Promise.all([readStored(event), readHistory(event.id, event), readMinigameStored()]);
  return { event, ...stored, history, minigame, writable: isEventsWritable() };
}

export async function GET(req: Request, ctx: Ctx): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  try {
    const body = await detail((await ctx.params).id);
    if (!body) return NextResponse.json({ error: "행사를 찾지 못했어요. 지표 일정에서 지워졌거나 성격이 바뀌었을 수 있어요." }, { status: 404 });
    return NextResponse.json(body, noStore);
  } catch (e) {
    return storeError(e);
  }
}

export async function PUT(req: Request, ctx: Ctx): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (!isEventsWritable()) return NextResponse.json({ error: "운영 어드민에서만 바꿀 수 있어요." }, { status: 403 });

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { settings?: unknown; version?: unknown } | null;
  try {
    const event = await findEvent(id);
    if (!event) return NextResponse.json({ error: "행사를 찾지 못했어요." }, { status: 404 });
    if (!body || typeof body.version !== "number") return NextResponse.json({ error: "보낸 값이 올바르지 않아요." }, { status: 400 });
    const current = await readStored(event);
    const settings: EventSettings = normalize(body.settings, current.settings);
    const problems = validate(settings);
    const first = Object.values(problems)[0];
    if (first) return NextResponse.json({ error: first, problems }, { status: 400 });

    await writeStored(event.id, settings, body.version, await actorName(checked.token));
    return NextResponse.json(await detail(id), noStore);
  } catch (e) {
    if (e instanceof ConflictError) {
      return NextResponse.json({ error: "다른 분이 먼저 저장했어요. 새로 불러온 값을 보고 다시 고쳐 주세요." }, { status: 409 });
    }
    return storeError(e);
  }
}
