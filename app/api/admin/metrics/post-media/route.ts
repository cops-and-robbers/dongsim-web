import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/server/checkAdmin";
import { db } from "@/lib/metrics/db";
import { readToken } from "@/lib/metrics/instagram/store";

/**
 * 게시물 하나의 썸네일 주소 (#145). 지표 화면의 게시물 상세가 연다.
 *
 * 인스타 이미지 주소(CDN)는 서명이 붙어 며칠 뒤 만료돼서 저장하지 않고, 상세를 열 때마다 받는다.
 * 게시물을 통째로 띄우는 임베드는 쓰지 않는다. 인스타 스크립트와 추적 쿠키가 같이 들어오고,
 * 좁은 창에서 레이아웃이 깨지거나 로그인 화면이 뜬다. 지표 창에서 필요한 건 "어떤 게시물인지" 알아보는 것이다.
 * 수집기가 쓰는 인스타 토큰(metrics_tokens)을 서버에서만 쓰고, 브라우저에는 이미지 주소만 내려준다.
 *
 * GET ?id=<인스타 미디어 ID>
 */

const ID = /^\d{5,30}$/;

export async function GET(req: Request): Promise<NextResponse> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const admin = await checkAdmin(token);
  if (admin === "expired") return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (admin === "denied") return NextResponse.json({ error: "어드민만 볼 수 있어요." }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!ID.test(id)) return NextResponse.json({ error: "게시물을 다시 골라 주세요." }, { status: 400 });

  try {
    const stored = await readToken(db(), "instagram");
    if (!stored) return NextResponse.json({ error: "인스타 토큰이 아직 없어요." }, { status: 503 });
    const q = new URLSearchParams({ fields: "media_type,media_url,thumbnail_url", access_token: stored.accessToken });
    const res = await fetch(`https://graph.instagram.com/v23.0/${id}?${q}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    const body = (await res.json().catch(() => ({}))) as { media_type?: string; media_url?: string; thumbnail_url?: string };
    // 오류 응답에는 토큰이 섞일 수 있어 그대로 넘기지 않는다
    if (!res.ok) return NextResponse.json({ error: "인스타에서 이미지를 못 받았어요." }, { status: 502 });
    // 영상(릴스)은 thumbnail_url, 사진과 묶음 게시물은 media_url(묶음은 첫 장)
    const imageUrl = body.media_type === "VIDEO" ? (body.thumbnail_url ?? null) : (body.media_url ?? body.thumbnail_url ?? null);
    return NextResponse.json({ imageUrl }, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch {
    return NextResponse.json({ error: "인스타에서 이미지를 못 받았어요." }, { status: 502 });
  }
}
