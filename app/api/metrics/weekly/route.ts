import { NextResponse } from "next/server";
import { authorizedCron } from "@/lib/metrics/cron";
import { runWeekly } from "@/lib/metrics/weekly/run";

/**
 * 주간 리포트 (#146). 매주 월요일 오전 GitHub Actions(weekly-report.yml)가 부른다.
 * 구조와 시크릿은 /api/metrics/instagram 과 같다. ?dry=1 이면 보내지 않고 문구만 돌려준다.
 */

// 보내기 전에 GA4 최근 8일을 한 번 더 받는다(10~20초). 넉넉히 둔다
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!authorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  try {
    const result = await runWeekly({ dry });
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
