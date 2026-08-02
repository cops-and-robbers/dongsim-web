import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isTranslatedPath, stripLocale } from "./lib/i18n/config";

// 이 Next 16은 middleware가 proxy로 바뀌었다.
// /en·/ja 하위 경로 중 아직 번역되지 않은 페이지(블로그·약관 등)는 한국어(루트)로 보낸다.
// 번역된 경로(TRANSLATED_PATHS)만 로케일 접두어로 유지한다.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const seg = pathname.split("/")[1] ?? "";
  if (seg === "en" || seg === "ja") {
    const base = stripLocale(pathname);
    if (!isTranslatedPath(base)) {
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
