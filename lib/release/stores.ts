/**
 * 출시 보드가 두 스토어에서 읽는 것 (docs/admin-ui.md "출시"). 서버 전용이다.
 *
 * 스토어에 아무것도 쓰지 않는다.
 * - App Store Connect: 출시용 키(App Manager)로 버전, 빌드, 심사 제출 묶음을 GET 으로만 읽는다
 * - Google Play: 출시용 서비스 계정으로 트랙의 출시 목록을 읽는다. 단계적 출시 비율과 승인된 스토어 이름은
 *   편집(edit) 안에서만 보여서 편집을 열어 읽고, 커밋하지 않고 바로 지운다. 커밋하지 않은 편집은 스토어에 아무 영향이 없다
 * - 나라별 반영: 애플 공개 조회(iTunes lookup), Play 스토어 페이지 제목(로그인 없이 누구나 보는 값)
 *
 * 오류 메시지에 키나 토큰을 넣지 않는다. 화면에는 무엇을 하면 되는지를 쉬운 말로 돌려준다.
 */

import { ascToken, ASC_API } from "../metrics/appstore/auth.ts";
import { APPSTORE_APP_ID, PLAY_PACKAGE } from "../metrics/config.ts";
import { serviceAccountFromEnv, serviceAccountToken } from "../metrics/google.ts";
import type { AndroidRaw, HistoryItem, IosBuild, IosRaw, IosVersion, PlayRelease } from "./board.ts";

const TIMEOUT = 15_000;

/** 화면에 그대로 보여 줄 수 있는 오류 */
export class StoreError extends Error {}
/** 구글이 읽는 횟수를 막았을 때 */
export class QuotaError extends StoreError {}

// ---------- iOS ----------

export const releaseAscKey = () => ({ issuer: process.env.ASC_ISSUER_ID, keyId: process.env.ASC_RELEASE_KEY_ID, pem: process.env.ASC_RELEASE_PRIVATE_KEY });

type JsonApi = { data?: { id: string; type: string; attributes?: Record<string, unknown>; relationships?: Record<string, { data?: { id: string; type: string } | null }> }[]; included?: { id: string; type: string; attributes?: Record<string, unknown> }[]; errors?: { detail?: string; title?: string }[] };

