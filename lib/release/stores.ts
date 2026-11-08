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
import { db } from "../metrics/db.ts";
import { productionRelease } from "../metrics/play/releases.ts";
import type { AndroidRaw, HistoryItem, IosBuild, IosRaw, IosVersion, PlayRelease } from "./board.ts";

const TIMEOUT = 15_000;

/** 운영진에게 보여 줄 말이 message 다. 키 이름, 오류 코드 같은 개발자용 내용은 detail 에 담아 서버 기록에만 남긴다 */
export class StoreError extends Error {
  readonly detail?: string;
  readonly status?: number;
  constructor(message: string, opts: { detail?: string; status?: number } = {}) {
    super(message);
    this.detail = opts.detail;
    this.status = opts.status;
  }
}
/** 키나 권한처럼 운영진이 고칠 수 없는 문제 */
const NEED_DEV = "스토어 연결에 문제가 있어요. 개발 담당자에게 알려 주세요.";
const TRY_LATER = "지금은 상태를 가져오지 못했어요. 잠시 뒤 다시 확인해 주세요.";
/** 구글이 읽는 횟수를 막았을 때 */
export class QuotaError extends StoreError {}

// ---------- iOS ----------

export const releaseAscKey = () => ({ issuer: process.env.ASC_ISSUER_ID, keyId: process.env.ASC_RELEASE_KEY_ID, pem: process.env.ASC_RELEASE_PRIVATE_KEY });

type JsonApi = { data?: { id: string; type: string; attributes?: Record<string, unknown>; relationships?: Record<string, { data?: { id: string; type: string } | null }> }[]; included?: { id: string; type: string; attributes?: Record<string, unknown> }[]; errors?: { detail?: string; title?: string }[] };

