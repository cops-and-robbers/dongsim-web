/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPosts } from "@/lib/blog/notion";
import type { Locale } from "@/lib/i18n/config";

// 블로그 글 공유용 동적 OG - 글 제목·작성자가 박힌 브랜드 카드.
// 커버 사진 대신 텍스트 중심으로 가서(만료되는 노션 URL 임베드 회피)
// 커버 유무와 무관하게 모든 글이 일관된 카드를 갖는다.

export const OG_SIZE = { width: 1200, height: 630 };
const FONT_DIR = "node_modules/pretendard/dist/public/static";

const COPY: Record<
  Locale,
  { section: string; fallbackTitle: string; fallbackMeta: string; alt: string }
> = {
  ko: {
    section: "이야기",
    fallbackTitle: "팀이 남기는 이야기",
    fallbackMeta: "경찰과 도둑을 만드는 동심지키미 팀의 기록",
    alt: "경찰과 도둑 팀의 이야기",
  },
  en: {
    section: "Stories",
    fallbackTitle: "Notes from the team",
    fallbackMeta: "Behind the scenes of Cops and Robbers",
    alt: "Stories from the Cops and Robbers team",
  },
  ja: {
    section: "ストーリー",
    fallbackTitle: "チームのストーリー",
    fallbackMeta: "ケイドロを作るチームの記録",
    alt: "ケイドロを作るチームのストーリー",
  },
};

export function ogAlt(locale: Locale): string {
  return COPY[locale].alt;
}

async function dataUri(relPath: string, mime: string) {
  const buf = await readFile(join(process.cwd(), relPath));
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * 제목에 실제로 쓰인 글자만 담은 일본어 폰트를 구글 폰트에서 받아온다.
 * Pretendard는 가나는 있지만 한자가 없어서, 일본어 제목이 두부(□)로 깨진다.
 * 전체 CJK 폰트는 수 MB라 번들에 넣지 않고 필요한 글자만 받는다.
 * User-Agent를 단순하게 주면 woff2가 아니라 satori가 읽을 수 있는 truetype이 온다.
 * 실패하면 null - 호출부가 Pretendard로 폴백해 카드 생성 자체는 절대 실패하지 않는다.
 */
async function subsetJapaneseFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const api = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(text)}`;
    const css = await fetch(api, {
      headers: { "User-Agent": "Mozilla/5.0" },
    }).then((r) => (r.ok ? r.text() : ""));
    const url = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function renderBlogOg(locale: Locale, slug: string) {
  const copy = COPY[locale];
  const posts = await getPosts(locale);
  const post = posts.find((p) => p.slug === slug);

  const [bold, extraBold, logo, cop, thief] = await Promise.all([
    readFile(join(process.cwd(), FONT_DIR, "Pretendard-Bold.otf")),
    readFile(join(process.cwd(), FONT_DIR, "Pretendard-ExtraBold.otf")),
    dataUri("public/brand/header-logo.svg", "image/svg+xml"),
    dataUri("public/photobooth/cop.svg", "image/svg+xml"),
    dataUri("public/photobooth/thief.svg", "image/svg+xml"),
  ]);

  const title = truncate(post?.title ?? copy.fallbackTitle, 44);
  // 날짜·태그는 뺀다 - 카드가 오래 캐시돼도 낡아 보이지 않게, 제목에 힘이 실리게.
  const metaLine = post?.author || copy.fallbackMeta;

  // 일본어는 한자 때문에 별도 폰트가 필요하다. 카드에 그리는 글자를 모두 넘겨 subset을 받는다.
  const jpFont =
    locale === "ja"
      ? await subsetJapaneseFont(`${title}${metaLine}${copy.section}`)
      : null;
  const fontFamily = jpFont ? "NotoSansJP, Pretendard" : "Pretendard";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          fontFamily,
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
            {copy.section}
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

        {/* 하단: 작성자 */}
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
      ...OG_SIZE,
      fonts: [
        ...(jpFont
          ? [
              {
                name: "NotoSansJP",
                data: jpFont,
                style: "normal" as const,
                weight: 700 as const,
              },
            ]
          : []),
        { name: "Pretendard", data: bold, style: "normal" as const, weight: 700 as const },
        { name: "Pretendard", data: extraBold, style: "normal" as const, weight: 800 as const },
      ],
    }
  );
}
