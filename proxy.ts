import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isKoOnlyPath, stripLocale } from "./lib/i18n/config";

// 이 Next 16은 middleware가 proxy로 바뀌었다.
// /en·/ja로 한국어 전용 실제 페이지(블로그·약관 등)에 접근하면 한국어로 보낸다.
// 그 외(존재하지 않는 경로)는 통과시켜 해당 언어의 404가 뜨게 한다.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const seg = pathname.split("/")[1] ?? "";
  if (seg === "en" || seg === "ja") {
    const base = stripLocale(pathname);
    if (isKoOnlyPath(base)) {
      const url = request.nextUrl.clone();
      url.pathname = base;
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/en/:path*", "/ja/:path*"],
};
