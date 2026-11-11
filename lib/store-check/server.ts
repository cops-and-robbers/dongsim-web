/**
 * 어드민 스토어 점검의 읽기와 체크 저장 (docs/admin-ui.md "스토어 점검"). 서버 전용이다. 스토어에는 쓰지 않는다.
 * 스토어 문구와 이미지는 스토어 페이지가 읽어 둔 값을 같이 쓴다.
 */
import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "@/lib/metrics/db";
import { APPSTORE_APP_ID, PLAY_PACKAGE } from "@/lib/metrics/config";
import { serviceAccountFromEnv, serviceAccountToken } from "@/lib/metrics/google";
import { consoleLinks } from "@/lib/release/links";
import { NotCached, unwrapNotCached } from "@/lib/release/reliable";
import { asc, releaseAscToken, StoreError } from "@/lib/release/stores";
import { stateOf } from "@/lib/reviews/model";
import { allReviews } from "@/lib/reviews/server";
import { LANGS, LINKS, type Values } from "@/lib/store-page/fields";
import { storePage } from "@/lib/store-page/server";
import { manualChecks, playChecks, reviewCheck, sortChecks, territoryChecks, versionChecks, type Check, type Link, type Manual, type NextVersion, type StoreCheck, type Territory } from "./model";

const TABLE = "store_check_done";
const TAG = "store-check";

// API 로 읽을 수 없는 일. 기한과 내용은 각 스토어 공식 안내에서 2026-11-08 에 확인했다
const MANUAL: Manual[] = [
  { id: "apple-license", store: "ios", title: "애플 개발자 프로그램 약관에 동의해 주세요", detail: "계정 소유자만 할 수 있어요. 동의하기 전에는 새 버전을 심사에 낼 수 없어요.", link: { href: "https://developer.apple.com/account", label: "Apple Developer 열기", external: true } },
  { id: "play-target-api", store: "android", title: "앱이 Android 16(API 36)을 타깃하는지 확인해 주세요", detail: "앱 업데이트에 필요해요. 연장 기한까지 지났어요. 이미 맞췄다면 끝냈다고 표시해 주세요.", due: "2026-11-01", link: { href: "https://support.google.com/googleplay/android-developer/answer/11926878", label: "공식 안내", external: true } },
  { id: "play-trader", store: "android", title: "Google Play 판매자 상태를 신고해 주세요", detail: "콘솔의 판매자 상태 선언에서 해요. 기한을 넘기면 업데이트가 막히거나 앱이 내려갈 수 있어요.", due: "2027-02-01", link: { href: consoleLinks().playPublishing, label: "Play Console 열기", external: true } },
  { id: "iphone-duo", store: "ios", title: "iPhone Duo 스크린샷을 준비해 주세요", detail: "2027년 4월부터 필요해요.", due: "2027-04-01", link: { href: LINKS.appleShots, label: "공식 안내", external: true } },
];

type Row = { id: string; attributes?: Record<string, unknown>; relationships?: Record<string, { data?: { id: string } | null }> };
type Extra = { territories: Territory[] | null; version: { version: string; build: string | null; hasReviewContact: boolean } | null; crashRate: number | null; anrRate: number | null; anomalies: number; playRead: boolean };

/** 영역별 판매 여부. 이 자원은 v2 경로에만 있다 */
async function readTerritories(token: string): Promise<Territory[]> {
  const res = await asc(`/../v2/appAvailabilities/${APPSTORE_APP_ID}/territoryAvailabilities?limit=200&fields[territoryAvailabilities]=available,contentStatuses`, token);
  return (res.data ?? []).map((r) => ({
    // 나라 코드는 id 안에 base64 로 들어 있다
    code: (JSON.parse(Buffer.from(r.id, "base64url").toString()) as { t: string }).t,
    available: r.attributes?.available === true,
    statuses: (r.attributes?.contentStatuses ?? []) as string[],
  }));
}

async function readVersion(token: string): Promise<Extra["version"]> {
  const res = await asc(`/apps/${APPSTORE_APP_ID}/appStoreVersions?filter[platform]=IOS&limit=6&include=build,appStoreReviewDetail&fields[appStoreVersions]=versionString,appVersionState,build,appStoreReviewDetail&fields[builds]=version&fields[appStoreReviewDetails]=contactFirstName,contactLastName,contactPhone,contactEmail`, token);
  const next = (res.data as Row[] | undefined)?.find((v) => ["PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED", "INVALID_BINARY"].includes(String(v.attributes?.appVersionState)));
  if (!next) return null;
  const find = (rel: string) => res.included?.find((i) => i.id === next.relationships?.[rel]?.data?.id)?.attributes;
  const contact = find("appStoreReviewDetail");
  return { version: String(next.attributes?.versionString), build: (find("build")?.version as string | undefined) ?? null, hasReviewContact: !!contact && ["contactFirstName", "contactLastName", "contactPhone", "contactEmail"].every((k) => !!contact[k]) };
}

