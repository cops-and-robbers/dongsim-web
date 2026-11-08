/**
 * 출시 조작을 스토어에 보낸다 (docs/admin-ui.md "출시 조작"). 서버 전용이다.
 *
 * 부르는 쪽(app/api/admin/release/actions)이 먼저 스토어를 다시 읽어 그 조작이 지금도 가능한지 확인하고 기록을 남긴 뒤 부른다.
 * - App Store: 요청 하나(제출만 묶음 만들기 → 버전 넣기 → 제출 세 번). 미리 확인하는 길이 없다
 * - Play: 편집(edit)을 열어 프로덕션 트랙을 바꾸고, 구글의 검사(validate)를 거친 뒤 커밋한다. 미리 확인(dryRun)이면 검사까지만 하고 편집을 지운다.
 *   커밋은 심사 중인 변경이 있으면 실패하게(ERROR_IF_IN_REVIEW) 한다. 기본값은 심사 중인 것을 취소하고 다시 내는 것이라 위험하다
 */
import { ASC_API } from "../metrics/appstore/auth.ts";
import { APPSTORE_APP_ID } from "../metrics/config.ts";
import { ro } from "./board.ts";
import type { Option } from "./options.ts";
import { ascRequests, productionReleases, type AscRequest, type TrackRelease } from "./requests.ts";
import { PLAY_API, StoreError, play, playToken, releaseAscToken } from "./stores.ts";

const TIMEOUT = 20_000;

