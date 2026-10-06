import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/server/checkAdmin";
import { db } from "@/lib/metrics/db";

/**
 * 지표 차트에 겹쳐 그릴 일정(행사, 앱 업데이트, 광고 집행 등)을 넣고 지운다 (#145).
 * 테이블(metrics_events)은 service role 로만 쓰여서 어드민 토큰을 확인한 뒤 대신 쓴다.
 *
 * GET    전체(날짜순). 달력이 달을 넘겨도 다시 묻지 않게 한 번에 준다(일정은 많아야 수백 개)
 * POST   { day: "2026-09-23", label: "건대 축제 부스" }  앞으로 있을 행사도 미리 넣을 수 있다
 * DELETE ?id=12
 */

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const MAX_LABEL = 40;

async function guard(req: Request): Promise<NextResponse | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const admin = await checkAdmin(token);
  if (admin === "expired") return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (admin === "denied") return NextResponse.json({ error: "어드민만 바꿀 수 있어요." }, { status: 403 });
  return null;
}

/** 0004 마이그레이션 전이면 테이블이 없다. 그 경우를 알아듣게 돌려준다 */
function failure(message: string): NextResponse {
  const missing = /metrics_events|does not exist|schema cache/i.test(message);
  return NextResponse.json(
    { error: missing ? "일정 테이블이 아직 없어요. 0004 마이그레이션을 실행해 주세요." : message },
    { status: missing ? 503 : 500 },
  );
}

export async function GET(req: Request): Promise<NextResponse> {
  const denied = await guard(req);
  if (denied) return denied;
  const { data, error } = await db().from("metrics_events").select("id, day, label").order("day").order("id").limit(2000);
  if (error) return failure(error.message);
  return NextResponse.json(data ?? [], { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request): Promise<NextResponse> {
  const denied = await guard(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { day?: unknown; label?: unknown };
  const day = typeof body.day === "string" ? body.day : "";
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!YMD.test(day) || new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day) {
    return NextResponse.json({ error: "날짜를 다시 골라 주세요." }, { status: 400 });
  }
  if (!label) return NextResponse.json({ error: "일정 이름을 적어 주세요." }, { status: 400 });
  if (label.length > MAX_LABEL) return NextResponse.json({ error: `일정 이름은 ${MAX_LABEL}자까지 적을 수 있어요.` }, { status: 400 });

  const { data, error } = await db().from("metrics_events").insert({ day, label }).select("id, day, label").single();
  if (error) return failure(error.message);
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const denied = await guard(req);
  if (denied) return denied;
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "지울 일정을 다시 골라 주세요." }, { status: 400 });
  const { error } = await db().from("metrics_events").delete().eq("id", id);
  if (error) return failure(error.message);
  return new NextResponse(null, { status: 204 });
}
