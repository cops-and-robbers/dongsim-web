/**
 * 스토어 페이지 화면이 두 스토어에서 읽는 문구 (docs/admin-ui.md "스토어 페이지"). 서버 전용이다.
 * 스토어에 아무것도 쓰지 않는다. Play 는 편집(edit)을 열어 읽고 커밋하지 않고 지운다.
 */
import { APPSTORE_APP_ID } from "../metrics/config.ts";
import { PLAY_PACKAGE } from "../metrics/config.ts";
import { asc, parsePlayTitle, play, playToken, PLAY_API, releaseAscToken } from "../release/stores.ts";
import { LANGS, type Art, type IosPage, type AndroidPage, type Lang, type Side, type Values } from "./fields.ts";

/** 아직 심사에 내지 않았거나 고칠 수 있는 버전 */
const IOS_EDITABLE = new Set(["PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED", "INVALID_BINARY"]);
const IOS_LIVE = "READY_FOR_DISTRIBUTION";
const IOS_LIVE_INFO = "READY_FOR_SALE";

type Row = { attributes?: Record<string, unknown> };
const text = (r: Row, k: string) => (r.attributes?.[k] as string | null | undefined) ?? "";
const byLocale = (rows: Row[] | undefined) => new Map((rows ?? []).map((r) => [text(r, "locale"), r]));

function emptyLangs(): Record<Lang, Side> {
  return { ko: { live: {}, pending: null }, en: { live: {}, pending: null }, ja: { live: {}, pending: null } };
}

const versionValues = (r: Row | undefined): Values =>
  r ? { description: text(r, "description"), keywords: text(r, "keywords"), promotionalText: text(r, "promotionalText"), whatsNew: text(r, "whatsNew") } : {};
const infoValues = (r: Row | undefined): Values => (r ? { name: text(r, "name"), subtitle: text(r, "subtitle") } : {});

export async function readIosPage(now = new Date()): Promise<IosPage> {
  const token = releaseAscToken(now);
  const app = APPSTORE_APP_ID;
  const [art, infos, versions] = await Promise.all([
    readArt(),
    asc(`/apps/${app}/appInfos?limit=5&fields[appInfos]=state`, token),
    asc(`/apps/${app}/appStoreVersions?filter[platform]=IOS&limit=6&fields[appStoreVersions]=versionString,appVersionState`, token),
  ]);
  const liveInfo = infos.data?.find((i) => i.attributes?.state === IOS_LIVE_INFO);
  const nextInfo = infos.data?.find((i) => i.attributes?.state !== IOS_LIVE_INFO);
  const liveVersion = versions.data?.find((v) => v.attributes?.appVersionState === IOS_LIVE);
  const nextVersion = versions.data?.find((v) => IOS_EDITABLE.has(String(v.attributes?.appVersionState)));
  const locs = (path: string) => asc(`${path}?limit=50`, token).then((r) => byLocale(r.data));
  const none = Promise.resolve(new Map<string, Row>());
  const [infoLive, infoNext, verLive, verNext] = await Promise.all([
    liveInfo ? locs(`/appInfos/${liveInfo.id}/appInfoLocalizations`) : none,
    nextInfo ? locs(`/appInfos/${nextInfo.id}/appInfoLocalizations`) : none,
    liveVersion ? locs(`/appStoreVersions/${liveVersion.id}/appStoreVersionLocalizations`) : none,
    nextVersion ? locs(`/appStoreVersions/${nextVersion.id}/appStoreVersionLocalizations`) : none,
  ]);
  const langs = emptyLangs();
  for (const l of LANGS) {
    const live = { ...infoValues(infoLive.get(l.ios)), ...versionValues(verLive.get(l.ios)) };
    const hasNext = nextVersion || nextInfo;
    langs[l.id] = {
      live,
      // 프로모션 문구는 버전과 상관없이 바로 바뀌는 칸이라 지금 값으로 본다
      pending: hasNext ? { ...infoValues(infoNext.get(l.ios) ?? infoLive.get(l.ios)), ...versionValues(verNext.get(l.ios) ?? verLive.get(l.ios)), promotionalText: live.promotionalText } : null,
    };
  }
  return { ok: true, langs, art, liveVersion: (liveVersion?.attributes?.versionString as string) ?? null, nextVersion: (nextVersion?.attributes?.versionString as string) ?? null };
}

type PlayListing = { language: string; title?: string; shortDescription?: string; fullDescription?: string; video?: string };

