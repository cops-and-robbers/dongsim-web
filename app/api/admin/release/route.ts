import { NextResponse } from "next/server";
import { guard, noStore } from "@/lib/event/adminApi";
import { refreshReleaseBoard, releaseBoard } from "@/lib/release/server";

/**
 * 어드민 "출시" 보드. 두 스토어의 지금 상태와 다음 할 일 (docs/admin-ui.md "출시").
 * 읽기만 한다. ?fresh=1 이면 1분 캐시를 비우고 다시 읽는다.
 *
 * GET  ReleaseBoard
 */
export const maxDuration = 30;

export async function GET(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (new URL(req.url).searchParams.get("fresh") === "1") refreshReleaseBoard();
  try {
    return NextResponse.json(await releaseBoard(), noStore);
  } catch (e) {
    console.error("[release]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "출시 상태를 불러오지 못했어요. 잠시 뒤 다시 읽어 주세요." }, { status: 502 });
  }
}
