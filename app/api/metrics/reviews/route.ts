import { NextResponse } from "next/server";
import { authorizedCron } from "@/lib/metrics/cron";
import { backfillPlayReviews, syncReviews } from "@/lib/reviews/server";

/**
 * 스토어 리뷰 수집. 매일 GitHub Actions(metrics-collect.yml)가 부른다.
 * Google Play API 가 최근 7일치만 주므로 아무도 어드민을 열지 않아도 쌓이게 한다.
 * 하나라도 실패하면 500 이다. 크론이 실패로 끝나야 GitHub 가 알려 준다.
 */
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!authorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await syncReviews();
  try {
    const playStored = await backfillPlayReviews();
    return NextResponse.json({ ...result, playStored }, { status: result.error ? 500 : 200 });
  } catch (e) {
    return NextResponse.json({ ...result, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
