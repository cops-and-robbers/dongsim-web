import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // Relay: graphql`` 태그를 __generated__ 아티팩트 import로 변환(SWC).
  // 값은 relay.config.js 와 일치해야 한다.
  compiler: {
    relay: {
      src: "./",
      artifactDirectory: "./__generated__",
      language: "typescript",
      eagerEsModules: false,
    },
  },
  // OG 이미지 라우트는 요청 시점에 폰트·SVG를 readFile로 읽는데, 경로가 변수 조합이라
  // 파일 트레이싱이 놓친다 → 서버리스 번들에 명시적으로 포함(누락 시 프로덕션 500).
  outputFileTracingIncludes: {
    "/blog/[slug]/opengraph-image": [
      "node_modules/pretendard/dist/public/static/Pretendard-Bold.otf",
      "node_modules/pretendard/dist/public/static/Pretendard-ExtraBold.otf",
      "public/brand/header-logo.svg",
      "public/photobooth/cop.svg",
      "public/photobooth/thief.svg",
    ],
    "/blog/opengraph-image": [
      "node_modules/pretendard/dist/public/static/Pretendard-Bold.otf",
      "node_modules/pretendard/dist/public/static/Pretendard-ExtraBold.otf",
      "public/brand/header-logo.svg",
      "public/photobooth/cop.svg",
      "public/photobooth/thief.svg",
    ],
    "/ja/blog/opengraph-image": [
      "node_modules/pretendard/dist/public/static/Pretendard-Bold.otf",
      "node_modules/pretendard/dist/public/static/Pretendard-ExtraBold.otf",
      "public/brand/header-logo.svg",
      "public/photobooth/cop.svg",
      "public/photobooth/thief.svg",
    ],
    "/en/blog/opengraph-image": [
      "node_modules/pretendard/dist/public/static/Pretendard-Bold.otf",
      "node_modules/pretendard/dist/public/static/Pretendard-ExtraBold.otf",
      "public/brand/header-logo.svg",
      "public/photobooth/cop.svg",
      "public/photobooth/thief.svg",
    ],
    "/ja/blog/[slug]/opengraph-image": [
      "node_modules/pretendard/dist/public/static/Pretendard-Bold.otf",
      "node_modules/pretendard/dist/public/static/Pretendard-ExtraBold.otf",
      "public/brand/header-logo.svg",
      "public/photobooth/cop.svg",
      "public/photobooth/thief.svg",
    ],
    "/en/blog/[slug]/opengraph-image": [
      "node_modules/pretendard/dist/public/static/Pretendard-Bold.otf",
      "node_modules/pretendard/dist/public/static/Pretendard-ExtraBold.otf",
      "public/brand/header-logo.svg",
      "public/photobooth/cop.svg",
      "public/photobooth/thief.svg",
    ],
    "/event/opengraph-image": [
      "node_modules/pretendard/dist/public/static/Pretendard-Bold.otf",
      "node_modules/pretendard/dist/public/static/Pretendard-ExtraBold.otf",
      "public/brand/header-logo.svg",
      "public/event/wanted.svg",
    ],
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    const json = [{ key: "Content-Type", value: "application/json" }];
    return [
      // 어드민 서브도메인은 본체와 같은 앱을 통째로 서빙하므로, 검색엔진이
      // 같은 콘텐츠를 두 주소로 보게 된다(#105). 실제로 서치 콘솔에
      // admin.copsandrobbers.app/blog 등이 크롤링돼 본체 색인 판단을 흐렸다.
      // /admin 라우트의 robots 메타만으로는 부족해서(본체 라우트가 어드민
      // 호스트로도 열린다) 호스트 단위로 색인을 금지한다.
      // robots.txt 차단은 쓰지 않는다 - 크롤 자체를 막으면 봇이 이 헤더를
      // 읽지 못해 "차단됐지만 색인됨" 상태가 남을 수 있다.
      {
        source: "/:path*",
        has: [{ type: "host", value: "admin.copsandrobbers.app" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      { source: "/.well-known/apple-app-site-association", headers: json },
      { source: "/.well-known/assetlinks.json", headers: json },
      // 법적 문서 폰트는 파일 이름에 내용 해시가 들어간다(#49). 이름이 같으면 내용도
      // 같으니 재검증할 이유가 없고, 그래서 앱이 약관을 열 때마다 폰트를 다시 묻지
      // 않는다. 문서를 고쳐 폰트를 새로 만들면 이름이 바뀌어 자연히 새로 받는다.
      //
      // 이 폴더에 이름이 고정인 파일을 두면 그게 1년간 박제되니 두지 않는다.
      {
        source: "/fonts/legal/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
