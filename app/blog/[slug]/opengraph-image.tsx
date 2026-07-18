/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPosts } from "@/lib/blog/notion";

// 블로그 글 공유용 동적 OG - 글 제목·태그·작성자·날짜가 박힌 브랜드 카드.
// 커버 사진 대신 텍스트 중심으로 가서(만료되는 노션 URL 임베드 회피)
// 커버 유무와 무관하게 모든 글이 일관된 카드를 갖는다.

export const alt = "경찰과 도둑 팀의 이야기";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FONT_DIR = "node_modules/pretendard/dist/public/static";

async function dataUri(relPath: string, mime: string) {
  const buf = await readFile(join(process.cwd(), relPath));
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const posts = await getPosts();
  const post = posts.find((p) => p.slug === slug);

  const [bold, extraBold, logo, cop, thief] = await Promise.all([
    readFile(join(process.cwd(), FONT_DIR, "Pretendard-Bold.otf")),
    readFile(join(process.cwd(), FONT_DIR, "Pretendard-ExtraBold.otf")),
    dataUri("public/brand/header-logo.svg", "image/svg+xml"),
    dataUri("public/photobooth/cop.svg", "image/svg+xml"),
    dataUri("public/photobooth/thief.svg", "image/svg+xml"),
  ]);

  const title = truncate(post?.title ?? "팀이 남기는 이야기", 44);
  // 날짜·태그는 뺀다 - 카드가 오래 캐시돼도 낡아 보이지 않게, 제목에 힘이 실리게.
  const metaLine =
    post?.author || "경찰과 도둑을 만드는 동심지키미 팀의 기록";

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
            이야기
          </div>
        </div>

        {/* 가운데: 글 제목 (최대 2줄) */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            paddingRight: 240,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.25,
              letterSpacing: "-0.03em",
              wordBreak: "keep-all",
            }}
          >
            {title}
          </div>
        </div>

        {/* 하단: 태그 · 작성자 · 날짜 */}
        <div
          style={{
            display: "flex",
            fontSize: 26,
            fontWeight: 700,
            color: "#64748b",
          }}
        >
          {metaLine}
        </div>

        {/* 오른쪽 아래: 캐릭터 포인트 */}
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
          <img src={cop} width={150} height={150} alt="" />
          <img src={thief} width={120} height={120} alt="" />
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
