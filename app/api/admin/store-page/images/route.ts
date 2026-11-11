import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { actorName } from "@/lib/admin/server/remoteConfig";
import { guard, noStore } from "@/lib/event/adminApi";
import { PHOTOBOOTH_PUBLIC_BASE } from "@/lib/photobooth/constants";
import { presignUpload } from "@/lib/photobooth/r2";
import { isLang, LANGS, type Platform } from "@/lib/store-page/fields";
import { extOf, invalidItems, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, itemId, slotById, type ImageItem } from "@/lib/store-page/images";
import { saveImageDraft, storePage } from "@/lib/store-page/server";
import { recordChange } from "@/lib/changes/server";
import { diffPics } from "@/lib/changes/model";

/**
 * 어드민 "스토어 페이지"의 이미지와 영상 (docs/admin-ui.md "스토어 페이지").
 * 스토어에는 쓰지 않는다. 파일은 팀 R2 store/ 에, 순서는 초안 표에 둔다.
 *
 * POST { platform, slot, type, bytes }                 { uploadUrl, url, key } 브라우저가 R2 에 바로 올린다
 * PUT  { platform, lang, slot, items, expect }         { draft } | 409 { current }
 */
const production = () => process.env.VERCEL_ENV === "production";
const onlyProd = () => NextResponse.json({ error: "운영 어드민에서만 올릴 수 있어요." }, { status: 403 });
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function POST(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (!production()) return onlyProd();
  const body = (await req.json().catch(() => ({}))) as { platform?: Platform; slot?: string; type?: string; bytes?: number };
  if (body.platform !== "ios" && body.platform !== "android") return bad("어느 스토어인지 알 수 없어요.");
  const slot = slotById(body.platform, body.slot ?? "");
  if (!slot) return bad("어느 칸인지 알 수 없어요.");
  const ext = extOf(body.type ?? "");
  if (!ext || !slot.types.includes(body.type ?? "")) return bad("올릴 수 없는 파일 형식이에요.");
  if (typeof body.bytes !== "number" || body.bytes <= 0 || body.bytes > (slot.video ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) return bad("파일이 너무 커요.");
  const key = `store/${slot.id}/${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  try {
    return NextResponse.json({ uploadUrl: presignUpload(key), url: `${PHOTOBOOTH_PUBLIC_BASE}/${key}`, key }, noStore);
  } catch (e) {
    console.error("[store-page] 업로드 주소", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "올릴 준비를 하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}

export async function PUT(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (!production()) return onlyProd();
  const body = (await req.json().catch(() => ({}))) as { platform?: Platform; lang?: string; slot?: string; items?: ImageItem[] | null; expect?: string | null };
  if ((body.platform !== "ios" && body.platform !== "android") || !isLang(body.lang)) return bad("어느 칸인지 알 수 없어요.");
  const slot = slotById(body.platform, body.slot ?? "");
  if (!slot) return bad("어느 칸인지 알 수 없어요.");
  if (body.items !== null && !Array.isArray(body.items)) return bad("목록이 올바르지 않아요.");
  if (body.items) {
    const problem = invalidItems(slot, body.items, PHOTOBOOTH_PUBLIC_BASE);
    if (problem) return bad(problem);
  }
  try {
    const actor = await actorName(checked.token);
    const result = await saveImageDraft({ platform: body.platform, lang: body.lang, slot: slot.id, items: body.items ?? null, expect: body.expect ?? null }, actor);
    if (!result.ok) return NextResponse.json({ error: "다른 분이 방금 이 칸을 고쳤어요.", current: result.current }, { status: 409 });
    // 변경 기록(#313). 초안이 없던 칸은 스토어에 지금 있는 그림들이 "전"이다
    const platform = body.platform;
    const lang = body.lang;
    const live = async (): Promise<ImageItem[]> => {
      const page = (await storePage().catch(() => null))?.[platform];
      return page?.ok ? (page.images[lang]?.[slot.id] ?? []) : [];
    };
    const pics = (l: ImageItem[]) => l.map((i, n) => ({ id: itemId(i), url: i.url, name: i.kind === "new" ? i.name : `스토어 ${n + 1}번` }));
    const field = diffPics(slot.label, pics(result.previous?.items ?? (await live())), pics(result.draft?.items ?? (await live())));
    const langLabel = LANGS.find((l) => l.id === lang)?.label ?? lang;
    await recordChange(
      { actor, area: "store-page", target: `${platform === "ios" ? "App Store" : "Google Play"} ${langLabel} ${slot.label} 초안`, action: "edit", fields: field ? [field] : [], href: "/admin/store-page" },
      { mergeWithinMs: 10 * 60_000 },
    );
    return NextResponse.json({ draft: result.draft }, noStore);
  } catch (e) {
    console.error("[store-page] 이미지 저장", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
