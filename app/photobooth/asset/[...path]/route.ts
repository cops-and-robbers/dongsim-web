import { NextResponse } from "next/server";
import { KEY_RE } from "@/lib/event/assets";
import { PHOTOBOOTH_PUBLIC_BASE } from "@/lib/photobooth/constants";

/**
 * 그림 보관함의 그림을 사이트 주소로 내려준다(#224).
 *
 * 부스는 프레임을 canvas 에 그려 사진과 합성한다. 다른 주소(r2.dev)의 그림을 그리면 버킷 CORS 에 그 페이지 주소가 있어야 하는데,
 * 어드민 주소는 없다. 같은 주소로 거치면 어디서 열어도 막히지 않는다. 그림 키는 올릴 때마다 새로 지어 내용이 바뀌지 않아 오래 둔다.
 * 키 모양을 먼저 검사해 다른 파일(손님 사진 strips/ 등)은 내주지 않는다.
 */
type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  const key = `assets/${(await ctx.params).path.join("/")}`;
  if (!KEY_RE.test(key)) return new NextResponse("Not found", { status: 404 });
  // 로컬 어드민 목(lib/admin-mock/assets.ts)의 예시 그림은 기본 그림으로 돌려준다. 운영에는 이런 키가 없다
  if (process.env.NODE_ENV !== "production" && key.includes("/dev-sample")) {
    const file = key.startsWith("assets/frame/") ? "/photobooth/frame-green.png" : "/photobooth/cop-search.svg";
    return NextResponse.redirect(new URL(file, _req.url), 302);
  }
  const res = await fetch(`${PHOTOBOOTH_PUBLIC_BASE}/${key}`, { cache: "no-store" });
  if (!res.ok || !res.body) return new NextResponse("Not found", { status: 404 });
  return new Response(res.body, {
    headers: {
      "Content-Type": key.endsWith(".webp") ? "image/webp" : "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
