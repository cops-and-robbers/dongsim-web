/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { EVENT } from "@/components/event/schedule";

// 이벤트(/event) 공유 OG - 이번에 추가한 지명수배 이미지(도둥이)를 주인공으로,
// 루트 OG 톤(로고·그라데이션)에 사건 무드를 얹는다.

export const alt = "황금 치즈 도난 사건 - 경찰과 도둑 이벤트";
export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

const FONT_DIR = "node_modules/pretendard/dist/public/static";

async function dataUri(relPath: string, mime: string) {
  const buf = await readFile(join(process.cwd(), relPath));
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export default async function Image() {
  const [bold, extraBold, logo, wanted] = await Promise.all([
    readFile(join(process.cwd(), FONT_DIR, "Pretendard-Bold.otf")),
    readFile(join(process.cwd(), FONT_DIR, "Pretendard-ExtraBold.otf")),
    dataUri("public/brand/header-logo.svg", "image/svg+xml"),
    dataUri("public/event/wanted.svg", "image/svg+xml"),
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
        {/* 왼쪽: 로고 + 사건명 + 상태 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: 620,
            flexShrink: 0,
            padding: "0 24px 0 80px",
          }}
        >
          <img src={logo} width={400} height={64} alt="" />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 30,
              fontSize: 60,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
            }}
          >
            <div style={{ display: "flex" }}>황금 치즈</div>
            <div style={{ display: "flex" }}>도난 사건</div>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 26,
              fontSize: 26,
              fontWeight: 700,
              color: "#3f63d9",
            }}
          >
            {`${EVENT.venue} · ${EVENT.dateLabel}`}
          </div>
        </div>

        {/* 오른쪽: 지명수배(도둥이) */}
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
              top: 40,
              left: 20,
              width: 520,
              height: 520,
              display: "flex",
              background:
                "radial-gradient(circle at 50% 50%, rgba(150,185,255,0.5) 0%, rgba(150,185,255,0.16) 44%, rgba(150,185,255,0) 70%)",
            }}
          />
          <img src={wanted} width={420} height={360} alt="" />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Pretendard", data: bold, style: "normal", weight: 700 },
        { name: "Pretendard", data: extraBold, style: "normal", weight: 800 },
      ],
    }
  );
}