export async function asc(path: string, token: string): Promise<JsonApi> {
  const res = await fetch(`${ASC_API}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIMEOUT), cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as JsonApi;
  if (res.status === 401) throw new StoreError(NEED_DEV, { detail: "ASC 401: 출시용 키가 폐기됐거나 ASC_RELEASE_* 값이 틀림", status: 401 });
  if (res.status === 403) throw new StoreError(NEED_DEV, { detail: "ASC 403: 출시용 키 역할이 App Manager 가 아님", status: 403 });
  if (!res.ok) throw new StoreError(TRY_LATER, { detail: `ASC ${res.status} ${body.errors?.[0]?.detail ?? body.errors?.[0]?.title ?? ""}`, status: res.status });
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
  if (/quota/i.test(message)) throw new QuotaError(TRY_LATER, { detail: `Play 한도: ${message}`, status: res.status });
  if (res.status === 401 || res.status === 403) throw new StoreError(NEED_DEV, { detail: `Play ${res.status}: admin-release 권한 확인. ${message}`, status: res.status });
  if (!res.ok) throw new StoreError(init.method && init.method !== "GET" ? `Google Play 가 받지 않았어요. ${message}`.trim() : TRY_LATER, { detail: `Play ${res.status} ${message}`, status: res.status });
  return body;
}

type TrackRelease = { name?: string; versionCodes?: string[]; status?: string; userFraction?: number; releaseNotes?: { language: string; text: string }[] };

/** 출시용 Play 서비스 계정 토큰 */
export async function playToken(): Promise<string> {
  try {
    return await serviceAccountToken(serviceAccountFromEnv("PLAY_RELEASE_SERVICE_ACCOUNT_JSON"), "https://www.googleapis.com/auth/androidpublisher");
  } catch (e) {
    const missing = e instanceof Error && /환경변수가 없어요/.test(e.message);
    throw new StoreError(NEED_DEV, { detail: missing ? "PLAY_RELEASE_SERVICE_ACCOUNT_JSON 없음" : "PLAY_RELEASE_SERVICE_ACCOUNT_JSON 을 읽지 못함" });
  }
}

/** 출시용 App Store 키 토큰 */
export function releaseAscToken(now = new Date()): string {
  const key = releaseAscKey();
  if (!key.keyId || !key.pem || !key.issuer) throw new StoreError(NEED_DEV, { detail: "ASC_RELEASE_KEY_ID, ASC_RELEASE_PRIVATE_KEY 없음" });
  try {
    return ascToken(now, key);
  } catch {
    throw new StoreError(NEED_DEV, { detail: "ASC_RELEASE_PRIVATE_KEY(.p8)를 읽지 못함" });
  }
}

type ListedRelease = { releaseName?: string; activeArtifacts?: { versionCode?: number }[]; releaseLifecycleState?: string };

/**
 * 출시 목록(심사 상태가 들어 있다)은 구글이 이 호출에만 문서에 없는 짧은 한도를 건다(2026-11-08, 403 "Listing releases quota exceeded").
 * 서버 메모리에만 두면 Vercel 은 요청마다 다른 서버가 받아 소용이 없었다. 그래서 마지막으로 읽은 두 트랙 목록을
 * Supabase site_settings(key = play_release_lists)에 두고, 모든 서버가 그것을 본다.
 * - 5분 안에 읽은 값이 있으면 구글을 부르지 않는다(전체에서 5분에 한 번)
 * - 구글이 막으면 저장된 값을 쓰고, 화면은 "N분 전 값"이라고 말한다
 * 출시 조작은 이 목록 대신 편집(edit)의 트랙으로 지금 상태를 한 번 더 확인한다(actions.ts). 편집은 이 한도와 상관없다
 */
const LIST_MAX_AGE = 5 * 60_000;
/** 막히면 모든 서버가 이만큼 구글을 부르지 않는다. 막힌 채 계속 부르면 막힌 시간이 길어질 수 있다 */
const BLOCK_BACKOFF = 10 * 60_000;
const LISTS_KEY = "play_release_lists";
/** at 이 0 이면 아직 한 번도 읽지 못한 것. blockedUntil 까지는 구글을 부르지 않는다 */
type Lists = { at: number; production: ListedRelease[]; internal: ListedRelease[]; blockedUntil?: number };
let mem: { value: Lists; readAt: number } | null = null;

async function storedLists(): Promise<Lists | null> {
  // 같은 서버에서 30초 안에는 저장소도 다시 읽지 않는다
  if (mem && Date.now() - mem.readAt < 30_000) return mem.value;
  try {
    const { data } = await db().from("site_settings").select("value").eq("key", LISTS_KEY).maybeSingle();
    const v = data?.value as Lists | undefined;
    if (v && typeof v.at === "number" && Array.isArray(v.production) && Array.isArray(v.internal)) mem = { value: v, readAt: Date.now() };
  } catch {
    // 저장소를 못 읽어도 구글에서 읽으면 된다
  }
  return mem?.value ?? null;
}

async function saveLists(v: Lists): Promise<void> {
  mem = { value: v, readAt: Date.now() };
  try {
    await db().from("site_settings").upsert({ key: LISTS_KEY, value: v, updated_by: "출시 보드", updated_at: new Date().toISOString() });
  } catch {
    // 못 남겨도 이번 값은 쓴다
  }
}

/** 지금 구글을 불러도 되는지와, 쓸 수 있는 저장된 값. 순수 함수라 테스트한다 */
export function listPlan(stored: Lists | null, now: number): "use-stored" | "blocked" | "fetch" {
  const hasData = !!stored && stored.at > 0;
  if (hasData && now - stored!.at < LIST_MAX_AGE) return "use-stored";
  if (stored?.blockedUntil && now < stored.blockedUntil) return hasData ? "use-stored" : "blocked";
  return "fetch";
}

async function listReleases(token: string): Promise<Lists> {
  const stored = await storedLists();
  const plan = listPlan(stored, Date.now());
  if (plan === "use-stored") return stored!;
  if (plan === "blocked") throw new QuotaError(TRY_LATER, { detail: "Play 출시 목록 한도로 쉬는 중" });
  try {
    const get = async (track: string) => ((await play(`${PLAY_API}/tracks/${track}/releases`, token)).releases ?? []) as ListedRelease[];
    const production = await get("production");
    const internal = await get("internal");
    const got: Lists = { at: Date.now(), production, internal };
    await saveLists(got);
    return got;
  } catch (e) {
    if (e instanceof QuotaError) {
      // 막혔다고 적어 두면 모든 서버가 잠시 쉰다
      await saveLists({ ...(stored ?? { at: 0, production: [], internal: [] }), blockedUntil: Date.now() + BLOCK_BACKOFF });
      if (stored && stored.at > 0) return stored;
    }
    throw e;
  }
}

/** 사용자에게 실제로 나가 있는 프로덕션 빌드(Reporting API). 못 읽으면 null */
async function readServing(): Promise<number | null> {
  try {
    const token = await serviceAccountToken(serviceAccountFromEnv("PLAY_RELEASE_SERVICE_ACCOUNT_JSON"), "https://www.googleapis.com/auth/playdeveloperreporting");
    const res = await fetch(`https://playdeveloperreporting.googleapis.com/v1beta1/apps/${PLAY_PACKAGE}:fetchReleaseFilterOptions`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIMEOUT), cache: "no-store" });
    if (!res.ok) return null;
    const current = productionRelease((await res.json()) as Parameters<typeof productionRelease>[0]);
    return current ? Number(current.code) : null;
  } catch {
    return null;
  }
}

