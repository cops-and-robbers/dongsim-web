import { NextResponse } from "next/server";
import { actorName } from "@/lib/admin/server/remoteConfig";
import { guard, noStore } from "@/lib/event/adminApi";
import { baseOf, DRAFT_MAX, FIELDS, isField, isLang, LANGS, type Platform } from "@/lib/store-page/fields";
import { recordChange } from "@/lib/changes/server";
import { refreshStores, saveDraft, storePage } from "@/lib/store-page/server";

/**
 * 어드민 "스토어 페이지" (docs/admin-ui.md "스토어 페이지").
 * 스토어에는 아무것도 쓰지 않는다. 초안만 우리 저장소에 둔다.
 *
 * GET  ?fresh=1 이면 스토어 문구를 다시 읽는다      StorePage
 * PUT  { platform, lang, field, value, expect }     { draft } | 409 { current }
 */
export const maxDuration = 30;

export async function GET(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (new URL(req.url).searchParams.get("fresh") === "1") refreshStores();
  try {
    return NextResponse.json(await storePage(), noStore);
  } catch (e) {
    console.error("[store-page]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "스토어 문구를 불러오지 못했어요. 잠시 뒤 다시 확인해 주세요." }, { status: 502 });
  }
}

export async function PUT(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  // 저장소는 운영과 미리보기, 로컬이 같이 쓴다. 로컬에서 고쳐도 팀의 초안이 바뀌므로 운영에서만 받는다
  if (process.env.VERCEL_ENV !== "production") return NextResponse.json({ error: "초안은 운영 어드민에서만 저장돼요." }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { platform?: Platform; lang?: string; field?: string; value?: string | null; expect?: string | null };
  const { platform, lang, field, value } = body;
  if ((platform !== "ios" && platform !== "android") || !isLang(lang) || !isField(platform, field)) return NextResponse.json({ error: "어느 칸인지 알 수 없어요." }, { status: 400 });
  if (value !== null && (typeof value !== "string" || [...value].length > DRAFT_MAX)) return NextResponse.json({ error: "글이 너무 길어요." }, { status: 400 });
  try {
    const actor = await actorName(checked.token);
    const result = await saveDraft({ platform, lang, field, value: value ?? null, expect: body.expect ?? null }, actor);
    if (!result.ok) return NextResponse.json({ error: "다른 분이 방금 이 칸을 고쳤어요.", current: result.current }, { status: 409 });
    // 변경 기록(#313). 초안이 없던 칸은 스토어에 지금 있는 문구가 "전"이다. 입력하는 동안 저절로 저장돼 10분 안의 고침은 한 줄로 합친다
    const live = async () => {
      const page = (await storePage().catch(() => null))?.[platform];
      return page?.ok ? baseOf(page.langs[lang], field) : null;
    };
    const before = result.previous?.value ?? (await live());
    const after = result.draft?.value ?? (await live());
    const label = FIELDS[platform].find((f) => f.id === field)?.label ?? field;
    const langLabel = LANGS.find((l) => l.id === lang)?.label ?? lang;
    await recordChange(
      { actor, area: "store-page", target: `${platform === "ios" ? "App Store" : "Google Play"} ${langLabel} ${label} 초안`, action: "edit", fields: before === after ? [] : [{ kind: "value", label, before: before || null, after: after || null }], href: "/admin/store-page" },
      { mergeWithinMs: 10 * 60_000 },
    );
    return NextResponse.json({ draft: result.draft }, noStore);
  } catch (e) {
    console.error("[store-page] 저장", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
