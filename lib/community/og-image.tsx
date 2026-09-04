import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPost, isOpen, localeOfPost, seatsLeft } from "@/lib/community/api";
import { meetingLabel, zoneOf } from "@/lib/community/format";
import type { Locale } from "@/lib/i18n/config";

// 모집글 공유 카드(OG 이미지) 공용 렌더러 (#103).
// 초대(/join) OG와 같은 브랜드 톤에 글 데이터(제목·장소·시간·남은 자리)를 얹는다.
// ko/en/ja 세 라우트의 opengraph-image.tsx 가 이 함수에 위임한다.

export const OG_ALT = "경찰과 도둑 - 같이 뛸 사람을 구하는 모집글";
export const OG_SIZE = { width: 1200, height: 600 };
export const OG_CONTENT_TYPE = "image/png";

const FONT_DIR = "node_modules/pretendard/dist/public/static";

// OG 전용 최소 라벨. 화면 문구(lib/i18n/community.ts)와 달리 카드 안에서만 쓴다.
const LABELS: Record<
  Locale,
  { open: string; closed: string; seats: (n: number) => string }
> = {
  ko: { open: "모집 중", closed: "모집 종료", seats: (n) => `${n}자리 남음` },
  en: { open: "Open", closed: "Closed", seats: (n) => `${n} spots left` },
  ja: { open: "募集中", closed: "募集終了", seats: (n) => `残り${n}名` },
};

async function svgDataUri(relPath: string) {
  const buf = await readFile(join(process.cwd(), relPath));
  return `data:image/svg+xml;base64,${buf.toString("base64")}`;
}

/** 제목이 카드 두 줄을 넘지 않게 자른다 (satori 는 lineClamp 미지원). */
function clampTitle(title: string, max = 32) {
  return title.length > max ? `${title.slice(0, max - 1)}…` : title;
}

export async function renderCommunityOgImage(postId: string) {
  const [bold, extraBold, logo, robber, police, post] = await Promise.all([
    readFile(join(process.cwd(), FONT_DIR, "Pretendard-Bold.otf")),
    readFile(join(process.cwd(), FONT_DIR, "Pretendard-ExtraBold.otf")),
    svgDataUri("public/brand/header-logo.svg"),
    svgDataUri("public/characters/robber-flee.svg"),
    svgDataUri("public/characters/police-chase.svg"),
    getPost(Number(postId)).catch(() => null),
  ]);

  const locale: Locale = post ? localeOfPost(post) : "ko";
  const t = LABELS[locale];
  const open = post ? isOpen(post) : false;
  const left = post ? seatsLeft(post) : null;

  const badgeText = post ? (open ? t.open : t.closed) : null;
  const seatsText = post && open && left !== null && left > 0 ? t.seats(left) : null;
  const infoLine = post
    ? [post.location.placeName, meetingLabel(post.meetingAt, locale, zoneOf(post.location))]
        .filter(Boolean)
        .join(" · ")
    : null;

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
        {/* 왼쪽: 로고 + 상태 뱃지 + 글 제목 + 장소·시간 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: 690,
            flexShrink: 0,
            padding: "0 12px 0 80px",
          }}
        >
          <img src={logo} width={300} height={48} alt="" />

          {badgeText && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 40 }}>
              <div
                style={{
                  display: "flex",
                  padding: "8px 22px",
                  borderRadius: 999,
                  fontSize: 26,
                  fontWeight: 700,
                  color: open ? "#ffffff" : "#64748b",
                  background: open ? "#2563eb" : "#e2e8f0",
                }}
              >
                {badgeText}
              </div>
              {seatsText && (
                <div
                  style={{
                    display: "flex",
                    padding: "8px 22px",
                    borderRadius: 999,
                    fontSize: 26,
                    fontWeight: 700,
                    color: "#166534",
                    background: "#dcfce7",
                  }}
                >
                  {seatsText}
                </div>
              )}
            </div>
          )}

          <div
            style={{
              display: "flex",
              marginTop: 26,
              fontSize: post ? 58 : 56,
              fontWeight: 800,
              lineHeight: 1.22,
              letterSpacing: "-0.03em",
              wordBreak: "keep-all",
            }}
          >
            {post ? clampTitle(post.title) : "같이 뛸 사람을 구해요"}
          </div>

          {infoLine && (
            <div
              style={{
                display: "flex",
                marginTop: 22,
                fontSize: 30,
                fontWeight: 700,
                color: "#5b6b8c",
              }}
            >
              {infoLine}
            </div>
          )}
        </div>

        {/* 오른쪽: 캐릭터 듀오 - 초대 OG와 같은 무대 */}
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
              left: 10,
              width: 520,
              height: 520,
              display: "flex",
              background:
                "radial-gradient(circle at 50% 50%, rgba(150,185,255,0.5) 0%, rgba(150,185,255,0.16) 44%, rgba(150,185,255,0) 70%)",
            }}
          />

          {/* 추격 장면 - 도둑이 앞서 달아나고 경찰이 뒤쫓는다 (커뮤니티 = 같이 뛸 사람) */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 30 }}>
            <img src={police} width={188} height={240} alt="" />
            <img src={robber} width={180} height={205} alt="" />
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
