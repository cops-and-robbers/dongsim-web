import { NextResponse } from "next/server";
import { guard, isEventsWritable, noStore, storeError } from "@/lib/event/adminApi";
import { listAssets, updateAsset, usage } from "@/lib/event/assetsServer";

/**
 * 그림 하나 고치기 (#224). 이름 바꾸기, 숨기기와 다시 보이기. 파일은 지우지 않는다(지난 행사 기록이 그 그림을 가리킨다).
 * 쓰는 행사가 있으면 숨기지 못한다. 부스가 그 그림을 계속 쓰기 때문이다
 *
 * PATCH { label?, archived? }
 */
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (!isEventsWritable()) return NextResponse.json({ error: "운영 어드민에서만 바꿀 수 있어요." }, { status: 403 });
  const id = Number((await ctx.params).id);
  const body = (await req.json().catch(() => null)) as { label?: unknown; archived?: unknown } | null;
  if (!Number.isInteger(id) || !body) return NextResponse.json({ error: "보낸 값이 올바르지 않아요." }, { status: 400 });

  const patch: { label?: string; archived?: boolean } = {};
  if (typeof body.label === "string") {
    const label = body.label.trim();
    if (!label || label.length > 20) return NextResponse.json({ error: "이름은 1자에서 20자예요." }, { status: 400 });
    patch.label = label;
  }
  if (typeof body.archived === "boolean") patch.archived = body.archived;

  try {
    if (patch.archived) {
      const asset = (await listAssets()).find((a) => a.id === id);
      const users = asset ? ((await usage())[asset.key] ?? []) : [];
      if (users.length) return NextResponse.json({ error: `${users.join(", ")}에서 쓰고 있어 숨길 수 없어요. 그 행사에서 먼저 빼 주세요.` }, { status: 409 });
    }
    const asset = await updateAsset(id, patch);
    if (!asset) return NextResponse.json({ error: "그림을 찾지 못했어요." }, { status: 404 });
    return NextResponse.json({ asset }, noStore);
  } catch (e) {
    return storeError(e);
  }
}
