import { NextResponse } from "next/server";
import { authorizedCron } from "@/lib/metrics/cron";
import { runSearch } from "@/lib/search/run";

/**
 * 구글 검색 색인 현황 수집(#309). 매일 GitHub Actions(metrics-collect.yml)가 부른다.
 * 구조와 시크릿은 다른 지표 수집(/api/metrics/daangn)과 같다.
 *
 * ?dry=1 - 받아서 세기만 하고 저장하지도 알리지도 않는다
 * ?from=YYYY-MM-DD 또는 all - 검색 실적을 그날부터 다시 채운다 (기본은 최근 10일)
 */

export const maxDuration = 300;

const FROM = /^(\d{4}-\d{2}-\d{2}|all)$/;

export async function POST(req: Request) {
  if (!authorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams;
  const from = q.get("from") ?? undefined;
  if (from && !FROM.test(from)) return NextResponse.json({ error: "from 형식이 달라요" }, { status: 400 });
  try {
    const result = await runSearch({ dry: q.get("dry") === "1", from });
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
