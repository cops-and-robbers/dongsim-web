/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// 팀/구성원 페이지 공유 OG 카드 - 로고 + 라벨 + 헤드라인 + 경찰·도둑 캐릭터.
// /team, /team/members 모두 정적 페이지라 빌드 시 PNG로 생성된다.

export const OG_SIZE = { width: 1200, height: 630 };
const FONT_DIR = "node_modules/pretendard/dist/public/static";

async function dataUri(relPath: string, mime: string) {
  const buf = await readFile(join(process.cwd(), relPath));
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function renderTeamOgCard({
  label,
  headline,
  subtitle,
}: {
  label: string;
  /** 헤드라인 줄 배열(줄바꿈 단위). */
  headline: string[];
  subtitle: string;
}) {
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
        {/* 상단: 로고 + 라벨 */}
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
            {label}
          </div>
        </div>

        {/* 가운데: 헤드라인 */}
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
            {headline.map((line, i) => (
              <div key={i} style={{ display: "flex" }}>
                {line}
              </div>
            ))}
          </div>
        </div>

        {/* 하단: 서브타이틀 */}
        <div
          style={{
            display: "flex",
            fontSize: 26,
            fontWeight: 700,
            color: "#64748b",
          }}
        >
          {subtitle}
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
      ...OG_SIZE,
      fonts: [
        { name: "Pretendard", data: bold, style: "normal", weight: 700 },
        { name: "Pretendard", data: extraBold, style: "normal", weight: 800 },
      ],
    }
  );
}
