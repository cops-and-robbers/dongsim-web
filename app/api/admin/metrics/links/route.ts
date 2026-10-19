import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/server/checkAdmin";
import { db } from "@/lib/metrics/db";
import { LINK_COLUMNS, linkFieldsOf, toLink } from "@/lib/download/links";

/**
 * 행사 링크(짧은 주소 /q/<코드> 와 QR)를 넣고, 고치고, 지운다 (#171).
 * 테이블(metrics_links)은 service role 로만 쓰여서 어드민 토큰을 확인한 뒤 대신 쓴다.
 *
 * GET    전체(만든 순서 역순). 링크는 많아야 수십 개라 한 번에 준다
 * POST   { code, label, source, medium?, campaign, content?, eventId? }  매체를 비우면 qr
 * PATCH  ?id=12 { label?, code?, source?, medium?, campaign?, content?, eventId? }
 * DELETE ?id=12
 *
 * 링크별 결과는 여기서 세지 않는다. 지표 화면이 이미 받는 캠페인 표에서 꼬리표로 찾는다(lib/download/links.ts linkResult)
 */

async function guard(req: Request): Promise<NextResponse | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const admin = await checkAdmin(token);
  if (admin === "expired") return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (admin === "denied") return NextResponse.json({ error: "어드민만 바꿀 수 있어요." }, { status: 403 });
  return null;
}

/** 0012 전이면 테이블이 없다. 코드나 꼬리표 조합이 겹치면 고유 제약에 걸린다. 그 경우를 알아듣게 돌려준다 */
function failure(message: string): NextResponse {
  if (/metrics_links_utm/i.test(message))
    return NextResponse.json({ error: "출처, 매체, 캠페인이 같은 링크가 이미 있어요. 결과가 섞이지 않게 하나는 다르게 지어 주세요." }, { status: 409 });
  if (/metrics_links_code|duplicate key/i.test(message))
    return NextResponse.json({ error: "이미 쓰는 주소 코드예요. 다른 코드를 적어 주세요." }, { status: 409 });
  if (/metrics_links|does not exist|schema cache/i.test(message))
    return NextResponse.json({ error: "링크 테이블이 아직 없어요. 0012 마이그레이션을 실행해 주세요." }, { status: 503 });
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(req: Request): Promise<NextResponse> {
  const denied = await guard(req);
  if (denied) return denied;
  const { data, error } = await db().from("metrics_links").select(LINK_COLUMNS).order("created_at", { ascending: false });
  if (error) return failure(error.message);
  return NextResponse.json((data ?? []).map(toLink), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request): Promise<NextResponse> {
  const denied = await guard(req);
  if (denied) return denied;
  const fields = linkFieldsOf((await req.json().catch(() => ({}))) as Record<string, unknown>, false);
  if (typeof fields === "string") return NextResponse.json({ error: fields }, { status: 400 });
  const { data, error } = await db().from("metrics_links").insert(fields).select("id").single();
  if (error) return failure(error.message);
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: Request): Promise<NextResponse> {
  const denied = await guard(req);
  if (denied) return denied;
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "고칠 링크를 다시 골라 주세요." }, { status: 400 });
  // 캠페인 토큰 길이는 세 칸을 합쳐 봐야 해서 지금 값을 먼저 읽는다
  const now = await db().from("metrics_links").select("utm_source, utm_campaign, utm_content").eq("id", id).maybeSingle();
  if (now.error) return failure(now.error.message);
  if (!now.data) return NextResponse.json({ error: "고칠 링크가 없어요. 화면을 새로 고쳐 주세요." }, { status: 404 });
  const fields = linkFieldsOf((await req.json().catch(() => ({}))) as Record<string, unknown>, true, now.data);
  if (typeof fields === "string") return NextResponse.json({ error: fields }, { status: 400 });
  if (!Object.keys(fields).length) return NextResponse.json({ error: "고칠 내용이 없어요." }, { status: 400 });
  const { error } = await db().from("metrics_links").update(fields).eq("id", id);
  if (error) return failure(error.message);
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const denied = await guard(req);
  if (denied) return denied;
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "지울 링크를 다시 골라 주세요." }, { status: 400 });
  const { error } = await db().from("metrics_links").delete().eq("id", id);
  if (error) return failure(error.message);
  return new NextResponse(null, { status: 204 });
}
