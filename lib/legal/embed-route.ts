// 로케일별 embed 라우트를 만드는 팩토리(#47).
//
// Route Handler 는 파일 경로가 곧 라우트라 로케일을 인자로 받을 수 없다.
// 로케일마다 파일을 두되 본문은 여기 한 곳에 모아, 세 라우트가 갈라지지 않게 한다.

import { LEGAL_DOCS, isLegalDoc, type LegalDoc } from "./documents";
import { renderLegalEmbedHtml } from "./embed-html";
import type { Locale } from "@/lib/i18n/config";

export function createLegalEmbedRoute(locale: Locale) {
  async function GET(
    _request: Request,
    { params }: { params: Promise<{ doc: string }> },
  ) {
    const { doc } = await params;
    if (!isLegalDoc(doc)) {
      return new Response("Not Found", { status: 404 });
    }

    return new Response(renderLegalEmbedHtml(doc, { locale }), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // 앱이 ETag 로 갱신 여부를 판단한다(3단계 파일 캐시). Vercel 이 ETag 를
        // 붙여주므로 여기서는 매번 재검증만 시킨다. 조건부 요청이면 본문 없이 304 다.
        "Cache-Control": "public, max-age=0, must-revalidate",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  function generateStaticParams(): { doc: LegalDoc }[] {
    return LEGAL_DOCS.map((doc) => ({ doc }));
  }

  return { GET, generateStaticParams };
}
