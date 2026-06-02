import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// 캐릭터/로고 SVG와 브랜드 컬러를 조합해 동적으로 생성하는 OG 이미지.
// 에셋을 런타임에 읽으므로 캐릭터를 교체하면 OG에도 자동 반영된다.
// 앱인토스 OG 가이드 기준: 1200×600, 텍스트 최소화(로고+한 줄), 추격 캐릭터를 크게.

export const alt = "경찰과 도둑 — 앱으로 더 쉽고 몰입감 있게 즐기는 GPS 술래잡기";
export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

const FONT_DIR = "node_modules/pretendard/dist/public/static";

async function svgDataUri(relPath: string) {
  const buf = await readFile(join(process.cwd(), relPath));
  return `data:image/svg+xml;base64,${buf.toString("base64")}`;
}

export default async function Image() {
  const [bold, extraBold, logo, robber, police] = await Promise.all([
    readFile(join(process.cwd(), FONT_DIR, "Pretendard-Bold.otf")),
    readFile(join(process.cwd(), FONT_DIR, "Pretendard-ExtraBold.otf")),
    svgDataUri("public/brand/header-logo.svg"),
    svgDataUri("public/characters/robber-flee.svg"),
    svgDataUri("public/characters/police-chase.svg"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          fontFamily: "Pretendard",
          color: "#0f1a33",
          background:
            "linear-gradient(120deg, #eaf0ff 0%, #ffffff 58%, #eafaf0 100%)",
          overflow: "hidden",
        }}
      >
        {/* 왼쪽: 로고 + 한 줄 소개 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: 560,
            flexShrink: 0,
            padding: "0 24px 0 80px",
          }}
        >
          <img src={logo} width={430} height={69} alt="" />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 32,
              fontSize: 56,
              fontWeight: 800,
              lineHeight: 1.18,
              letterSpacing: "-0.03em",
            }}
          >
            <div style={{ display: "flex" }}>앱으로 더 쉽고</div>
            <div style={{ display: "flex" }}>몰입감 있게</div>
          </div>
        </div>

        {/* 오른쪽: 추격 구도 (경찰이 도둑을 쫓는다) */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flex: 1,
          }}
        >
          {/* 부드러운 글로우 (테두리 없는 스포트라이트) */}
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 30,
              width: 580,
              height: 580,
              display: "flex",
              background:
                "radial-gradient(circle at 50% 48%, rgba(150,185,255,0.55) 0%, rgba(150,185,255,0.18) 42%, rgba(150,185,255,0) 68%)",
            }}
          />

          {/* 경찰 (왼쪽에서 추격 — 오른쪽 도둑을 바라봄) */}
          <img
            src={police}
            width={240}
            height={307}
            alt=""
            style={{ position: "absolute", bottom: 108, left: 66 }}
          />

          {/* 도둑 (오른쪽으로 도망) */}
          <img
            src={robber}
            width={244}
            height={278}
            alt=""
            style={{ position: "absolute", bottom: 122, right: 52 }}
          />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Pretendard", data: bold, style: "normal", weight: 700 },
        { name: "Pretendard", data: extraBold, style: "normal", weight: 800 },
      ],
    },
  );
}