const codesOf = (r: TrackRelease) => (r.versionCodes ?? []).map(Number).filter(Number.isFinite);

/** 심사 단계를 알아야 하는지: 올라간 출시가 나가 있는 빌드보다 새로울 때만(또는 나가 있는 빌드를 못 읽었을 때) */
export function needsReviewList(production: TrackRelease[], serving: number | null): boolean {
  if (serving === null) return true;
  return production.some((r) => r.status !== "draft" && r.status !== "halted" && Math.max(0, ...codesOf(r)) > serving);
}

/**
 * 편집의 트랙(올라간 빌드)과 나가 있는 빌드로 상태를 정한다. 심사 단계는 출시 목록에만 있어, 목록에 없으면 PENDING_UNKNOWN(아직 안 나감, 단계는 모름)이다.
 * 2026-11-08 기준 심사 중인 출시가 없어 편집에 어떻게 보이는지는 실제로 보지 못했다. 첫 출시 때 콘솔과 대조한다
 */
export function mergeAndroid(tracks: Map<string, TrackRelease[]>, serving: number | null, listed: { production: ListedRelease[] } | null): Pick<AndroidRaw, "production" | "internal"> {
  const lifecycleOf = (code: number) => {
    const hit = listed?.production.find((r) => (r.activeArtifacts ?? []).some((a) => Number(a.versionCode) === code));
    return hit?.releaseLifecycleState?.replace(/^RELEASE_LIFECYCLE_STATE_/, "") ?? "PENDING_UNKNOWN";
  };
  const convert = (r: TrackRelease, lifecycle: string): PlayRelease => ({
    name: r.name ?? "",
    codes: codesOf(r),
    lifecycle,
    ...(r.status ? { status: r.status } : {}),
    ...(typeof r.userFraction === "number" ? { fraction: r.userFraction } : {}),
    ...(r.releaseNotes?.length ? { notes: r.releaseNotes } : {}),
  });
  const usable = (track: string) => (tracks.get(track) ?? []).filter((r) => codesOf(r).length > 0);
  return {
    production: usable("production").map((r) => {
      const code = Math.max(...codesOf(r));
      if (r.status === "draft") return convert(r, "DRAFT");
      if (r.status === "halted" || (serving !== null && code <= serving)) return convert(r, "PUBLISHED");
      return convert(r, lifecycleOf(code));
    }),
    internal: usable("internal").map((r) => convert(r, r.status === "draft" ? "DRAFT" : "PUBLISHED")),
  };
}

export async function readAndroid(): Promise<AndroidRaw> {
  const token = await playToken();
  const [edit, serving] = await Promise.all([readEdit(token), readServing()]);
  // 심사 단계가 담긴 출시 목록은 구글 한도가 빠듯해, 심사가 진행 중일 때만 읽는다
  let lists: Lists | null = null;
  if (needsReviewList(edit.tracks.get("production") ?? [], serving)) {
    try {
      lists = await listReleases(token);
    } catch (e) {
      // 나가 있는 빌드를 알면 막혀도 화면은 그린다(심사 단계만 모른다)
      if (!(e instanceof QuotaError) || serving === null) throw e;
    }
  }
  const merged = mergeAndroid(edit.tracks, serving, lists);

  const live = await Promise.all(LANGS.map((l) => liveTitle(l.hl, l.gl)));
  const listing = LANGS.flatMap((l, i) => {
    const approved = edit.titles.get(l.language);
    return approved ? [{ language: l.language, approved, live: live[i] }] : [];
  });
  return { ...merged, listing, ...(lists ? { listedAt: new Date(lists.at).toISOString() } : {}) };
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
