import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/server/checkAdmin";
import { db } from "@/lib/metrics/db";
import { loadStaffAccounts } from "@/lib/metrics/staff";

/**
 * 지표에서 운영진으로 볼 계정 (#165). 어드민 유저 상세의 "운영진 계정" 스위치가 쓴다.
 * ADMIN 권한 계정은 자동으로 운영진이라 여기 넣지 않는다. 권한 없는 팀원 계정과 테스트 계정만 넣는다.
 *
 * GET              [{ userId, note }]
 * PUT    ?userId=  { note? }  넣기(이미 있으면 메모만 바꾼다)
 * DELETE ?userId=
 */

const MAX_NOTE = 40;

async function guard(req: Request): Promise<NextResponse | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const admin = await checkAdmin(token);
  if (admin === "expired") return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (admin === "denied") return NextResponse.json({ error: "어드민만 바꿀 수 있어요." }, { status: 403 });
  return null;
}

function failure(message: string): NextResponse {
  const missing = /metrics_staff_accounts|does not exist|schema cache/i.test(message);
  return NextResponse.json({ error: missing ? "운영진 계정 표가 아직 없어요. 0007 마이그레이션을 실행해 주세요." : message }, { status: missing ? 503 : 500 });
}

const userIdOf = (req: Request) => {
  const v = new URL(req.url).searchParams.get("userId") ?? "";
  return /^\d{1,19}$/.test(v) ? v : null;
};

export async function GET(req: Request): Promise<NextResponse> {
  const denied = await guard(req);
  if (denied) return denied;
  return NextResponse.json(await loadStaffAccounts(db()), { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request): Promise<NextResponse> {
  const denied = await guard(req);
  if (denied) return denied;
  const userId = userIdOf(req);
  if (!userId) return NextResponse.json({ error: "계정을 다시 골라 주세요." }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as { note?: unknown };
  const note = typeof body.note === "string" ? body.note.trim().slice(0, MAX_NOTE) : "";
  const { error } = await db().from("metrics_staff_accounts").upsert({ user_id: userId, note }, { onConflict: "user_id" });
  if (error) return failure(error.message);
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const denied = await guard(req);
  if (denied) return denied;
  const userId = userIdOf(req);
  if (!userId) return NextResponse.json({ error: "계정을 다시 골라 주세요." }, { status: 400 });
  const { error } = await db().from("metrics_staff_accounts").delete().eq("user_id", userId);
  if (error) return failure(error.message);
  return new NextResponse(null, { status: 204 });
}
