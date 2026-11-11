import { NextResponse } from "next/server";
import { actorName } from "@/lib/admin/server/remoteConfig";
import { guard, noStore } from "@/lib/event/adminApi";
import { REPLY_LANGS, templateProblem, type Fit, type TemplateInput } from "@/lib/reviews/templates";
import { createTemplate, deleteTemplate, listTemplates, TemplateConflict, updateTemplate } from "@/lib/reviews/templatesServer";
import { FIT_LABEL, type ReplyTemplate } from "@/lib/reviews/templates";
import { recordChange } from "@/lib/changes/server";
import { actionOf, diffValues } from "@/lib/changes/model";

// 변경 기록(#313). 세 언어 문구를 칸으로 나눠 무엇이 바뀌었는지 보이게 한다
const LABELS = { title: "이름", fit: "어울리는 리뷰", ko: "한국어 문구", en: "영어 문구", ja: "일본어 문구" };
const shown = (t: Pick<ReplyTemplate, "title" | "fit" | "bodies"> | null) => t && { title: t.title, fit: FIT_LABEL[t.fit], ...t.bodies };
async function record(actor: string, before: ReplyTemplate | null, after: ReplyTemplate | null): Promise<void> {
  const t = after ?? before;
  if (!t) return;
  await recordChange({ actor, area: "reviews", target: `답변 문구 ${t.title}`, action: actionOf(before, after), fields: diffValues(shown(before), shown(after), LABELS), href: "/admin/reviews" });
}
const findTemplate = async (id: number) => (await listTemplates()).templates.find((t) => t.id === id) ?? null;

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
    const actor = await actorName(checked.token);
    const template = await createTemplate(body.input, actor);
    await record(actor, null, template);
    return NextResponse.json({ template }, noStore);
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
    const actor = await actorName(checked.token);
    const before = await findTemplate(id);
    const template = await updateTemplate(id, updatedAt, body.input, actor);
    await record(actor, before, template);
    return NextResponse.json({ template }, noStore);
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
    const before = await findTemplate(id);
    await deleteTemplate(id);
    await record(await actorName(checked.token), before, null);
    return NextResponse.json({ ok: true }, noStore);
  } catch (e) {
    return failed(e);
  }
}