async function asc(path: string, token: string): Promise<JsonApi> {
  const res = await fetch(`${ASC_API}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIMEOUT), cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as JsonApi;
  if (res.status === 401) throw new StoreError("App Store Connect 가 키를 받지 않아요. 키가 폐기되지 않았는지, Vercel 의 ASC_RELEASE_* 값이 맞는지 확인해 주세요");
  if (res.status === 403) throw new StoreError("출시용 키에 권한이 없어요. App Store Connect 에서 키 역할이 App Manager 인지 확인해 주세요");
  if (!res.ok) throw new StoreError(`App Store Connect 가 오류를 돌려줬어요 (${res.status} ${body.errors?.[0]?.detail ?? body.errors?.[0]?.title ?? ""})`.trim());
  return body;
}

export async function readIos(now = new Date()): Promise<IosRaw> {
  const token = releaseAscToken(now);
  const app = APPSTORE_APP_ID;
  const [versions, builds, subs] = await Promise.all([
    asc(`/apps/${app}/appStoreVersions?filter[platform]=IOS&limit=6&include=build,appStoreVersionPhasedRelease&fields[appStoreVersions]=versionString,appVersionState,releaseType,createdDate,earliestReleaseDate,build,appStoreVersionPhasedRelease&fields[builds]=version,processingState,uploadedDate&fields[appStoreVersionPhasedReleases]=phasedReleaseState,currentDayNumber,startDate`, token),
    asc(`/builds?filter[app]=${app}&sort=-uploadedDate&limit=1&include=preReleaseVersion&fields[builds]=version,processingState,uploadedDate,preReleaseVersion&fields[preReleaseVersions]=version`, token),
    asc(`/reviewSubmissions?filter[app]=${app}&filter[platform]=IOS&limit=5&fields[reviewSubmissions]=state,submittedDate,items&include=items&fields[reviewSubmissionItems]=appStoreVersion`, token),
  ]);
  const inc = new Map((versions.included ?? []).map((i) => [`${i.type}:${i.id}`, i.attributes ?? {}]));
  const toBuild = (id: string, a: Record<string, unknown> | undefined, version?: string): IosBuild | null =>
    a ? { id, number: String(a.version ?? ""), state: String(a.processingState ?? ""), uploadedAt: String(a.uploadedDate ?? ""), ...(version ? { version } : {}) } : null;

  const list: IosVersion[] = (versions.data ?? []).map((d) => {
    const a = d.attributes ?? {};
    const b = d.relationships?.build?.data;
    const p = d.relationships?.appStoreVersionPhasedRelease?.data;
    const pa = p ? inc.get(`${p.type}:${p.id}`) : undefined;
    return {
      id: d.id,
      version: String(a.versionString ?? ""),
      state: String(a.appVersionState ?? ""),
      createdAt: iso(a.createdDate),
      releaseType: a.releaseType ? String(a.releaseType) : null,
      earliestReleaseDate: a.earliestReleaseDate ? iso(a.earliestReleaseDate) : null,
      build: b ? toBuild(b.id, inc.get(`${b.type}:${b.id}`)) : null,
      phased: p && pa ? { id: p.id, state: String(pa.phasedReleaseState ?? ""), day: Number(pa.currentDayNumber ?? 0), startDate: pa.startDate ? iso(pa.startDate) : null } : null,
    };
  });
  // 버전 칸은 만든 순서로(새 것 먼저). 애플 응답 순서에 기대지 않는다
  list.sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1));

  const latest = builds.data?.[0];
  const pre = latest?.relationships?.preReleaseVersion?.data;
  const preVersion = pre ? builds.included?.find((i) => i.id === pre.id)?.attributes?.version : undefined;
  const latestBuild = latest ? toBuild(latest.id, { ...latest.attributes, uploadedDate: iso(latest.attributes?.uploadedDate) }, preVersion ? String(preVersion) : undefined) : null;

  const submissions = (subs.data ?? [])
    .map((d) => {
      // 제출 묶음에 든 버전(취소, 출시할 때 어느 묶음인지 알아야 한다)
      const itemIds = new Set((d.relationships?.items as { data?: { id: string }[] } | undefined)?.data?.map((x) => x.id) ?? []);
      const item = subs.included?.find((i) => i.type === "reviewSubmissionItems" && itemIds.has(i.id)) as { relationships?: { appStoreVersion?: { data?: { id: string } | null } } } | undefined;
      return { id: d.id, state: String(d.attributes?.state ?? ""), submittedAt: d.attributes?.submittedDate ? iso(d.attributes.submittedDate) : null, versionId: item?.relationships?.appStoreVersion?.data?.id ?? null };
    })
    .sort((x, y) => ((x.submittedAt ?? "") < (y.submittedAt ?? "") ? 1 : -1));

  return { versions: list.map((v) => ({ ...v, build: v.build ? { ...v.build, uploadedAt: iso(v.build.uploadedAt) } : null })), latestBuild, submissions };
}

/** 애플은 "2026-11-03T00:49:26-08:00" 처럼 미국 서부 시각으로 준다. UTC ISO 로 맞춰 비교와 표시를 쉽게 한다 */
function iso(v: unknown): string {
  const d = new Date(String(v ?? ""));
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

// ---------- Android ----------

export const PLAY_API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PLAY_PACKAGE}`;
const LANGS: { language: string; hl: string; gl: string }[] = [
  { language: "en-US", hl: "en", gl: "US" },
  { language: "ko-KR", hl: "ko", gl: "KR" },
  { language: "ja-JP", hl: "ja", gl: "JP" },
];

export async function play(url: string, token: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, ...(init.body ? { "Content-Type": "application/json" } : {}) };
  const res = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(TIMEOUT), cache: "no-store" });
  const text = await res.text();
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  const message = (body.error as { message?: string } | undefined)?.message ?? "";
  // 출시 목록 읽기는 문서에 없는 따로 된 한도가 있다(403 "Listing releases quota exceeded", 2026-11-08). 권한 문제와 구별한다
  if (/quota/i.test(message)) throw new QuotaError("구글이 출시 목록을 너무 자주 읽었다고 잠시 막았어요. 몇 분 뒤 다시 읽어요");
  if (res.status === 401 || res.status === 403) throw new StoreError("Play 가 출시용 서비스 계정을 받지 않아요. Play Console 사용자 목록에 admin-release 계정이 경찰과 도둑 앱 권한으로 있는지 확인해 주세요");
  if (!res.ok) throw new StoreError(`Play 가 오류를 돌려줬어요 (${res.status} ${message})`.trim());
  return body;
}

