import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/server/checkAdmin";
import { addDays, todayIn } from "@/lib/metrics/dates";
import { db, selectAll } from "@/lib/metrics/db";
import { splitKey } from "@/lib/metrics/ga4/run";

/**
 * 우리 사용자가 어느 나라에 있는지 (#217). 시각을 고르는 화면(나라별 시각)이 지역 줄과 비율을 정하는 데 쓴다.
 *
 * 최근 13주 앱 첫 실행을 나라별로 센다. 테스트 기기는 수집 때 이미 뺐다(ga4/run.ts 의 first_open_country).
 * 매일 쓰는 사람의 나라별 수는 아직 모으지 않아서, 새로 들어온 사람 기준이다. 화면에도 그렇게 적는다.
 *
 * GET  { from, to, total, countries: [{ country, count }] }
 */

const DAYS = 91;

export async function GET(req: Request): Promise<NextResponse> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const admin = await checkAdmin(token);
  if (admin === "expired") return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (admin === "denied") return NextResponse.json({ error: "어드민만 볼 수 있어요." }, { status: 403 });

  const to = addDays(todayIn("Asia/Seoul"), -1);
  const from = addDays(to, -(DAYS - 1));
  try {
    const client = db();
    const rows = await selectAll<{ key: string; value: number }>(
      (a, b) =>
        client
          .from("ga4_daily")
          .select("key, value")
          .eq("property", "app")
          .eq("breakdown", "first_open_country")
          .eq("metric", "eventCount")
          .gte("day", from)
          .lte("day", to)
          .order("day")
          .order("key")
          .range(a, b),
      "나라별 첫 실행 읽기",
    );
    const by = new Map<string, number>();
    for (const r of rows) {
      // key 는 "플랫폼|나라"
      const country = splitKey(r.key)[1] ?? "";
      if (country) by.set(country, (by.get(country) ?? 0) + r.value);
    }
    const countries = [...by.entries()].map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count);
    const total = countries.reduce((a, c) => a + c.count, 0);
    // 하루 한 번 모으는 숫자라 한 시간 동안은 다시 읽지 않는다
    return NextResponse.json({ from, to, total, countries }, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch (e) {
    console.error("[user-countries]", e);
    return NextResponse.json({ error: "나라별 사용자를 읽지 못했어요." }, { status: 502 });
  }
}
