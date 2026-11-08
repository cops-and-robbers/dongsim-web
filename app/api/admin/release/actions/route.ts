import { NextResponse } from "next/server";
import { actorName } from "@/lib/admin/server/remoteConfig";
import { guard, noStore } from "@/lib/event/adminApi";
import { runAction } from "@/lib/release/actions";
import { auditReady, finishLog, isRepeat, startLog } from "@/lib/release/audit";
import { NOTE_LANGS, NOTE_MAX, ROLLOUT_STEPS, optionsFor, type ActionId } from "@/lib/release/options";
import { refreshReleaseBoard } from "@/lib/release/server";
import { readAndroid, readIos, StoreError } from "@/lib/release/stores";

/**
 * 어드민 출시 조작 (#231, docs/admin-ui.md "출시 조작").
 *
 * POST { id, expect, confirm?, fraction?, dryRun? }
 * 1. 운영 배포에서만(미리 확인은 키가 있는 곳 어디서나)
 * 2. 스토어를 캐시 없이 다시 읽어 그 조작이 지금도 가능한지, 화면이 본 상태(expect)와 같은지 확인
 * 3. 단계 2 조작은 버전 번호를 그대로 입력했는지
 * 4. 기록을 먼저 남기고(못 남기면 하지 않는다), 몇 분 안에 같은 조작을 두 번 받지 않는다
 * 5. 스토어에 보내고 결과를 기록, 출시 보드 캐시를 비운다
 */
export const maxDuration = 60;

const isWritable = () => process.env.VERCEL_ENV === "production";

export async function POST(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  const body = (await req.json().catch(() => ({}))) as { id?: ActionId; expect?: string; confirm?: string; fraction?: number; notes?: { language: string; text: string }[]; dryRun?: boolean };
  const id = body.id;
  if (!id || !body.expect) return NextResponse.json({ error: "무엇을 할지 빠졌어요." }, { status: 400 });
  const dryRun = body.dryRun === true;
  if (!dryRun && !isWritable()) return NextResponse.json({ error: "스토어는 운영 어드민에서만 바꿀 수 있어요." }, { status: 403 });
  const platform = id.startsWith("ios.") ? "ios" : "android";

  // 2. 다시 읽기
  let options;
  try {
    // 조작은 늘 새로 읽은 값으로 판단한다(마지막 값을 쓰지 않는다)
    options = optionsFor(platform, platform === "ios" ? await readIos() : await readAndroid({ fresh: true }));
  } catch (e) {
    return NextResponse.json({ error: e instanceof StoreError ? e.message : "스토어를 다시 읽지 못해 하지 않았어요. 잠시 뒤 다시 해 주세요." }, { status: 502 });
  }
  const option = options.find((o) => o.id === id && o.expect === body.expect);
  if (!option) return NextResponse.json({ error: "화면을 연 뒤 스토어 상태가 바뀌어 하지 않았어요. 다시 읽고 확인해 주세요.", stale: true }, { status: 409 });

  // 3. 입력 확인
  if (!dryRun && option.level === 2 && (body.confirm ?? "").trim() !== option.confirmWord)
    return NextResponse.json({ error: `확인 칸에 ${option.confirmWord}을 그대로 입력해 주세요.` }, { status: 400 });
  if (id === "android.rolloutSet" && !(ROLLOUT_STEPS.includes(body.fraction ?? -1) && (body.fraction ?? 0) > (option.params.fraction ?? 0)))
    return NextResponse.json({ error: "고를 수 있는 비율이 아니에요." }, { status: 400 });
  if (id === "android.createRelease" && body.fraction !== undefined && !(body.fraction === 1 || ROLLOUT_STEPS.includes(body.fraction)))
    return NextResponse.json({ error: "고를 수 있는 비율이 아니에요." }, { status: 400 });

  // 출시 노트는 우리 세 언어만, 언어마다 500자까지. 빈 언어는 넣지 않는다
  let notes: { language: string; text: string }[] | undefined;
  if (id === "android.createRelease" && body.notes) {
    notes = body.notes.map((n) => ({ language: n.language, text: (n.text ?? "").trim() })).filter((n) => n.text);
    if (notes.some((n) => !NOTE_LANGS.some((l) => l.language === n.language) || [...n.text].length > NOTE_MAX))
      return NextResponse.json({ error: `출시 노트는 한국어, 영어, 일본어만, 언어마다 ${NOTE_MAX}자까지예요.` }, { status: 400 });
  }
  const input = { fraction: body.fraction, notes };

  if (dryRun) {
    try {
      return NextResponse.json(await runAction(option, input, true), noStore);
    } catch (e) {
      return NextResponse.json({ error: e instanceof StoreError ? e.message : "미리 확인하지 못했어요." }, { status: 502 });
    }
  }

  // 4. 기록
  if (!(await auditReady()))
    return NextResponse.json({ error: "조작 기록 표가 아직 없어요. supabase/migrations/0016_release_actions.sql 을 Supabase 에서 실행해 주세요." }, { status: 503 });
  let logId: number;
  try {
    if (await isRepeat(id, option.expect)) return NextResponse.json({ error: "방금 같은 조작을 했어요. 다시 읽고 확인해 주세요." }, { status: 409 });
    logId = await startLog({ platform, action: id, version: option.confirmWord, expect: option.expect, params: { code: option.params.code, to: option.params.to, fraction: body.fraction ?? option.params.fraction ?? null, notes: notes ?? null }, actor: await actorName(checked.token) });
  } catch (e) {
    console.error("[release-action] log", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "조작 기록을 남기지 못해 하지 않았어요." }, { status: 503 });
  }

  // 5. 보내기
  try {
    const result = await runAction(option, input, false);
    await finishLog(logId, "done", result.message);
    refreshReleaseBoard(true);
    return NextResponse.json(result, noStore);
  } catch (e) {
    const message = e instanceof StoreError ? e.message : "스토어에 보내다 문제가 생겼어요.";
    console.error("[release-action]", id, e instanceof Error ? e.message : e);
    await finishLog(logId, "failed", message).catch(() => undefined);
    refreshReleaseBoard(true);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
