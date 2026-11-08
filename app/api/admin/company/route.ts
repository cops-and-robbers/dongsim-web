import { NextResponse } from "next/server";
import { guard, isEventsWritable, noStore } from "@/lib/event/adminApi";
import { companyError } from "@/lib/company/adminApi";
import { readBundle } from "@/lib/company/server";

/**
 * 어드민 "동심지키미 소개" (#250). 이력, 명단, 올릴 일정, 최근 고친 기록을 한 번에 준다.
 *
 * GET  CompanyBundle
 */
export async function GET(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  try {
    return NextResponse.json(await readBundle(isEventsWritable()), noStore);
  } catch (e) {
    return companyError(e);
  }
}
