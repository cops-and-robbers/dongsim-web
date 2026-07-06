import { NextResponse } from "next/server";
import { getFreshImageUrl } from "@/lib/blog/notion";

// Notion 업로드 이미지 프록시 — Notion 파일 URL은 1시간 만에 만료되는 서명 URL이라
// 본문에 직접 박으면 ISR 캐시가 오래될 때 이미지가 깨진다. 이 라우트가 매번 신선한
// URL로 리다이렉트하고, CDN이 50분간 캐시해 Notion API 호출을 아낀다.
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const blockId = searchParams.get("block") ?? undefined;
  const pageId = searchParams.get("page") ?? undefined;
  if (!blockId && !pageId) {
    return NextResponse.json({ error: "block 또는 page가 필요해요." }, { status: 400 });
  }

  const url = await getFreshImageUrl({ blockId, pageId });
  if (!url) {
    return NextResponse.json({ error: "이미지를 찾을 수 없어요." }, { status: 404 });
  }

  return NextResponse.redirect(url, {
    status: 307,
    headers: {
      // 서명 URL 수명(1시간)보다 짧게 캐시 — 항상 유효한 URL만 내보낸다.
      "Cache-Control": "public, s-maxage=3000, stale-while-revalidate=60",
    },
  });
}
