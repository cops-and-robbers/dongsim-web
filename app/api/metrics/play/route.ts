import { NextResponse } from "next/server";
import { authorizedCron } from "@/lib/metrics/cron";
import { runPlay } from "@/lib/metrics/play/run";

/**
 * Google Play 리포트 수집 (#147). 매일 GitHub Actions(metrics-collect.yml)가 부른다.
 * 구조와 시크릿은 /api/metrics/appstore 와 같다.
 *
 * ?dry=1 - 받아서 세기만 하고 저장하지 않는다
 * ?from=YYYY-MM-DD 또는 all - 그 달부터 다시 채운다 (기본은 지난달과 이번 달 파일)
 *
 * 하나라도 실패하면 500 이다. 크론이 실패로 끝나야 GitHub 가 알려 준다.
 */

export const maxDuration = 300;

const FROM = /^(\d{4}-\d{2}-\d{2}|all)$/;

export async function POST(req: Request) {
  if (!authorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams;
  const from = q.get("from") ?? undefined;
  if (from && !FROM.test(from)) return NextResponse.json({ error: "from 형식이 달라요" }, { status: 400 });
  try {
    const result = await runPlay({ dry: q.get("dry") === "1", from });
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
