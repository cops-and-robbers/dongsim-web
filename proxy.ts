import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 관리자(admin)는 admin. 서브도메인에서만 접근할 수 있게 막아요.
// - 메인 도메인의 /admin 은 없는 것처럼 404 로 숨겨요.
// - admin. 루트로 들어오면 바로 관리자 화면으로 보내요.
// - 로컬 개발(localhost)은 예외로 열어둬서 기존 개발 흐름을 안 깨요.
//   (서브도메인 동작을 로컬에서 확인하려면 admin.localhost 로 접속하면 돼요.)
// Next 16 규약: middleware -> proxy 로 이름이 바뀌었어요.
export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const { pathname } = request.nextUrl;

  const isAdminHost = host.startsWith("admin.");
  const isLocalhost = host === "localhost" || host === "127.0.0.1";

  // admin 서브도메인 루트로 들어오면 관리자 화면으로
  if (isAdminHost && pathname === "/") {
    return NextResponse.rewrite(new URL("/admin", request.url));
  }

  // /admin 은 admin 서브도메인(또는 로컬 개발)에서만
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (isAdminHost || isLocalhost) {
      return NextResponse.next();
    }
    // 그 외 도메인에서는 존재하지 않는 것처럼 404
    return NextResponse.rewrite(new URL("/_not-found", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin", "/admin/:path*"],
};
