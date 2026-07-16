import { NextResponse } from "next/server";
import sharp from "sharp";
import { getFreshImageUrl } from "@/lib/blog/notion";

// Notion 이미지 프록시 겸 최적화 —
// Notion 파일 URL은 1시간 만료 서명 URL이라 페이지에 직접 못 박는다. 이 라우트가
// 서버에서 원본을 받아 리사이즈·WebP 변환 후 스트리밍하고, 결과를 CDN에 장기 캐시한다.
// URL의 v(블록/페이지 수정 시각)가 버전 역할이라 이미지가 바뀌면 URL도 바뀐다 → 불변 캐시 안전.
// 효과: 이미지당 첫 요청 이후엔 CDN에서 즉시 서빙 + 원본(수 MB) 대비 용량 대폭 감소.

const WIDTHS = new Set([640, 800, 1200, 1600]);
const CACHE = "public, max-age=31536000, s-maxage=31536000, immutable";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const blockId = searchParams.get("block") ?? undefined;
  const pageId = searchParams.get("page") ?? undefined;
  if (!blockId && !pageId) {
    return NextResponse.json(
      { error: "block 또는 page가 필요해요." },
      { status: 400 }
    );
  }
  const wParam = Number(searchParams.get("w"));
  const width = WIDTHS.has(wParam) ? wParam : 1200;

  const url = await getFreshImageUrl({ blockId, pageId });
  if (!url) {
    return NextResponse.json(
      { error: "이미지를 찾을 수 없어요." },
      { status: 404 }
    );
  }

  const upstream = await fetch(url);
  if (!upstream.ok) {
    return NextResponse.json(
      { error: "이미지 원본을 가져오지 못했어요." },
      { status: 502 }
    );
  }
  const original = Buffer.from(await upstream.arrayBuffer());
  const contentType = upstream.headers.get("content-type") ?? "";

  // GIF(애니메이션)·SVG는 변환 없이 원본 그대로 — 리사이즈가 오히려 깨뜨릴 수 있다.
  if (/gif|svg/.test(contentType)) {
    return new NextResponse(new Uint8Array(original), {
      headers: { "Content-Type": contentType, "Cache-Control": CACHE },
    });
  }

  try {
    const optimized = await sharp(original)
      .rotate() // EXIF 방향 보정(폰 사진)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    return new NextResponse(new Uint8Array(optimized), {
      headers: { "Content-Type": "image/webp", "Cache-Control": CACHE },
    });
  } catch {
    // 디코딩 불가 포맷(HEIC 등)은 원본 그대로 내보낸다.
    return new NextResponse(new Uint8Array(original), {
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Cache-Control": CACHE,
      },
    });
  }
}
