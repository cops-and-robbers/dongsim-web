/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// 팀 소개(회사 소개) 공유용 OG - 로고 + 미션 헤드라인 + 경찰·도둑 캐릭터.
// /team 정적 페이지라 빌드 시 PNG로 생성되며 /team/members까지 상속된다.

export const alt = "동심지키미 - 게임으로 사람과 사람을 연결합니다";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FONT_DIR = "node_modules/pretendard/dist/public/static";

async function dataUri(relPath: string, mime: string) {
  const buf = await readFile(join(process.cwd(), relPath));
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export default async function Image() {
  const [bold, extraBold, logo, cop, thief] = await Promise.all([
    readFile(join(process.cwd(), FONT_DIR, "Pretendard-Bold.otf")),
    readFile(join(process.cwd(), FONT_DIR, "Pretendard-ExtraBold.otf")),
    dataUri("public/brand/header-logo.svg", "image/svg+xml"),
    dataUri("public/photobooth/cop.svg", "image/svg+xml"),
    dataUri("public/photobooth/thief.svg", "image/svg+xml"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          fontFamily: "Pretendard",
          color: "#0f1a33",
          background:
            "linear-gradient(120deg, #eaf0ff 0%, #ffffff 58%, #eafaf0 100%)",
          overflow: "hidden",
          padding: "64px 80px",
        }}
      >
        {/* 상단: 로고 + 섹션명 */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={logo} width={300} height={48} alt="" />
          <div
            style={{
              display: "flex",
              marginTop: 4,
              fontSize: 24,
              fontWeight: 700,
              color: "#3f63d9",
            }}
          >
            팀 소개
          </div>
        </div>

        {/* 가운데: 미션 헤드라인 */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            paddingRight: 300,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 62,
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.03em",
            }}
          >
            <div style={{ display: "flex" }}>게임으로 사람과 사람을</div>
            <div style={{ display: "flex" }}>연결합니다</div>
          </div>
        </div>

        {/* 하단: 팀명 */}
        <div
          style={{
            display: "flex",
            fontSize: 26,
            fontWeight: 700,
            color: "#64748b",
          }}
        >
          동심지키미 · 경찰과 도둑을 만드는 팀
        </div>

        {/* 오른쪽 아래: 캐릭터 (경찰·도둑 대등) */}
        <div
          style={{
            position: "absolute",
            right: 64,
            bottom: 48,
            display: "flex",
            alignItems: "flex-end",
            gap: 12,
          }}
        >
          <img src={cop} width={158} height={158} alt="" />
          <img src={thief} width={128} height={128} alt="" />
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
