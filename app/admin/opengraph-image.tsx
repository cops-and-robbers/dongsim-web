/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// 어드민 공유 OG - 홈 OG의 무드(밝은 그라데이션 + 추격 캐릭터)를 잇되,
// 텍스트는 "경도 어드민 / 경찰과 도둑 운영 콘솔" 두 줄만 둔다.
export const alt = "경도 어드민 - 경찰과 도둑 운영 콘솔";
export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

const FONT_DIR = "node_modules/pretendard/dist/public/static";

async function svgDataUri(relPath: string) {
  const buf = await readFile(join(process.cwd(), relPath));
  return `data:image/svg+xml;base64,${buf.toString("base64")}`;
}

export default async function Image() {
  const [bold, extraBold, robber, police] = await Promise.all([
    readFile(join(process.cwd(), FONT_DIR, "Pretendard-Bold.otf")),
    readFile(join(process.cwd(), FONT_DIR, "Pretendard-ExtraBold.otf")),
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
        {/* 왼쪽: 두 줄 텍스트. 위에 경찰·도둑 대등 컬러 바 */}
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
          <div style={{ display: "flex" }}>
            <div
              style={{
                width: 46,
                height: 10,
                borderRadius: 6,
                background: "#3f63d9",
              }}
            />
            <div
              style={{
                width: 46,
                height: 10,
                borderRadius: 6,
                background: "#38f55b",
                marginLeft: 8,
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 30,
              fontSize: 84,
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            경도 어드민
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 18,
              fontSize: 32,
              fontWeight: 700,
              color: "#5b6b8c",
              letterSpacing: "-0.01em",
            }}
          >
            경찰과 도둑 운영 콘솔
          </div>
        </div>

        {/* 오른쪽: 홈 OG와 같은 추격 구도 */}
        <div style={{ position: "relative", display: "flex", flex: 1 }}>
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
          <img
            src={police}
            width={240}
            height={307}
            alt=""
            style={{ position: "absolute", bottom: 108, left: 66 }}
          />
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
