import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";

/**
 * 어드민 블로그 동기화 트리거 (#109 3단계).
 *
 * 동기화 라우트(/api/blog/sync)는 SYNC_SECRET 으로 잠겨 있고, 그 시크릿을
 * 브라우저에 내려보낼 수는 없다. 이 라우트가 중간에 서서
 *
 *   1. 요청에 실려 온 어드민 액세스 토큰을 백엔드에 물어 확인하고
 *   2. 서버에만 있는 시크릿을 붙여 동기화를 대신 호출한다
 *
 * 권한 확인은 백엔드 수정 없이 기존 것을 재사용한다 - 어드민 전용 GraphQL
 * (adminDashboard)을 그 토큰으로 호출해 보면, 토큰이 유효한지와 어드민인지가
 * 한 번에 검증된다. 일반 유저 토큰이면 백엔드가 거부한다.
 */

export const maxDuration = 300; // 동기화(이미지 이관 포함)를 기다려야 한다

async function isAdmin(token: string): Promise<boolean> {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBase) return false;

  try {
    const res = await fetch(`${apiBase}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: "query AdminPing { adminDashboard { totalUserCount } }",
        operationName: "AdminPing",
      }),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { errors?: unknown[] };
    return !data.errors;
  } catch {
    return false;
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  if (!(await isAdmin(token))) {
    return NextResponse.json({ error: "어드민만 실행할 수 있어요." }, { status: 403 });
  }

  const secret = process.env.SYNC_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "동기화 설정이 없어요." }, { status: 500 });
  }

  // gc(고아 이미지 정리) 파라미터는 그대로 넘긴다 - 값 검증은 동기화 라우트가 한다
  const gc = new URL(req.url).searchParams.get("gc");
  const target = new URL("/api/blog/sync", SITE_URL);
  if (gc) target.searchParams.set("gc", gc);

  const res = await fetch(target, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  });
  const body = await res.json();
  return NextResponse.json(body, { status: res.status });
}