async function asc(req: AscRequest | { method: "GET"; path: string }, token: string): Promise<{ data?: { id: string; attributes?: Record<string, unknown>; relationships?: Record<string, { data?: unknown }> }[] | { id: string } }> {
  const res = await fetch(`${ASC_API.replace(/\/v1$/, "")}${req.path}`, {
    method: req.method,
    headers: { Authorization: `Bearer ${token}`, ...("body" in req ? { "Content-Type": "application/json" } : {}) },
    body: "body" in req ? JSON.stringify(req.body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT),
    cache: "no-store",
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const errs = (body.errors ?? []) as { detail?: string; title?: string }[];
    // 애플이 준 사유를 그대로 보여 준다(예: 빌드가 없음, 문구가 비었음). 키나 토큰은 들어 있지 않다
    throw new StoreError(`App Store Connect 가 받지 않았어요. ${errs.map((e) => e.detail ?? e.title).filter(Boolean).join(" / ")}`.trim(), { status: res.status });
  }
  return body;
}

/** 이미 열려 있는(아직 내지 않은) 제출 묶음. 애플은 플랫폼마다 열린 묶음을 하나만 둔다 */
async function openSubmission(token: string): Promise<string | null> {
  const body = await asc({ method: "GET", path: `/v1/reviewSubmissions?filter[app]=${APPSTORE_APP_ID}&filter[platform]=IOS&filter[state]=READY_FOR_REVIEW&limit=1` }, token);
  const list = Array.isArray(body.data) ? body.data : [];
  return list[0]?.id ?? null;
}

export type RunResult = { message: string; validated?: boolean };

/** 편집으로 읽은 지금 프로덕션 트랙에서 그 조작을 해도 되는지. 안 되면 이유 */
export function guardTrack(action: "createRelease" | "rolloutSet" | "halt" | "resume" | "complete", releases: TrackRelease[], code: number): string | null {
  const target = releases.find((r) => (r.versionCodes ?? []).map(Number).includes(code));
  if (action === "createRelease") {
    const top = Math.max(0, ...releases.flatMap((r) => (r.versionCodes ?? []).map(Number)));
    return top >= code ? `이미 빌드 ${top} 출시가 있어요.` : null;
  }
  if (!target) return `빌드 ${code} 출시를 찾지 못했어요.`;
  const want: Record<string, string[]> = { rolloutSet: ["inProgress"], halt: ["inProgress"], resume: ["halted"], complete: ["inProgress", "halted"] };
  const word: Record<string, string> = { inProgress: "단계적 출시 중", halted: "단계적 출시가 멈춘", completed: "모두에게 나간", draft: "초안" };
  return want[action].includes(target.status ?? "") ? null : `빌드 ${code} 출시가 지금 ${word[target.status ?? ""] ?? "알 수 없는"} 상태예요.`;
}

export async function runAction(option: Option, input: { fraction?: number; notes?: { language: string; text: string }[] }, dryRun: boolean): Promise<RunResult> {
  const p = option.params;
  if (option.platform === "ios") {
    if (dryRun) throw new StoreError("App Store 는 미리 확인하는 길이 없어요");
    const token = releaseAscToken();
    switch (option.id) {
      case "ios.renameVersion":
        await asc(ascRequests.renameVersion(p.versionId!, p.to!), token);
        return { message: `버전 칸 이름을 ${ro(p.to!)} 바꿨어요` };
      case "ios.attachBuild":
        await asc(ascRequests.attachBuild(p.versionId!, p.buildId!), token);
        return { message: "빌드를 붙였어요" };
      case "ios.submit": {
        let sub = await openSubmission(token);
        if (!sub) {
          const created = await asc(ascRequests.createSubmission(APPSTORE_APP_ID), token);
          sub = (created.data as { id: string }).id;
        }
        try {
          await asc(ascRequests.addSubmissionItem(sub, p.versionId!), token);
        } catch (e) {
          // 이미 묶음에 들어 있으면 409. 그대로 제출로 넘어간다
          if (!(e instanceof StoreError && e.status === 409)) throw e;
        }
        await asc(ascRequests.submit(sub), token);
        return { message: "심사에 냈어요" };
      }
      case "ios.cancelSubmission":
        await asc(ascRequests.cancelSubmission(p.submissionId!), token);
        return { message: "제출을 취소했어요" };
      case "ios.release":
        await asc(ascRequests.release(p.versionId!), token);
        return { message: "출시했어요. 나라마다 보이기까지 최대 24시간이 걸려요" };
      case "ios.phasedPause":
        await asc(ascRequests.phased(p.phasedId!, "PAUSED"), token);
        return { message: "단계적 출시를 멈췄어요" };
      case "ios.phasedResume":
        await asc(ascRequests.phased(p.phasedId!, "ACTIVE"), token);
        return { message: "단계적 출시를 이어 가요" };
      case "ios.phasedComplete":
        await asc(ascRequests.phased(p.phasedId!, "COMPLETE"), token);
        return { message: "모두에게 냈어요" };
    }
    throw new StoreError("모르는 조작이에요");
  }

  // ---------- Play ----------
  const token = await playToken();
  const action = option.id.replace("android.", "") as "createRelease" | "rolloutSet" | "halt" | "resume" | "complete";
  const edit = (await play(`${PLAY_API}/edits`, token, { method: "POST" })) as { id?: string };
  if (!edit.id) throw new StoreError("Play 편집을 열지 못했어요");
  let committed = false;
  try {
    const track = (await play(`${PLAY_API}/edits/${edit.id}/tracks/production`, token)) as { releases?: TrackRelease[] };
    // 출시 목록은 몇 분 전 값일 수 있어, 편집으로 읽은 지금 프로덕션 트랙이 화면이 본 것과 맞는지 한 번 더 본다
    const mismatch = guardTrack(action, track.releases ?? [], p.code!);
    if (mismatch) throw new StoreError(`${mismatch} 화면을 새로 확인해 주세요.`);
    const releases = productionReleases(action, track.releases ?? [], { code: p.code!, fraction: input.fraction ?? p.fraction, notes: input.notes ?? p.notes });
    await play(`${PLAY_API}/edits/${edit.id}/tracks/production`, token, { method: "PUT", body: JSON.stringify({ track: "production", releases }) });
    // 구글의 검사. 여기서 걸리면 커밋하지 않는다
    await play(`${PLAY_API}/edits/${edit.id}:validate`, token, { method: "POST" });
    if (dryRun) return { message: "Play 가 이 변경을 받아들여요", validated: true };
    await play(`${PLAY_API}/edits/${edit.id}:commit?changesInReviewBehavior=ERROR_IF_IN_REVIEW`, token, { method: "POST" });
    committed = true;
    const done: Record<typeof action, string> = {
      createRelease: "심사에 냈어요. 승인되면 게시 개요에서 게시할 수 있어요",
      rolloutSet: "비율을 바꿨어요",
      halt: "단계적 출시를 멈췄어요",
      resume: "단계적 출시를 이어 가요",
      complete: "모두에게 냈어요",
    };
    return { message: done[action], validated: true };
  } finally {
    // 커밋하지 않은 편집은 지운다(지우지 못해도 스토어에 영향은 없다)
    if (!committed) await fetch(`${PLAY_API}/edits/${edit.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIMEOUT) }).catch(() => undefined);
  }
}
