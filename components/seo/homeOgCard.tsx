/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { OG_LOGOS, type OgLogoLocale } from "./ogLogo";

// 홈 공유 OG - 로고 + 두 줄 헤드라인 + 추격 캐릭터. /·/en·/ja가 로케일별로 재사용한다.
// 정적 페이지라 빌드 시 PNG로 생성된다.

export const HOME_OG_SIZE = { width: 1200, height: 600 };
const FONT_DIR = "node_modules/pretendard/dist/public/static";

// readFile 경로는 호출부에 글자 그대로 적는다. 변수로 넘기면 파일 트레이싱이
// 경로를 좁히지 못해 프로젝트 전체를 함수 번들에 넣는다 (#113 실측).
const svgDataUri = (buf: Buffer) =>
  `data:image/svg+xml;base64,${buf.toString("base64")}`;

export async function renderHomeOg({
  logo: logoLocale,
  line1,
  line2,
}: {
  /** 로케일 로고 키. 경로·치수는 OG_LOGOS 가 관리한다 (#113). */
  logo: OgLogoLocale;
  line1: string;
  line2: string;
}) {
  const { w: logoW, h: logoH, read } = OG_LOGOS[logoLocale];
  const [bold, extraBold, logoBuf, robberBuf, policeBuf] = await Promise.all([
    readFile(join(process.cwd(), FONT_DIR, "Pretendard-Bold.otf")),
    readFile(join(process.cwd(), FONT_DIR, "Pretendard-ExtraBold.otf")),
    read(),
    readFile(join(process.cwd(), "public/characters/robber-flee.svg")),
    readFile(join(process.cwd(), "public/characters/police-chase.svg")),
  ]);
  const logo = svgDataUri(logoBuf);
  const robber = svgDataUri(robberBuf);
  const police = svgDataUri(policeBuf);

  // 로고는 높이 69로 고정하고 가로는 비율대로.
  const logoHeight = 69;
  const logoWidth = Math.round((logoW * logoHeight) / logoH);

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
        {/* 왼쪽: 로고 + 두 줄 헤드라인 */}
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
          <img src={logo} width={logoWidth} height={logoHeight} alt="" />

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
        </div>

        {/* 오른쪽: 추격 구도 (경찰이 도둑을 쫓는다) */}
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
      ...HOME_OG_SIZE,
      fonts: [
        { name: "Pretendard", data: bold, style: "normal", weight: 700 },
        { name: "Pretendard", data: extraBold, style: "normal", weight: 800 },
      ],
    },
  );
}
