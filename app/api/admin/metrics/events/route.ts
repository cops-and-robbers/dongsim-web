import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/server/checkAdmin";
import { db } from "@/lib/metrics/db";
import { CATEGORIES, DEFAULT_RADIUS_M, isCategory, type Category } from "@/lib/metrics/events";
import { loadEvents } from "@/lib/metrics/staff";

/**
 * 지표 차트에 겹쳐 그릴 일정을 넣고, 고치고, 지운다 (#145, #165).
 * 테이블(metrics_events)은 service role 로만 쓰여서 어드민 토큰을 확인한 뒤 대신 쓴다.
 *
 * GET    전체(날짜순). 달력이 달을 넘겨도 다시 묻지 않게 한 번에 준다(일정은 많아야 수백 개)
 * POST   { day, label, category, startsAt?, endsAt?, place? }  앞으로 있을 행사도 미리 넣을 수 있다
 * PATCH  ?id=12 { label?, category?, startsAt?, endsAt?, place? }  행사 장소를 나중에 넣을 때
 * DELETE ?id=12
 *
 * 성격(category)은 행사, 홍보, 출시, 테스트, 기타. 시간과 장소는 행사만 쓴다(행사 게임 찾기, lib/metrics/events.ts).
 * place 는 { lat, lng, radiusM } 이고 null 이면 지운다
 */

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_LABEL = 40;

async function guard(req: Request): Promise<NextResponse | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const admin = await checkAdmin(token);
  if (admin === "expired") return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (admin === "denied") return NextResponse.json({ error: "어드민만 바꿀 수 있어요." }, { status: 403 });
  return null;
}

/** 0004 전이면 테이블이, 0007 전이면 성격, 시간, 장소 칸이 없다. 그 경우를 알아듣게 돌려준다 */
function failure(message: string): NextResponse {
  if (/category|starts_at|ends_at|radius_m|\blat\b|\blng\b/i.test(message) && /column|schema cache/i.test(message))
    return NextResponse.json({ error: "일정 성격과 장소 칸이 아직 없어요. 0007 마이그레이션을 실행해 주세요." }, { status: 503 });
  if (/metrics_events|does not exist|schema cache/i.test(message))
    return NextResponse.json({ error: "일정 테이블이 아직 없어요. 0004 마이그레이션을 실행해 주세요." }, { status: 503 });
  return NextResponse.json({ error: message }, { status: 500 });
}

type Fields = { label?: string; category?: Category; starts_at?: string | null; ends_at?: string | null; lat?: number | null; lng?: number | null; radius_m?: number | null };

/** 몸통을 DB 칸으로. 틀린 값은 사람이 고칠 수 있는 말로 돌려준다. partial 이면 온 칸만 본다 */
function fieldsOf(body: Record<string, unknown>, partial: boolean): Fields | string {
  const out: Fields = {};
  if (!partial || "label" in body) {
    const label = typeof body.label === "string" ? body.label.trim() : "";
    if (!label) return "일정 이름을 적어 주세요.";
    if (label.length > MAX_LABEL) return `일정 이름은 ${MAX_LABEL}자까지 적을 수 있어요.`;
    out.label = label;
  }
  if (!partial || "category" in body) {
    if (!isCategory(body.category)) return `성격은 ${CATEGORIES.length}가지 중에 골라 주세요.`;
    out.category = body.category;
  }
  for (const [key, col] of [["startsAt", "starts_at"], ["endsAt", "ends_at"]] as const) {
    if (!(key in body)) continue;
    const v = body[key];
    if (v === null || v === "") out[col] = null;
    else if (typeof v === "string" && HM.test(v)) out[col] = v;
    else return "시간은 14:00 처럼 적어 주세요.";
  }
  if (out.starts_at && out.ends_at && out.starts_at >= out.ends_at) return "끝나는 시간이 시작 시간보다 늦어야 해요.";
  if ("place" in body) {
    const p = body.place as { lat?: unknown; lng?: unknown; radiusM?: unknown } | null;
    if (p === null) Object.assign(out, { lat: null, lng: null, radius_m: null });
    else {
      const lat = Number(p?.lat);
      const lng = Number(p?.lng);
      const r = p?.radiusM === undefined || p?.radiusM === null ? DEFAULT_RADIUS_M : Number(p.radiusM);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return "장소 좌표를 다시 확인해 주세요.";
      if (!Number.isInteger(r) || r < 50 || r > 5000) return "반경은 50m에서 5km 사이로 적어 주세요.";
      Object.assign(out, { lat, lng, radius_m: r });
    }
  }
  return out;
}

export async function GET(req: Request): Promise<NextResponse> {
  const denied = await guard(req);
  if (denied) return denied;
  const events = await loadEvents(db());
  if (!events) return failure("metrics_events does not exist");
  return NextResponse.json(events, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request): Promise<NextResponse> {
  const denied = await guard(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const day = typeof body.day === "string" ? body.day : "";
  if (!YMD.test(day) || new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day) {
    return NextResponse.json({ error: "날짜를 다시 골라 주세요." }, { status: 400 });
  }
  const fields = fieldsOf(body, false);
  if (typeof fields === "string") return NextResponse.json({ error: fields }, { status: 400 });
  const { data, error } = await db().from("metrics_events").insert({ day, ...fields }).select("id").single();
  if (error) return failure(error.message);
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: Request): Promise<NextResponse> {
  const denied = await guard(req);
  if (denied) return denied;
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "고칠 일정을 다시 골라 주세요." }, { status: 400 });
  const fields = fieldsOf((await req.json().catch(() => ({}))) as Record<string, unknown>, true);
  if (typeof fields === "string") return NextResponse.json({ error: fields }, { status: 400 });
  if (!Object.keys(fields).length) return NextResponse.json({ error: "고칠 내용이 없어요." }, { status: 400 });
  const { error } = await db().from("metrics_events").update(fields).eq("id", id);
  if (error) return failure(error.message);
  return new NextResponse(null, { status: 204 });
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
