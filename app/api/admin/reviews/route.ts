import { NextResponse } from "next/server";
import { actorName } from "@/lib/admin/server/remoteConfig";
import { guard, noStore } from "@/lib/event/adminApi";
import { StoreError } from "@/lib/release/stores";
import { countOf, DRAFT_MAX, replyProblem, waitingCount, type Platform } from "@/lib/reviews/model";
import { allReviews, inbox, postReply, refreshReviews, reopenReview, saveReviewDraft, skipReview } from "@/lib/reviews/server";

/**
 * 어드민 리뷰 받은편지함 (docs/admin-ui.md "리뷰").
 *
 * GET  ?fresh=1 이면 스토어를 다시 읽는다. ?count=1 이면 답글 대기 수만    Inbox | { waiting }
 * PATCH { platform, id, action: "draft", draft } | { action: "skip" | "reopen" }   { review }
 * POST  { platform, id, text }   스토어에 답글을 올린다                    { review }
 */
export const maxDuration = 30;

const isPlatform = (p: unknown): p is Platform => p === "ios" || p === "android";
const onlyProd = () => NextResponse.json({ error: "답글은 운영 어드민에서만 쓸 수 있어요." }, { status: 403 });
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function GET(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  const q = new URL(req.url).searchParams;
  if (q.get("count") === "1") return NextResponse.json({ waiting: waitingCount((await allReviews()) ?? []) }, noStore);
  if (q.get("fresh") === "1") refreshReviews();
  return NextResponse.json(await inbox(), noStore);
}

export async function PATCH(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (process.env.VERCEL_ENV !== "production") return onlyProd();
  const body = (await req.json().catch(() => ({}))) as { platform?: unknown; id?: unknown; action?: unknown; draft?: unknown };
  const { platform, id, action, draft } = body;
  if (!isPlatform(platform) || typeof id !== "string" || !id) return bad("어느 리뷰인지 알 수 없어요.");
  try {
    if (action === "skip") return NextResponse.json({ review: await skipReview(platform, id, await actorName(checked.token)) }, noStore);
    if (action === "reopen") return NextResponse.json({ review: await reopenReview(platform, id) }, noStore);
    if (action !== "draft" || (draft !== null && typeof draft !== "string") || (typeof draft === "string" && countOf(draft) > DRAFT_MAX)) return bad("저장할 수 없는 값이에요.");
    return NextResponse.json({ review: await saveReviewDraft(platform, id, draft, await actorName(checked.token)) }, noStore);
  } catch (e) {
    console.error("[reviews] 저장", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (process.env.VERCEL_ENV !== "production") return onlyProd();
  const body = (await req.json().catch(() => ({}))) as { platform?: unknown; id?: unknown; text?: unknown };
  const { platform, id, text } = body;
  if (!isPlatform(platform) || typeof id !== "string" || !id || typeof text !== "string") return bad("어느 리뷰인지 알 수 없어요.");
  const problem = replyProblem(platform, text);
  if (problem) return bad(problem);
  try {
    return NextResponse.json({ review: await postReply(platform, id, text.trim(), await actorName(checked.token)) }, noStore);
  } catch (e) {
    console.error("[reviews] 답글", e instanceof StoreError ? (e.detail ?? e.message) : e);
    return NextResponse.json({ error: e instanceof StoreError ? e.message : "답글을 올리지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
