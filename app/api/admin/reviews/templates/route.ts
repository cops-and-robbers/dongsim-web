import { NextResponse } from "next/server";
import { actorName } from "@/lib/admin/server/remoteConfig";
import { guard, noStore } from "@/lib/event/adminApi";
import { REPLY_LANGS, templateProblem, type Fit, type TemplateInput } from "@/lib/reviews/templates";
import { createTemplate, deleteTemplate, listTemplates, TemplateConflict, updateTemplate } from "@/lib/reviews/templatesServer";

/**
 * 리뷰 답변 문구 (docs/admin-ui.md "리뷰").
 *
 * GET                              TemplateList
 * POST   { title, fit, bodies }    { template }
 * PUT    { id, updatedAt, ... }    { template }
 * DELETE ?id=                      { ok: true }
 */
const onlyProd = () => NextResponse.json({ error: "답변 문구는 운영 어드민에서만 저장돼요." }, { status: 403 });
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });
const failed = (e: unknown) => {
  console.error("[review-templates]", e instanceof Error ? e.message : e);
  return NextResponse.json({ error: "답변 문구를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
};
const FITS: Fit[] = ["low", "high", "any"];

function inputOf(body: Record<string, unknown>): TemplateInput | null {
  const bodies = body.bodies as Record<string, unknown> | undefined;
  if (typeof body.title !== "string" || !FITS.includes(body.fit as Fit) || !bodies || !REPLY_LANGS.every((l) => typeof bodies[l] === "string")) return null;
  return { title: body.title, fit: body.fit as Fit, bodies: { ko: bodies.ko as string, en: bodies.en as string, ja: bodies.ja as string } };
}

async function read(req: Request): Promise<{ raw: Record<string, unknown>; input: TemplateInput } | NextResponse> {
  const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const input = inputOf(raw);
  if (!input) return bad("문구 내용을 읽지 못했어요.");
  const problem = templateProblem(input);
  return problem ? bad(problem) : { raw, input };
}

export async function GET(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  return NextResponse.json(await listTemplates(), noStore);
}

export async function POST(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (process.env.VERCEL_ENV !== "production") return onlyProd();
  const body = await read(req);
  if (body instanceof NextResponse) return body;
  try {
    return NextResponse.json({ template: await createTemplate(body.input, await actorName(checked.token)) }, noStore);
  } catch (e) {
    return failed(e);
  }
}

export async function PUT(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (process.env.VERCEL_ENV !== "production") return onlyProd();
  const body = await read(req);
  if (body instanceof NextResponse) return body;
  const { id, updatedAt } = body.raw;
  if (typeof id !== "number" || typeof updatedAt !== "string") return bad("어느 문구인지 알 수 없어요.");
  try {
    return NextResponse.json({ template: await updateTemplate(id, updatedAt, body.input, await actorName(checked.token)) }, noStore);
  } catch (e) {
    if (e instanceof TemplateConflict) return NextResponse.json({ error: "다른 분이 먼저 고쳤어요. 새로 불러온 뒤 다시 고쳐 주세요." }, { status: 409 });
    return failed(e);
  }
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (process.env.VERCEL_ENV !== "production") return onlyProd();
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return bad("어느 문구인지 알 수 없어요.");
  try {
    await deleteTemplate(id);
    return NextResponse.json({ ok: true }, noStore);
  } catch (e) {
    return failed(e);
  }
}
