import { NextResponse } from "next/server";
import { isCardKey } from "@/lib/admin/overview/cards";
import { overview } from "@/lib/admin/overview/server";
import { guard, noStore } from "@/lib/event/adminApi";

/**
 * 개요 카드 값 (docs/admin-ui.md "개요 카드").
 *
 * GET ?cards=newu,ig,rel   OverviewData. 서버가 계산하는 카드만 돌려준다. 실시간 카드는 화면이 백엔드에서 바로 읽는다
 */
export const maxDuration = 30;

export async function GET(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  const keys = (new URL(req.url).searchParams.get("cards") ?? "").split(",").filter(isCardKey);
  return NextResponse.json(await overview([...new Set(keys)]), noStore);
}
