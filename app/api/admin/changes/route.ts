import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/server/checkAdmin";
import { loadChanges } from "@/lib/changes/server";

/**
 * 어드민 변경 기록 (#313). 누가 언제 어느 화면의 무엇을 바꿨나.
 *
 * GET ?days=30  오늘(한국)까지 며칠. 7, 30, 90 만 받는다
 * 공통 기록(admin_changes)에 행사 저장본, 출시 조작, 회사 소개 기록을 더해 최근 것부터 준다(lib/changes/server.ts)
 */

const DAYS = new Set([7, 30, 90]);

export async function GET(req: Request): Promise<NextResponse> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const admin = await checkAdmin(token);
  if (admin === "expired") return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (admin === "denied") return NextResponse.json({ error: "어드민만 볼 수 있어요." }, { status: 403 });

  const asked = Number(new URL(req.url).searchParams.get("days") ?? 30);
  const days = DAYS.has(asked) ? asked : 30;
  // 한국 날짜 경계로 자른다. 오늘 끝까지, days 일 전 0시부터
  const kstToday = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  const end = Date.parse(`${kstToday}T00:00:00+09:00`) + 86_400_000;
  const from = new Date(end - days * 86_400_000).toISOString();
  const to = new Date(end).toISOString();
  try {
    return NextResponse.json({ days, ...(await loadChanges(from, to)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[changes] 읽기 실패", e);
    return NextResponse.json({ error: "변경 기록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
