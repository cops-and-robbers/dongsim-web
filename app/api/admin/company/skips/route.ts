import { NextResponse } from "next/server";
import { guard, isEventsWritable, noStore } from "@/lib/event/adminApi";
import { companyError } from "@/lib/company/adminApi";
import { readBundle, skipCandidate } from "@/lib/company/server";

/**
 * 올릴 일정에서 건너뛰기 (#250). 사이트에 닿지 않는다.
 *
 * POST { eventId }  CompanyBundle
 */
export async function POST(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (!isEventsWritable()) return NextResponse.json({ error: "실제 사이트의 관리 화면에서만 바꿀 수 있어요." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { eventId?: unknown } | null;
  const eventId = body?.eventId;
  if (typeof eventId !== "number" || !Number.isInteger(eventId) || eventId <= 0) return NextResponse.json({ error: "일정을 다시 골라 주세요." }, { status: 400 });
  try {
    await skipCandidate(eventId);
    return NextResponse.json(await readBundle(true), noStore);
  } catch (e) {
    return companyError(e);
  }
}
