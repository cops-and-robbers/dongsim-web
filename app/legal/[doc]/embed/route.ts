import { LEGAL_DOCS, isLegalDoc, type LegalDoc } from "@/lib/legal/documents";
import { renderLegalEmbedHtml } from "@/lib/legal/embed-html";

// 앱 웹뷰 전용 경로(#47).
//
// 사이트에 노출되는 /terms /privacy /location /marketing 은 그대로 둔다.
// 스토어 심사 정보와 검색 색인이 그 주소를 쓰고 있어 건드리면 안 된다.
//
// page.tsx 가 아니라 Route Handler 인 이유는 embed-html.ts 주석에 적어두었다.
// 한 줄로 줄이면, 루트 레이아웃의 GTM·헤더·푸터를 앱 안까지 끌고 들어가지 않으려는 것이다.

export const dynamicParams = false;

export function generateStaticParams(): { doc: LegalDoc }[] {
  return LEGAL_DOCS.map((doc) => ({ doc }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ doc: string }> },
) {
  const { doc } = await params;
  if (!isLegalDoc(doc)) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(renderLegalEmbedHtml(doc), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // 앱이 ETag 로 갱신 여부를 판단한다(3단계 파일 캐시). Vercel 이 ETag 를
      // 붙여주므로 여기서는 매번 재검증만 시킨다. 조건부 요청이면 본문 없이 304 다.
      "Cache-Control": "public, max-age=0, must-revalidate",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
