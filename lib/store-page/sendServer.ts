/**
 * 초안 문구를 스토어로 보낸다 (docs/admin-ui.md "스토어 페이지"). 서버 전용이다.
 * - App Store: 다음 버전의 문구를 고친다. 심사에 내기 전까지 사용자에게 보이지 않는다. 프로모션 문구만 지금 버전에도 바로 넣는다
 * - Google Play: 편집(edit)에 넣고 구글 검사를 통과하면 커밋한다. 심사 중인 변경이 있으면 실패하게 둔다(ERROR_IF_IN_REVIEW)
 * 미리 확인(dryRun)은 스토어를 바꾸지 않는다.
 */
import { APPSTORE_APP_ID } from "../metrics/config.ts";
import { asc, play, playToken, PLAY_API, releaseAscToken, StoreError } from "../release/stores.ts";
import { LANGS, type FieldId, type Lang } from "./fields.ts";
import { IOS_INFO_FIELDS, IOS_VERSION_FIELDS, type Change, type ImageChange } from "./send.ts";
import { applyPlayImages, ascWrite, checkFiles, sendIosImages } from "./sendImages.ts";

export type SendResult = { message: string; applied: Change[]; appliedImages: ImageChange[]; failed?: string };

const IOS_EDITABLE = new Set(["PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED", "INVALID_BINARY"]);

async function patch(type: "appInfoLocalizations" | "appStoreVersionLocalizations", id: string, attributes: Record<string, string>, token: string): Promise<void> {
  await ascWrite("PATCH", `/${type}/${id}`, { data: { type, id, attributes } }, token);
}

type IdMap = Map<string, string>;
const idsOf = (r: { data?: { id: string; attributes?: Record<string, unknown> }[] }): IdMap => new Map((r.data ?? []).map((x) => [String(x.attributes?.locale), x.id]));

async function iosTargets(token: string) {
  const app = APPSTORE_APP_ID;
  const [infos, versions] = await Promise.all([asc(`/apps/${app}/appInfos?limit=5&fields[appInfos]=state`, token), asc(`/apps/${app}/appStoreVersions?filter[platform]=IOS&limit=6&fields[appStoreVersions]=versionString,appVersionState`, token)]);
  const nextInfo = infos.data?.find((i) => i.attributes?.state !== "READY_FOR_SALE");
  const nextVersion = versions.data?.find((v) => IOS_EDITABLE.has(String(v.attributes?.appVersionState)));
  const liveVersion = versions.data?.find((v) => v.attributes?.appVersionState === "READY_FOR_DISTRIBUTION");
  const locs = (path: string) => asc(`${path}?limit=50&fields[${path.split("/").pop()}]=locale`, token).then(idsOf);
  const none = Promise.resolve(new Map<string, string>());
  const [info, next, live] = await Promise.all([
    nextInfo ? locs(`/appInfos/${nextInfo.id}/appInfoLocalizations`) : none,
    nextVersion ? locs(`/appStoreVersions/${nextVersion.id}/appStoreVersionLocalizations`) : none,
    liveVersion ? locs(`/appStoreVersions/${liveVersion.id}/appStoreVersionLocalizations`) : none,
  ]);
  return { info, next, live, version: nextVersion?.attributes?.versionString as string | undefined };
}

const pick = (cs: Change[], fields: FieldId[]) => Object.fromEntries(cs.filter((c) => fields.includes(c.field)).map((c) => [c.field, c.after]));

