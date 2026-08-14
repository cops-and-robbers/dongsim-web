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
      { source: "/.well-known/apple-app-site-association", headers: json },
      { source: "/.well-known/assetlinks.json", headers: json },
    ];
  },
};

export default nextConfig;
