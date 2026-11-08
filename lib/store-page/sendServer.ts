/**
 * 초안 문구를 스토어로 보낸다 (docs/admin-ui.md "스토어 페이지"). 서버 전용이다.
 * - App Store: 다음 버전의 문구를 고친다. 심사에 내기 전까지 사용자에게 보이지 않는다. 프로모션 문구만 지금 버전에도 바로 넣는다
 * - Google Play: 편집(edit)에 넣고 구글 검사를 통과하면 커밋한다. 심사 중인 변경이 있으면 실패하게 둔다(ERROR_IF_IN_REVIEW)
 * 미리 확인(dryRun)은 스토어를 바꾸지 않는다.
 */
import { APPSTORE_APP_ID } from "../metrics/config.ts";
import { ASC_API } from "../metrics/appstore/auth.ts";
import { asc, play, playToken, PLAY_API, releaseAscToken, StoreError } from "../release/stores.ts";
import { LANGS, type FieldId, type Lang } from "./fields.ts";
import { IOS_INFO_FIELDS, IOS_VERSION_FIELDS, type Change } from "./send.ts";

export type SendResult = { message: string; applied: Change[]; failed?: string };

const IOS_EDITABLE = new Set(["PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED", "INVALID_BINARY"]);

async function patch(type: "appInfoLocalizations" | "appStoreVersionLocalizations", id: string, attributes: Record<string, string>, token: string): Promise<void> {
  const res = await fetch(`${ASC_API}/${type}/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ data: { type, id, attributes } }),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (res.ok) return;
  const body = (await res.json().catch(() => ({}))) as { errors?: { detail?: string; title?: string }[] };
  const reason = body.errors?.[0]?.detail ?? body.errors?.[0]?.title ?? "";
  throw new StoreError(`App Store 가 받지 않았어요. ${reason}`.trim(), { detail: `ASC ${res.status} ${reason}`, status: res.status });
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

/** App Store 로 보낸다. 묶음마다 차례로 보내고, 중간에 실패하면 어디까지 됐는지 돌려준다 */
export async function sendIos(changes: Change[], dryRun: boolean): Promise<SendResult> {
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
      return { message: `${applied.length}칸은 보냈고 나머지는 보내지 못했어요.`, applied, failed: e instanceof Error ? e.message : "보내지 못했어요." };
    }
  }
  if (dryRun) return { message: "App Store 에 보낼 수 있어요.", applied: [] };
  return { message: t.version ? `${t.version}에 저장했어요. 심사에 내면 함께 나가요.` : "App Store 에 저장했어요.", applied };
}

const PLAY_KEY: Partial<Record<FieldId, string>> = { title: "title", shortDescription: "shortDescription", fullDescription: "fullDescription", video: "video" };

/** Google Play 로 보낸다. 언어를 한 번에 커밋하므로 전부 되거나 전부 안 된다 */
export async function sendAndroid(changes: Change[], dryRun: boolean): Promise<SendResult> {
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
    await play(`${PLAY_API}/edits/${edit.id}:validate`, token, { method: "POST" });
    if (dryRun) return { message: "구글 검사를 통과했어요.", applied: [] };
    await play(`${PLAY_API}/edits/${edit.id}:commit?changesInReviewBehavior=ERROR_IF_IN_REVIEW`, token, { method: "POST" });
    committed = true;
    return { message: "Google Play 에 보냈어요. 심사 뒤 게시 개요에서 게시하면 나가요.", applied: changes };
  } finally {
    if (!committed) await play(`${PLAY_API}/edits/${edit.id}`, token, { method: "DELETE" }).catch(() => undefined);
  }
}