/** App Store 로 보낸다. 문구 묶음을 차례로 보낸 뒤 이미지 칸을 보내고, 중간에 실패하면 어디까지 됐는지 돌려준다 */
export async function sendIos(changes: Change[], images: ImageChange[], dryRun: boolean, deadline: number): Promise<SendResult> {
  const token = releaseAscToken();
  const t = await iosTargets(token);
  const applied: Change[] = [];
  const plan: { list: Change[]; run: () => Promise<void> }[] = [];
  for (const l of LANGS) {
    const cs = changes.filter((c) => c.lang === l.id);
    if (cs.length === 0) continue;
    const need = (m: IdMap, what: string) => {
      const id = m.get(l.ios);
      if (!id) throw new StoreError(`${l.label} ${what}을 찾지 못했어요. App Store Connect 에서 확인해 주세요.`);
      return id;
    };
    const info = cs.filter((c) => IOS_INFO_FIELDS.includes(c.field));
    if (info.length) {
      const id = need(t.info, "앱 정보");
      plan.push({ list: info, run: () => patch("appInfoLocalizations", id, dryRun ? {} : pick(info, IOS_INFO_FIELDS), token) });
    }
    const version = cs.filter((c) => IOS_VERSION_FIELDS.includes(c.field));
    if (version.length) {
      const id = need(t.next, "다음 버전");
      plan.push({ list: version, run: () => patch("appStoreVersionLocalizations", id, dryRun ? {} : pick(version, IOS_VERSION_FIELDS), token) });
    }
    const promo = cs.filter((c) => c.field === "promotionalText");
    if (promo.length) {
      const attrs: Record<string, string> = dryRun ? {} : { promotionalText: promo[0].after };
      const liveId = t.live.get(l.ios);
      const nextId = t.next.get(l.ios);
      if (!liveId && !nextId) throw new StoreError(`${l.label} 버전을 찾지 못했어요.`);
      plan.push({
        list: promo,
        run: async () => {
          if (liveId) await patch("appStoreVersionLocalizations", liveId, attrs, token);
          if (nextId) await patch("appStoreVersionLocalizations", nextId, attrs, token);
        },
      });
    }
  }
  for (const step of plan) {
    try {
      await step.run();
      applied.push(...step.list);
    } catch (e) {
      if (applied.length === 0) throw e;
      return { message: `${applied.length}칸은 보냈고 나머지는 보내지 못했어요.`, applied, appliedImages: [], failed: e instanceof Error ? e.message : "보내지 못했어요." };
    }
  }
  if (dryRun) {
    if (images.length && t.next.size === 0) throw new StoreError("다음 버전을 찾지 못했어요. App Store Connect 에서 새 버전을 만들어 주세요.");
    await checkFiles(images);
    return { message: "App Store 에 보낼 수 있어요.", applied: [], appliedImages: [] };
  }
  const sent = await sendIosImages(images, t.next, token, deadline);
  const done = applied.length + sent.applied.length;
  if (done === 0 && sent.failed) throw new StoreError(sent.failed);
  if (sent.failed) return { message: `${done}칸은 보냈고 나머지는 보내지 못했어요.`, applied, appliedImages: sent.applied, failed: sent.failed };
  const saved = t.version ? `${t.version}에 저장했어요. 심사에 내면 함께 나가요.` : "App Store 에 저장했어요.";
  return { message: images.length ? `${saved} 이미지는 애플이 확인하는 데 몇 분 걸릴 수 있어요.` : saved, applied, appliedImages: sent.applied };
}

const PLAY_KEY: Partial<Record<FieldId, string>> = { title: "title", shortDescription: "shortDescription", fullDescription: "fullDescription", video: "video" };

/** 다른 곳에서 새 편집을 열면 구글이 이전 편집을 지운다(2026-11-08 실제 동작). 스토어 페이지를 읽기만 해도 편집을 연다 */
const EDIT_GONE = "다른 화면이 Google Play 를 읽는 바람에 멈췄어요. 아무것도 바뀌지 않았으니 다시 보내 주세요.";

/** Google Play 로 보낸다. 문구와 이미지를 한 번에 커밋하므로 전부 되거나 전부 안 된다. 나눠 커밋하면 앞의 것이 심사 중일 때 뒤의 것이 막힌다 */
export async function sendAndroid(changes: Change[], images: ImageChange[], dryRun: boolean): Promise<SendResult> {
  const token = await playToken();
  const edit = (await play(`${PLAY_API}/edits`, token, { method: "POST", body: "{}" })) as { id: string };
  let committed = false;
  try {
    const byLang = new Map<Lang, Change[]>();
    for (const c of changes) byLang.set(c.lang, [...(byLang.get(c.lang) ?? []), c]);
    for (const [lang, cs] of byLang) {
      const code = LANGS.find((l) => l.id === lang)!.android;
      const body = Object.fromEntries(cs.flatMap((c) => (PLAY_KEY[c.field] ? [[PLAY_KEY[c.field]!, c.after]] : [])));
      await play(`${PLAY_API}/edits/${edit.id}/listings/${code}`, token, { method: "PATCH", body: JSON.stringify({ language: code, ...body }) });
    }
    // 미리 확인은 파일이 있는지만 본다. 창을 열 때마다 이미지를 올리지 않는다
    if (dryRun) await checkFiles(images);
    else await applyPlayImages(images, edit.id, token);
    await play(`${PLAY_API}/edits/${edit.id}:validate`, token, { method: "POST" });
    if (dryRun) return { message: "구글 검사를 통과했어요.", applied: [], appliedImages: [] };
    await play(`${PLAY_API}/edits/${edit.id}:commit?changesInReviewBehavior=ERROR_IF_IN_REVIEW`, token, { method: "POST" });
    committed = true;
    return { message: "Google Play 에 보냈어요. 심사 뒤 게시 개요에서 게시하면 나가요.", applied: changes, appliedImages: images };
  } catch (e) {
    if (e instanceof StoreError && /edit has been deleted/i.test(e.detail ?? "")) throw new StoreError(EDIT_GONE, { detail: e.detail, status: e.status });
    throw e;
  } finally {
    if (!committed) await play(`${PLAY_API}/edits/${edit.id}`, token, { method: "DELETE" }).catch(() => undefined);
  }
}
