import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 관리자(admin)는 admin. 서브도메인에서만 접근할 수 있게 막아요.
// - 메인 도메인의 /admin 은 없는 것처럼 404 로 숨겨요.
// - admin. 루트로 들어오면 바로 관리자 화면으로 보내요.
// - 로컬 개발(localhost)은 예외로 열어둬서 기존 개발 흐름을 안 깨요.
//   (서브도메인 동작을 로컬에서 확인하려면 admin.localhost 로 접속하면 돼요.)
// Next 16 규약: middleware -> proxy 로 이름이 바뀌었어요.
// 구 도메인. 새 도메인으로 301 리다이렉트한다 (#60).
const OLD_HOST = "copsnro66ers.site";
const NEW_HOST = "copsandrobbers.app";

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const { pathname } = request.nextUrl;

  // 구 도메인(서브도메인 포함)은 같은 경로의 새 도메인으로 영구 이동.
  // /.well-known 은 제외한다 - 스토어에 있는 앱의 딥링크 검증이 구 도메인의
  // assetlinks.json 을 읽는데, 안드로이드 검증기는 리다이렉트를 따라가지 않는다.
  // 새 도메인 딥링크가 실린 앱이 배포되면 이 예외를 없앤다.
  if (host === OLD_HOST || host.endsWith(`.${OLD_HOST}`)) {
    if (!pathname.startsWith("/.well-known")) {
      const url = request.nextUrl.clone();
      url.protocol = "https";
      url.port = "";
      // admin 서브도메인만 admin 으로, 나머지(www 포함)는 본 도메인으로
      url.host = host.startsWith("admin.") ? `admin.${NEW_HOST}` : NEW_HOST;
      return NextResponse.redirect(url, 301);
    }
    return NextResponse.next();
  }

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
    // 그 외 도메인에서는 존재하지 않는 것처럼 404.
    // rewrite는 상태 코드를 그대로 두므로 404를 명시한다. 안 하면 404 화면을
    // 보여주면서 200을 응답해, 검색엔진이 정상 페이지로 보고 색인할 수 있다.
    return NextResponse.rewrite(new URL("/_not-found", request.url), {
      status: 404,
    });
  }

  return NextResponse.next();
}

/*
  위 일이 필요한 요청에만 돌게 좁힌다(#335). 예전에는 `_next` 만 빼고 모든 경로였는데,
  폰트 조각, 캐릭터 그림, 링크 미리 읽기마다 돌아서 홈 한 번에 68번, 최근 12시간
  5,800번 중 99%가 아무 일 없이 통과만 했다. 그게 Vercel CPU 사용량의 절반이었다.

  1. 구 도메인(서브도메인 포함)은 모든 경로를 보내야 하니 host 로 골라 전 경로.
     지금은 Vercel 도메인 설정이 먼저 308 로 넘겨서 여기까지 오지 않는다(2026-11-15 확인).
     도메인 설정을 바꿔 이 프로젝트가 직접 받게 되면 다시 일한다
  2. /admin 은 메인 도메인에서만(404 로 숨긴다). admin 서브도메인과 로컬은 그냥 통과시키는
     것뿐이라 빼 둔다. 어드민 메뉴가 화면마다 미리 읽어 한 번 열 때 수십 번 돌았다(#337)
  3. admin 서브도메인의 루트(관리자 화면으로 바꿔 보여 준다)

  host 조건은 공식 문서에 있는 header 형식으로 쓴다. 값은 앞뒤가 고정된 정규식이고
  포트가 붙어 와도 맞게 둔다. 매처를 바꾸면 proxy.test.mjs 를 같이 고친다.
*/
export const config = {
  matcher: [
    {
      source: "/((?!_next/).*)",
      has: [{ type: "header", key: "host", value: "(?:.+\\.)?copsnro66ers\\.site(?::\\d+)?" }],
    },
    { source: "/admin", missing: [{ type: "header", key: "host", value: "(?:admin\\..+|localhost|127\\.0\\.0\\.1)(?::\\d+)?" }] },
    { source: "/admin/:path*", missing: [{ type: "header", key: "host", value: "(?:admin\\..+|localhost|127\\.0\\.0\\.1)(?::\\d+)?" }] },
    {
      source: "/",
      has: [{ type: "header", key: "host", value: "admin\\..+" }],
    },
  ],
};