type TrackRelease = { name?: string; versionCodes?: string[]; status?: string; userFraction?: number; releaseNotes?: { language: string; text: string }[] };

/** 출시용 Play 서비스 계정 토큰 */
export async function playToken(): Promise<string> {
  try {
    return await serviceAccountToken(serviceAccountFromEnv("PLAY_RELEASE_SERVICE_ACCOUNT_JSON"), "https://www.googleapis.com/auth/androidpublisher");
  } catch (e) {
    const missing = e instanceof Error && /환경변수가 없어요/.test(e.message);
    throw new StoreError(missing ? "출시용 Play 키가 없어요. Vercel 에 PLAY_RELEASE_SERVICE_ACCOUNT_JSON 을 넣어 주세요" : "출시용 Play 키로 로그인하지 못했어요. Vercel 의 PLAY_RELEASE_SERVICE_ACCOUNT_JSON 에 JSON 파일 내용 전체를 넣었는지 확인해 주세요");
  }
}

/** 출시용 App Store 키 토큰 */
export function releaseAscToken(now = new Date()): string {
  const key = releaseAscKey();
  if (!key.keyId || !key.pem || !key.issuer) throw new StoreError("출시용 App Store 키가 없어요. Vercel 에 ASC_RELEASE_KEY_ID, ASC_RELEASE_PRIVATE_KEY 를 넣어 주세요");
  try {
    return ascToken(now, key);
  } catch {
    throw new StoreError("출시용 App Store 키(.p8)를 읽지 못했어요. Vercel 의 ASC_RELEASE_PRIVATE_KEY 에 파일 내용 전체를 넣었는지 확인해 주세요");
  }
}

type ListedRelease = { releaseName?: string; activeArtifacts?: { versionCode?: number }[]; releaseLifecycleState?: string };

/**
 * 출시 목록(심사 상태가 들어 있다)은 서버마다 마지막으로 읽은 값을 둔다.
 * 구글이 이 호출에만 따로 한도를 걸어 1분마다 읽으면 막힌다. 심사 상태는 분 단위로 바뀌지 않으니 5분에 한 번만 새로 읽고,
 * 막히면 마지막 값을 쓴다(언제 값인지 함께 돌려 화면이 "N분 전 값"이라고 말한다). 출시 조작은 fresh 로 늘 새로 읽고, 막히면 하지 않는다
 */
const LIST_MAX_AGE = 5 * 60_000;
const lastLists = new Map<string, { at: number; data: ListedRelease[] }>();

async function listReleases(track: string, token: string, fresh: boolean): Promise<{ data: ListedRelease[]; at: number }> {
  const last = lastLists.get(track);
  if (!fresh && last && Date.now() - last.at < LIST_MAX_AGE) return last;
  try {
    const data = ((await play(`${PLAY_API}/tracks/${track}/releases`, token)).releases ?? []) as ListedRelease[];
    const got = { data, at: Date.now() };
    lastLists.set(track, got);
    return got;
  } catch (e) {
    if (!fresh && last && e instanceof QuotaError) return last;
    throw e;
  }
}

export async function readAndroid(opts: { fresh?: boolean } = {}): Promise<AndroidRaw> {
  const token = await playToken();
  const fresh = opts.fresh === true;
  const [prodList, internalList, edit] = await Promise.all([listReleases("production", token, fresh), listReleases("internal", token, fresh), readEdit(token)]);
  const production = prodList.data;
  const internal = internalList.data;
  const listedAt = new Date(Math.min(prodList.at, internalList.at)).toISOString();

  const merge = (rels: ListedRelease[], track: string): PlayRelease[] =>
    rels.map((r) => {
      const codes = (r.activeArtifacts ?? []).map((a) => Number(a.versionCode)).filter(Number.isFinite);
      const t = edit.tracks.get(track)?.find((x) => (x.versionCodes ?? []).some((c) => codes.includes(Number(c))));
      return {
        name: r.releaseName ?? "",
        codes,
        lifecycle: (r.releaseLifecycleState ?? "").replace(/^RELEASE_LIFECYCLE_STATE_/, ""),
        ...(t?.status ? { status: t.status } : {}),
        ...(typeof t?.userFraction === "number" ? { fraction: t.userFraction } : {}),
        ...(t?.releaseNotes?.length ? { notes: t.releaseNotes } : {}),
      };
    });

  const live = await Promise.all(LANGS.map((l) => liveTitle(l.hl, l.gl)));
  const listing = LANGS.flatMap((l, i) => {
    const approved = edit.titles.get(l.language);
    return approved ? [{ language: l.language, approved, live: live[i] }] : [];
  });
  return { production: merge(production, "production"), internal: merge(internal, "internal"), listing, listedAt };
}

