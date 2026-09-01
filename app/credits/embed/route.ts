import { renderCreditsEmbedHtml } from "@/lib/credits/embed-html";

// 앱 웹뷰 전용 경로(#82). 설정 > 버전 5탭의 크레딧 화면이 이 주소를 연다
// (FE #519). legal embed 와 같은 이유로 Route Handler 다 - 루트 레이아웃의
// GTM·헤더·푸터를 앱 안까지 끌고 들어가지 않는다.

// 정본이 빌드에 포함되므로 legal embed 처럼 정적으로 미리 만든다
export const dynamic = "force-static";

export function GET() {
  return new Response(renderCreditsEmbedHtml(), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // 인원이 바뀌면 웹 배포만으로 갱신돼야 하므로 매번 재검증시킨다.
      // Vercel 이 ETag 를 붙여주어 내용이 같으면 본문 없이 304 다.
      "Cache-Control": "public, max-age=0, must-revalidate",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
