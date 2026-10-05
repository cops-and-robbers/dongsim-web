import { NextResponse } from "next/server";
import { runInstagramReport } from "@/lib/metrics/instagram/run";

/**
 * 인스타 성과 수집과 디스코드 리포트 (#140).
 *
 * 매일 오전 9시 GitHub Actions(instagram-report.yml)가 부른다. 블로그 동기화와
 * 같은 구조다 - 공개 주소라 시크릿(METRICS_CRON_SECRET)으로 막고, 시크릿은
 * 헤더로만 받는다(쿼리 스트링은 접속 로그로 샌다).
 *
 * ?dry=1 이면 디스코드로 보내지 않고 보냈을 메시지를 응답에 담는다. 문구를
 * 고친 뒤 채널을 어지럽히지 않고 확인할 때 쓴다.
 *
 * 응답은 무엇이 되고 안 됐는지를 그대로 담고, 하나라도 실패하면 500 이다.
 * 크론이 실패로 끝나야 GitHub 가 알려 준다.
 */

// 게시물이 늘면 인스타 호출이 늘어난다. Hobby 플랜 상한이 300초다.
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.METRICS_CRON_SECRET;
  if (!secret) return false;
  const fromHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return fromHeader === secret;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  try {
    const result = await runInstagramReport({ dry });
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