export async function readAndroidPage(): Promise<AndroidPage> {
  const token = await playToken();
  const edit = (await play(`${PLAY_API}/edits`, token, { method: "POST", body: "{}" })) as { id: string };
  let listings: PlayListing[];
  try {
    listings = ((await play(`${PLAY_API}/edits/${edit.id}/listings`, token)).listings ?? []) as PlayListing[];
  } finally {
    // 지우지 못해도 커밋하지 않은 편집은 스토어에 영향이 없다
    await play(`${PLAY_API}/edits/${edit.id}`, token, { method: "DELETE" }).catch(() => undefined);
  }
  const byLang = new Map(listings.map((l) => [l.language, l]));
  const shown = await Promise.all(LANGS.map((l) => readPlayPublic(l.hl, l.gl)));
  const langs = emptyLangs();
  LANGS.forEach((l, i) => {
    const row = byLang.get(l.android);
    const saved: Values = row ? { title: row.title ?? "", shortDescription: row.shortDescription ?? "", fullDescription: row.fullDescription ?? "", video: row.video ?? "" } : {};
    // 관리형 게시라 승인돼도 게시 전까지 스토어에는 옛 문구가 보인다. 이름과 자세한 설명은 공개 페이지와 견줄 수 있다
    const live: Values = { ...saved, title: shown[i]?.title || saved.title, fullDescription: shown[i]?.fullDescription || saved.fullDescription };
    const same = (a?: string, b?: string) => squash(a) === squash(b);
    langs[l.id] = same(live.title, saved.title) && same(live.fullDescription, saved.fullDescription) ? { live: saved, pending: null } : { live, pending: saved };
  });
  return { ok: true, langs, art: shown[0]?.art ?? NO_ART };
}

const squash = (s = "") => s.replace(/\s+/g, "");

const NO_ART: Art = { icon: null, screenshots: [], rating: null, ratingCount: null, age: null, developer: null, category: null, downloads: null };

const decode = (s: string) =>
  s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const srcOf = (tag: string) => tag.match(/\ssrc="([^"]+)"/)?.[1] ?? null;

/** Play 공개 페이지에서 지금 보이는 자세한 설명과 이미지. 페이지 모양이 바뀌면 빈 값이 되어 스토어에 저장된 값으로 대신한다 */
export function parsePlayPage(html: string): { title: string | null; fullDescription: string | null; art: Art } {
  const description = html.match(/data-g-id="description"[^>]*>([\s\S]*?)<\/div>/)?.[1];
  const icon = html.match(/<img[^>]+alt="아이콘 이미지"[^>]*>/)?.[0];
  const shots = [...html.matchAll(/<img[^>]+alt="스크린샷 이미지"[^>]*>/g)].map((m) => srcOf(m[0])).filter((s): s is string => !!s);
  const developer = html.match(/href="\/store\/apps\/dev[^"]*"[^>]*>(?:<span>)?([^<]+)/)?.[1] ?? null;
  const category = html.match(/href="\/store\/apps\/category\/[A-Z_]+"[^>]*aria-label="([^"]+)"/)?.[1] ?? html.match(/href="\/store\/apps\/category\/[A-Z_]+"[\s\S]{0,300}?<span[^>]*>([^<]+)<\/span>/)?.[1] ?? null;
  const count = html.match(/>([\d,.]+[만천억]?)\+<\/div><div[^>]*>다운로드/)?.[1];
  return {
    title: parsePlayTitle(html),
    fullDescription: description ? decode(description).trim() : null,
    art: { ...NO_ART, icon: icon ? srcOf(icon) : null, screenshots: [...new Set(shots)].slice(0, 6), developer, category, downloads: count ? `${count}회 이상` : null },
  };
}

async function readPlayPublic(hl: string, gl: string): Promise<ReturnType<typeof parsePlayPage> | null> {
  try {
    const res = await fetch(`https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}&hl=${hl}&gl=${gl}`, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
    return res.ok ? parsePlayPage(await res.text()) : null;
  } catch {
    return null;
  }
}

/** 조회 결과의 카테고리는 영어로만 온다 */
const GENRE_KO: Record<string, string> = { Sports: "스포츠", Games: "게임", Entertainment: "엔터테인먼트", "Health & Fitness": "건강 및 피트니스", Lifestyle: "라이프스타일" };

/** 미리보기에 쓸 아이콘과 스크린샷, 평점. 누구나 볼 수 있는 App Store 조회값이다. 못 읽으면 비워 둔다 */
export async function readArt(): Promise<Art> {
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${APPSTORE_APP_ID}&country=kr`, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const r = ((await res.json()) as { results?: { artworkUrl512?: string; screenshotUrls?: string[]; averageUserRating?: number; userRatingCount?: number; contentAdvisoryRating?: string; sellerName?: string; primaryGenreName?: string }[] }).results?.[0];
    return { icon: r?.artworkUrl512 ?? null, screenshots: (r?.screenshotUrls ?? []).slice(0, 6), rating: r?.averageUserRating ?? null, ratingCount: r?.userRatingCount ?? null, age: r?.contentAdvisoryRating ?? null, developer: r?.sellerName ?? null, category: r?.primaryGenreName ? (GENRE_KO[r.primaryGenreName] ?? r.primaryGenreName) : null, downloads: null };
  } catch {
    return NO_ART;
  }
}