/** 편집을 열어 트랙(단계적 출시 비율)과 승인된 스토어 이름을 읽고, 커밋하지 않고 지운다 */
async function readEdit(token: string): Promise<{ tracks: Map<string, TrackRelease[]>; titles: Map<string, string> }> {
  const edit = (await play(`${PLAY_API}/edits`, token, { method: "POST" })) as { id?: string };
  if (!edit.id) throw new StoreError("Play 편집을 열지 못했어요");
  try {
    const [tracks, listings] = await Promise.all([play(`${PLAY_API}/edits/${edit.id}/tracks`, token), play(`${PLAY_API}/edits/${edit.id}/listings`, token)]);
    return {
      tracks: new Map(((tracks.tracks ?? []) as { track: string; releases?: TrackRelease[] }[]).map((t) => [t.track, t.releases ?? []])),
      titles: new Map(((listings.listings ?? []) as { language: string; title?: string }[]).map((l) => [l.language, l.title ?? ""])),
    };
  } finally {
    // 지우지 못해도 커밋하지 않은 편집은 스토어에 영향이 없고 구글이 알아서 치운다
    await fetch(`${PLAY_API}/edits/${edit.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIMEOUT) }).catch(() => undefined);
  }
}

/** Play 스토어 페이지에 지금 보이는 앱 이름. 못 읽으면 null(다르다고 판단하지 않는다) */
export async function liveTitle(hl: string, gl: string): Promise<string | null> {
  try {
    const res = await fetch(`https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}&hl=${hl}&gl=${gl}`, { signal: AbortSignal.timeout(TIMEOUT), cache: "no-store" });
    if (!res.ok) return null;
    return parsePlayTitle(await res.text());
  } catch {
    return null;
  }
}

/** "<title ...>경찰과도둑 - Google Play 앱</title>" → 경찰과도둑. 뒤의 " - Google Play ..." 만 뗀다 */
export function parsePlayTitle(html: string): string | null {
  const t = html.match(/<title[^>]*>([^<]*)<\/title>/)?.[1];
  if (!t) return null;
  const decoded = t.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  const i = decoded.lastIndexOf(" - ");
  return (i > 0 ? decoded.slice(0, i) : decoded).trim() || null;
}

// ---------- 나라별 반영, 지난 출시 ----------

/** 나라마다 App Store 에 보이는 버전. 그 나라에서 팔지 않으면 null. de 는 EU 판매 확인용 */
export async function readLookup(): Promise<Record<string, string | null> | null> {
  const countries = ["kr", "jp", "us", "au", "gb", "de"];
  try {
    const rows = await Promise.all(
      countries.map(async (c) => {
        const res = await fetch(`https://itunes.apple.com/lookup?id=${APPSTORE_APP_ID}&country=${c}`, { signal: AbortSignal.timeout(TIMEOUT), cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const j = (await res.json()) as { results?: { version?: string }[] };
        return [c, j.results?.[0]?.version ?? null] as const;
      }),
    );
    return Object.fromEntries(rows);
  } catch {
    return null;
  }
}

/** 지표 일정의 "iOS 3.2.7 출시", "Android 3.2.7 출시"를 버전마다 묶는다. 새 버전 먼저 */
export function historyFrom(rows: { day: string; label: string }[], limit = 6): HistoryItem[] {
  const map = new Map<string, HistoryItem>();
  for (const r of rows) {
    const m = r.label.match(/^(iOS|Android) (\d+(?:\.\d+)+) 출시$/);
    if (!m) continue;
    const item = map.get(m[2]) ?? { version: m[2] };
    const key = m[1] === "iOS" ? "ios" : "android";
    if (!item[key] || r.day < item[key]) item[key] = r.day;
    map.set(m[2], item);
  }
  const num = (v: string) => v.split(".").map((n) => n.padStart(4, "0")).join(".");
  return [...map.values()].sort((a, b) => (num(a.version) < num(b.version) ? 1 : -1)).slice(0, limit);
}