const REPORTING = `https://playdeveloperreporting.googleapis.com/v1beta1/apps/${PLAY_PACKAGE}`;

/** 체감 비정상 종료율, 응답 없음 비율의 최근 28일 값. 사용자가 적으면 구글이 줄을 주지 않아 null 이다 */
async function readVitals(token: string): Promise<Pick<Extra, "crashRate" | "anrRate" | "anomalies">> {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const get = async (path: string, init?: RequestInit) => {
    const res = await fetch(`${REPORTING}${path}`, { ...init, headers, signal: AbortSignal.timeout(15_000), cache: "no-store" });
    if (!res.ok) throw new StoreError("Google Play 상태를 읽지 못했어요.", { detail: `Reporting ${res.status} ${path}` });
    return (await res.json()) as Record<string, never>;
  };
  const rate = async (set: string, metric: string): Promise<number | null> => {
    const info = (await get(`/${set}`)) as unknown as { freshnessInfo?: { freshnesses?: { aggregationPeriod: string; latestEndTime: { year: number; month: number; day: number } }[] } };
    const d = info.freshnessInfo?.freshnesses?.find((f) => f.aggregationPeriod === "DAILY")?.latestEndTime;
    if (!d) return null;
    const end = new Date(Date.UTC(d.year, d.month - 1, d.day));
    const start = new Date(end.getTime() - 86_400_000);
    const at = (x: Date) => ({ year: x.getUTCFullYear(), month: x.getUTCMonth() + 1, day: x.getUTCDate(), timeZone: { id: "America/Los_Angeles" } });
    const out = (await get(`/${set}:query`, { method: "POST", body: JSON.stringify({ timelineSpec: { aggregationPeriod: "DAILY", startTime: at(start), endTime: at(end) }, metrics: [metric] }) })) as unknown as { rows?: { metrics?: { metric: string; decimalValue?: { value?: string } }[] }[] };
    const value = out.rows?.at(-1)?.metrics?.find((m) => m.metric === metric)?.decimalValue?.value;
    return value === undefined ? null : Number(value);
  };
  const [crashRate, anrRate, anomalies] = await Promise.all([rate("crashRateMetricSet", "userPerceivedCrashRate28dUserWeighted"), rate("anrRateMetricSet", "userPerceivedAnrRate28dUserWeighted"), get("/anomalies?pageSize=50") as unknown as Promise<{ anomalies?: unknown[] }>]);
  return { crashRate, anrRate, anomalies: anomalies.anomalies?.length ?? 0 };
}

const logged = (where: string) => (e: unknown) => {
  console.error(`[store-check] ${where}`, e instanceof StoreError ? (e.detail ?? e.message) : e instanceof Error ? e.message : e);
  return null;
};

async function readExtra(): Promise<Extra> {
  const token = releaseAscToken();
  const play = serviceAccountToken(serviceAccountFromEnv("PLAY_RELEASE_SERVICE_ACCOUNT_JSON"), "https://www.googleapis.com/auth/playdeveloperreporting").then(readVitals);
  const [territories, version, vitals] = await Promise.all([readTerritories(token).catch(logged("판매 나라")), readVersion(token).catch(logged("다음 버전")), play.catch(logged("안정성"))]);
  return { territories, version, crashRate: vitals?.crashRate ?? null, anrRate: vitals?.anrRate ?? null, anomalies: vitals?.anomalies ?? 0, playRead: vitals !== null };
}

// 자주 바뀌지 않아 5분은 같은 값을 쓴다. 일부를 못 읽은 결과는 남기지 않는다
const cachedExtra = unstable_cache(
  async () => {
    const extra = await readExtra();
    if (!extra.territories || !extra.playRead) throw new NotCached(extra);
    return extra;
  },
  ["store-check-v1"],
  { tags: [TAG], revalidate: 300 },
);

export const refreshStoreCheck = () => revalidateTag(TAG, { expire: 0 });

// 개요 카드가 쓴다. 28일 값이라 한 시간 같은 값을 써도 된다. 못 읽으면 남기지 않는다
const cachedVitals = unstable_cache(
  () => serviceAccountToken(serviceAccountFromEnv("PLAY_RELEASE_SERVICE_ACCOUNT_JSON"), "https://www.googleapis.com/auth/playdeveloperreporting").then(readVitals),
  ["overview-vitals-v1"],
  { revalidate: 3600 },
);
export const playVitals = () => cachedVitals();

