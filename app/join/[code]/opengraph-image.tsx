import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// 초대 전용 OG — 루트 OG와 톤 동일(로고·그라데이션), 헤드라인 문구는 초대용으로, 캐릭터는 기본형 나란히.

export const alt = "경찰과 도둑 — 게임에 초대받았어요";
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
    svgDataUri("public/characters/robber.svg"),
    svgDataUri("public/characters/police.svg"),
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
        {/* 왼쪽: 로고 + 초대 문구 */}
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
            <div style={{ display: "flex" }}>게임에</div>
            <div style={{ display: "flex" }}>초대받았어요</div>
          </div>
        </div>

        {/* 오른쪽: 기본 캐릭터 나란히 (경찰·도둑) */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 20,
              left: 30,
              width: 580,
              height: 580,
              display: "flex",
              background:
                "radial-gradient(circle at 50% 50%, rgba(150,185,255,0.5) 0%, rgba(150,185,255,0.16) 44%, rgba(150,185,255,0) 70%)",
            }}
          />

          <div style={{ display: "flex", alignItems: "flex-end", gap: 28 }}>
            <img src={police} width={244} height={271} alt="" />
            <img src={robber} width={236} height={214} alt="" />
          </div>
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
