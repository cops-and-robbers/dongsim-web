import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "경찰과 도둑",
    short_name: "경찰과 도둑",
    description:
      "경찰과 도둑(경도) — GPS 기반 오프라인 술래잡기 게임. 친구들과 밖에서 직접 뛰며 놀던 그 놀이를 이제 앱과 함께 즐기세요.",
    id: "/",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "ko",
    dir: "ltr",
    categories: ["games", "entertainment"],
    icons: [
      {
        src: "/brand/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