async function readDone(): Promise<Map<string, { doneBy: string; doneAt: string }> | null> {
  try {
    const { data, error } = await db().from(TABLE).select("id,done_by,done_at");
    if (error) throw new Error(error.message);
    return new Map((data ?? []).map((r) => [r.id as string, { doneBy: r.done_by as string, doneAt: r.done_at as string }]));
  } catch (e) {
    console.error("[store-check] 체크", e instanceof Error ? e.message : e);
    return null;
  }
}

/** 개요 카드가 쓴다. API 로 읽을 수 없는 일의 기한과 끝냈는지 */
export async function manualDeadlines(now = new Date()): Promise<Check[]> {
  return manualChecks(MANUAL, (await readDone()) ?? new Map(), now);
}

const cantRead = (id: string, store: Check["store"], name: string): Check => ({ id, store, level: "watch", title: `${name}을 지금 읽지 못했어요`, detail: "잠시 뒤 다시 확인해 주세요." });

const differs = (live: Values, pending: Values) => Object.keys(pending).filter((k) => k !== "whatsNew" && (pending[k as keyof Values] ?? "") !== (live[k as keyof Values] ?? "")).length;

export async function storeCheck(now = new Date()): Promise<StoreCheck> {
  const [page, extra, done, reviews] = await Promise.all([storePage(), unwrapNotCached<Extra>(cachedExtra), readDone(), allReviews()]);
  const c = consoleLinks();
  const consoleLink: Link = { href: c.iosInflight, label: "App Store Connect 열기", external: true };
  const pageLink: Link = { href: "/admin/store-page", label: "스토어 페이지 열기" };
  const draftsOf = (p: "ios" | "android") => page.drafts.filter((d) => d.platform === p).length + page.imageDrafts.filter((d) => d.platform === p).length;

  const checks: Check[] = [];
  checks.push(...(extra.territories ? territoryChecks(extra.territories, { href: `https://appstoreconnect.apple.com/apps/${APPSTORE_APP_ID}/distribution/info`, label: "App Store Connect 열기", external: true }) : [cantRead("ios-eu", "ios", "App Store 판매 나라")]));

  if (!page.ios.ok) checks.push(cantRead("ios-next", "ios", "App Store 문구"));
  else {
    const ios = page.ios;
    const next: NextVersion | null = extra.version && {
      ...extra.version,
      emptyWhatsNew: LANGS.filter((l) => !ios.langs[l.id].pending?.whatsNew?.trim()).map((l) => l.id),
      noScreenshots: LANGS.filter((l) => !ios.images[l.id].iphone?.length).map((l) => l.id),
      changedFields: LANGS.reduce((n, l) => n + (ios.langs[l.id].pending ? differs(ios.langs[l.id].live, ios.langs[l.id].pending!) : 0), 0),
      drafts: draftsOf("ios"),
    };
    checks.push(...versionChecks(next, { console: consoleLink, page: pageLink }));
  }

  const pendingLangs = page.android.ok ? LANGS.filter((l) => page.android.ok && page.android.langs[l.id].pending).map((l) => l.id) : [];
  checks.push(...playChecks({ pendingLangs, drafts: draftsOf("android"), crashRate: extra.crashRate, anrRate: extra.anrRate, anomalies: extra.anomalies }, { publishing: { href: c.playPublishing, label: "게시 개요 열기", external: true }, page: pageLink, vitals: { href: c.playPublishing.replace("/publishing", "/app-dashboard"), label: "Play Console 열기", external: true } }));
  if (!extra.playRead) checks.push(cantRead("play-vitals", "android", "Google Play 안정성"));

  checks.push(...reviewCheck((reviews ?? []).filter((r) => r.rating <= 3 && stateOf(r) === "waiting").length));
  checks.push(...manualChecks(MANUAL, done ?? new Map(), now));

  const production = process.env.VERCEL_ENV === "production";
  const writable = production && done !== null;
  return { checks: sortChecks(checks), readAt: now.toISOString(), writable, readOnlyReason: writable ? undefined : production ? "끝냈다는 표시를 저장할 표가 아직 없어요. 개발 담당자에게 알려 주세요." : "끝냈다는 표시는 운영 어드민에서만 저장돼요." };
}

export const isManual = (id: string) => MANUAL.some((m) => m.id === id);

export async function setDone(id: string, done: boolean, actor: string): Promise<void> {
  const { error } = done ? await db().from(TABLE).upsert({ id, done_by: actor, done_at: new Date().toISOString() }) : await db().from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
