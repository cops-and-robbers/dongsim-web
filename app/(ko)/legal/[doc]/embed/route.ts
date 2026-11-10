import { createLegalEmbedRoute } from "@/lib/legal/embed-route";

// 앱 웹뷰 전용 경로(#47). 사이트에 노출되는 /terms /privacy /location /marketing 은
// 그대로 둔다. 스토어 심사 정보와 검색 색인이 그 주소를 쓰고 있어 건드리면 안 된다.
//
// page.tsx 가 아니라 Route Handler 인 이유는 embed-html.ts 주석에 적어두었다.
// 한 줄로 줄이면, 루트 레이아웃의 GTM·헤더·푸터를 앱 안까지 끌고 들어가지 않으려는 것이다.

export const dynamicParams = false;
export const { GET, generateStaticParams } = createLegalEmbedRoute("ko");
