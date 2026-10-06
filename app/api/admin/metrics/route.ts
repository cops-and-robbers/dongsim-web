import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/server/isAdmin";
import { loadDashboard } from "@/lib/metrics/dashboard/data";
import { addDays, todayIn } from "@/lib/metrics/dates";
import { db } from "@/lib/metrics/db";

/**
 * 어드민 지표 화면의 데이터 (#145).
 *
 * 지표 테이블은 service role 로만 읽히고, 그 키를 브라우저에 내려보낼 수 없다.
 * 이 라우트가 어드민 토큰을 백엔드에 물어 확인한 뒤 대신 읽어 내려준다
 * (/api/admin/blog-sync 와 같은 확인 방식).
 *
 * ?days=7|28|90 - 어제(한국 날짜)까지 그만큼. 그 앞 같은 길이와 견준다.
 */

const DAYS = new Set([7, 28, 90]);

export async function GET(req: Request): Promise<NextResponse> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (!(await isAdmin(token))) return NextResponse.json({ error: "어드민만 볼 수 있어요." }, { status: 403 });

  const days = Number(new URL(req.url).searchParams.get("days") ?? 28);
  if (!DAYS.has(days)) return NextResponse.json({ error: "기간은 7, 28, 90일 중에 골라요." }, { status: 400 });
  // 오늘은 아직 숫자가 다 안 들어왔다. 어제까지 본다
  const end = addDays(todayIn("Asia/Seoul"), -1);
  try {
    const data = await loadDashboard(db(), { start: addDays(end, -(days - 1)), end });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
