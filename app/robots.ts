import type { MetadataRoute } from "next";

const BASE_URL = "https://copsandrobbers.app";

export default function robots(): MetadataRoute.Robots {
  return {
    // /legal/*/embed 는 앱 웹뷰 전용이다. 사이트의 /terms /privacy /location
    // /marketing 과 내용이 같아서, 색인되면 같은 문서가 두 주소로 잡힌다.
    // /credits/ 도 앱 웹뷰 전용(크레딧 히든 화면)이라 색인하지 않는다.
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/join/", "/legal/", "/ja/legal/", "/en/legal/", "/credits/"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
