import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/metrics/db";
import { LINK_COLUMNS, downloadPath, isCode, toLink } from "@/lib/download/links";

/**
 * 행사 링크 짧은 주소 /q/<코드> (#171).
 *
 * 어드민에서 등록한 꼬리표를 붙여 /download 로 보낸다. /download 가 기기를 보고 스토어로 넘기면서
 * 꼬리표를 Play referrer 와 App Store 캠페인 토큰으로 이어 준다(#144). GA4 는 /download 방문으로 꼬리표를 잡으니
 * 집계는 지금 쓰는 그대로다.
 *
 * - 302(임시 이동): 링크의 꼬리표를 나중에 고칠 수 있어야 한다. 308 이면 브라우저가 옛 목적지를 기억한다(/apply 와 같은 이유)
 * - 없는 코드, 잘못된 코드, 저장소 오류는 꼬리표 없이 /download 로 보낸다. 포스터를 찍은 사람을 오류 화면에 세우지 않는다
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/q/[code]">): Promise<NextResponse> {
  const { code } = await ctx.params;
  const target = await targetOf(code.toLowerCase());
  const res = NextResponse.redirect(new URL(target, req.url), 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

async function targetOf(code: string): Promise<string> {
  if (!isCode(code)) return "/download";
  try {
    const { data, error } = await db().from("metrics_links").select(LINK_COLUMNS).eq("code", code).maybeSingle();
    if (error || !data) return "/download";
    return downloadPath(toLink(data));
  } catch {
    return "/download";
  }
}
