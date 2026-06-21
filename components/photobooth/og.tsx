/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// 포토부스 OG 공통 렌더러 — 루트 OG 톤(로고·그라데이션) 유지, 냥파·도둑 스티커 사용.
// 헤드라인 두 줄 + 선택적 작은 정보 줄(행사 안내용)만 라우트별로 다르게 넣는다.

export const OG_SIZE = { width: 1200, height: 600 };

const FONT_DIR = "node_modules/pretendard/dist/public/static";

async function dataUri(relPath: string, mime: string) {
  const buf = await readFile(join(process.cwd(), relPath));
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function renderPhotoboothOg(opts: {
  line1: string;
  line2: string;
  /** 헤드라인 아래 작은 글씨(행사 장소·날짜 등). */
  details?: string[];
}) {
  const { line1, line2, details = [] } = opts;
  const [bold, extraBold, logo, cop, thief] = await Promise.all([
    readFile(join(process.cwd(), FONT_DIR, "Pretendard-Bold.otf")),
    readFile(join(process.cwd(), FONT_DIR, "Pretendard-ExtraBold.otf")),
    dataUri("public/brand/header-logo.svg", "image/svg+xml"),
    dataUri("public/photobooth/cop.png", "image/png"),
    dataUri("public/photobooth/thief.png", "image/png"),
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
        {/* 왼쪽: 로고 + 문구 */}
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
            <div style={{ display: "flex" }}>{line1}</div>
            <div style={{ display: "flex" }}>{line2}</div>
          </div>

          {details.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 22,
                fontSize: 28,
                fontWeight: 700,
                color: "#475569",
                lineHeight: 1.45,
              }}
            >
              {details.map((d, i) => (
                <div key={i} style={{ display: "flex" }}>
                  {d}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 오른쪽: 냥파·도둑 스티커 나란히 */}
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

          <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
            <img src={cop} width={290} height={271} alt="" />
            <img src={thief} width={300} height={253} alt="" />
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Pretendard", data: bold, style: "normal", weight: 700 },
        { name: "Pretendard", data: extraBold, style: "normal", weight: 800 },
      ],
    },
  );
}
