import { renderCreditsEmbedHtml } from "@/lib/credits/embed-html";
import { appCreditHelpers } from "@/lib/company/server";

// 앱 웹뷰 전용 경로(#82). 설정 > 버전 5탭의 크레딧 화면이 이 주소를 연다
// (FE #519). legal embed 와 같은 이유로 Route Handler 다 - 루트 레이아웃의
// GTM·헤더·푸터를 앱 안까지 끌고 들어가지 않는다.

// 도와준 분들은 어드민 "동심지키미 소개"에서 고친다(#250). 저장소 값은 서버가 묶어 읽고, 저장하면 바로 버린다.
export async function GET() {
  const helpers = await appCreditHelpers();
  return new Response(renderCreditsEmbedHtml(helpers ?? []), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // 앱은 열 때마다 묻고, 사이트 데모도 같은 주소를 띄워서 CDN 이 1분만 대신 답한다.
      // 명단을 못 읽은 응답은 CDN 에 남기지 않는다
      "Cache-Control": helpers ? "public, max-age=0, s-maxage=60, stale-while-revalidate=600" : "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
