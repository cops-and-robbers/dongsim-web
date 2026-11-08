import { NextResponse } from "next/server";
import { actorName } from "@/lib/admin/server/remoteConfig";
import { guard, noStore } from "@/lib/event/adminApi";
import { auditReady, finishLog, isRepeat, startLog } from "@/lib/release/audit";
import { StoreError } from "@/lib/release/stores";
import type { Platform } from "@/lib/store-page/fields";
import { readAndroidPage, readIosPage } from "@/lib/store-page/read";
import { blockers, changesOf, CONFIRM_WORD, imageBlockers, imageChangesOf, needsConfirm, signature, type Change, type ImageChange } from "@/lib/store-page/send";
import { sendAndroid, sendIos } from "@/lib/store-page/sendServer";
import { deleteDrafts, deleteImageDrafts, readDrafts, readImageDrafts, refreshStores } from "@/lib/store-page/server";

/**
 * 초안 문구와 이미지를 스토어로 보낸다 (docs/admin-ui.md "스토어 페이지").
 *
 * POST { platform, expect, confirm?, dryRun? }
 * 1. 운영 배포에서만(미리 확인은 키가 있는 곳 어디서나)
 * 2. 스토어를 캐시 없이 다시 읽어 바뀔 내용을 다시 계산하고, 화면이 본 것(expect)과 같은지 확인
 * 3. 규칙에 어긋나는 칸이 있거나 입력이 필요한데 없으면 하지 않는다
 * 4. 기록을 먼저 남기고, 몇 분 안에 같은 내용을 두 번 받지 않는다
 * 5. 보내고, 보낸 칸의 초안을 지운다
 */
export const maxDuration = 300; // 파일을 저장소에서 받아 스토어로 넘긴다
const SEND_BUDGET = 270_000;

export async function POST(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  const body = (await req.json().catch(() => ({}))) as { platform?: Platform; expect?: string; confirm?: string; dryRun?: boolean };
  const platform = body.platform;
  if ((platform !== "ios" && platform !== "android") || !body.expect) return NextResponse.json({ error: "무엇을 보낼지 빠졌어요." }, { status: 400 });
  const dryRun = body.dryRun === true;
  if (!dryRun && process.env.VERCEL_ENV !== "production") return NextResponse.json({ error: "스토어는 운영 어드민에서만 바꿀 수 있어요." }, { status: 403 });

  const deadline = Date.now() + SEND_BUDGET;
  let changes: Change[];
  let images: ImageChange[];
  let blocked: string[];
  try {
    const [page, drafts, imageDrafts] = await Promise.all([platform === "ios" ? readIosPage() : readAndroidPage(), readDrafts(), readImageDrafts()]);
    if (!page.ok || !drafts || !imageDrafts) throw new StoreError("지금은 스토어를 다시 읽지 못했어요.");
    changes = changesOf(platform, page.langs, drafts);
    images = imageChangesOf(platform, page.images, imageDrafts);
    blocked = [...blockers(platform, page.langs, changes), ...imageBlockers(platform, page.images, images)];
  } catch (e) {
    console.error("[store-page] 보내기 읽기", e instanceof StoreError ? (e.detail ?? e.message) : e);
    return NextResponse.json({ error: e instanceof StoreError ? e.message : "스토어를 다시 읽지 못해 보내지 않았어요. 잠시 뒤 다시 해 주세요." }, { status: 502 });
  }
  const expect = signature(changes, images);
  if (changes.length + images.length === 0 || expect !== body.expect) return NextResponse.json({ error: "화면을 연 뒤 내용이 바뀌어 보내지 않았어요. 다시 확인해 주세요.", stale: true }, { status: 409 });
  if (blocked.length) return NextResponse.json({ error: blocked[0] }, { status: 400 });
  if (!dryRun && needsConfirm(platform, changes) && (body.confirm ?? "").trim() !== CONFIRM_WORD) return NextResponse.json({ error: `확인 칸에 ${CONFIRM_WORD}를 그대로 입력해 주세요.` }, { status: 400 });

  const send = (dry: boolean) => (platform === "ios" ? sendIos(changes, images, dry, deadline) : sendAndroid(changes, images, dry));
  if (dryRun) {
    try {
      return NextResponse.json(await send(true), noStore);
    } catch (e) {
      console.error("[store-page] 미리 확인", e instanceof StoreError ? (e.detail ?? e.message) : e);
      return NextResponse.json({ error: e instanceof StoreError ? e.message : "미리 확인하지 못했어요." }, { status: 502 });
    }
  }

  const action = `${platform}.storeText`;
  if (!(await auditReady())) return NextResponse.json({ error: "버튼을 쓸 준비가 아직 안 됐어요. 개발 담당자에게 알려 주세요." }, { status: 503 });
  let logId: number;
  try {
    if (await isRepeat(action, expect)) return NextResponse.json({ error: "방금 같은 내용을 보냈어요. 다시 확인해 주세요." }, { status: 409 });
    logId = await startLog({ platform, action, version: `${changes.length + images.length}칸`, expect, params: { fields: [...changes.map((c) => `${c.lang}:${c.field}`), ...images.map((c) => `${c.lang}:${c.slot}`)] }, actor: await actorName(checked.token) });
  } catch (e) {
    console.error("[store-page] 기록", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "기록을 남기지 못해 보내지 않았어요." }, { status: 503 });
  }

  try {
    const result = await send(false);
    await deleteDrafts(platform, result.applied).catch((e) => console.error("[store-page] 초안 지우기", e));
    await deleteImageDrafts(platform, result.appliedImages).catch((e) => console.error("[store-page] 이미지 초안 지우기", e));
    await finishLog(logId, result.failed ? "failed" : "done", result.failed ? `${result.message} ${result.failed}` : result.message);
    refreshStores();
    return NextResponse.json(result, noStore);
  } catch (e) {
    const message = e instanceof StoreError ? e.message : "스토어에 보내다 문제가 생겼어요.";
    console.error("[store-page] 보내기", e instanceof StoreError ? (e.detail ?? e.message) : e);
    await finishLog(logId, "failed", message).catch(() => undefined);
    refreshStores();
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
