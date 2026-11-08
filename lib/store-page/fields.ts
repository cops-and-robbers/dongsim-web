import type { ImageDraft, LiveImages } from "./images.ts";

/**
 * 스토어 페이지 문구의 칸, 한도, 자동 점검 (docs/admin-ui.md "스토어 페이지"). 순수 함수만 둔다.
 * 한도와 규칙의 근거는 애플, 구글 공식 문서다(2026-11-08 확인, LINKS).
 * 말 목록(최고, 무료 등)은 공식 예시를 옮긴 것이고 공식 금칙어 목록은 아니라서, 막지 않고 알려만 준다.
 */

export type Platform = "ios" | "android";
export type Lang = "ko" | "en" | "ja";
export type FieldId = "name" | "subtitle" | "promotionalText" | "description" | "keywords" | "whatsNew" | "title" | "shortDescription" | "fullDescription" | "video";
export type Values = Partial<Record<FieldId, string>>;

/** live 는 지금 사용자에게 보이는 값, pending 은 스토어에 저장돼 다음에 나갈 값(없으면 null) */
export type Side = { live: Values; pending: Values | null };
export type Failed = { ok: false; error: string };
export type Art = { icon: string | null; screenshots: string[]; rating: number | null; ratingCount: number | null; age: string | null; developer: string | null; category: string | null; downloads: string | null };
export type IosPage = { ok: true; langs: Record<Lang, Side>; art: Art; images: LiveImages; liveVersion: string | null; nextVersion: string | null } | Failed;
export type AndroidPage = { ok: true; langs: Record<Lang, Side>; art: Art; images: LiveImages } | Failed;
export type Draft = { platform: Platform; lang: Lang; field: FieldId; value: string; updatedBy: string; updatedAt: string };
export type StorePage = { readAt: string; ios: IosPage; android: AndroidPage; drafts: Draft[]; imageDrafts: ImageDraft[]; writable: boolean; readOnlyReason?: string };

export const LANGS: { id: Lang; label: string; ios: string; android: string; hl: string; gl: string }[] = [
  { id: "ko", label: "한국어", ios: "ko", android: "ko-KR", hl: "ko", gl: "KR" },
  { id: "en", label: "English", ios: "en-US", android: "en-US", hl: "en", gl: "US" },
  { id: "ja", label: "日本語", ios: "ja", android: "ja-JP", hl: "ja", gl: "JP" },
];

export const LINKS = {
  appleInfo: "https://developer.apple.com/help/app-store-connect/reference/app-information/app-information",
  appleVersion: "https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information",
  appleProduct: "https://developer.apple.com/app-store/product-page/",
  appleSearch: "https://developer.apple.com/app-store/search/",
  appleReview: "https://developer.apple.com/app-store/review/guidelines/",
  appleShots: "https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications",
  applePreview: "https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications",
  appleIcon: "https://developer.apple.com/design/human-interface-guidelines/app-icons",
  playSetup: "https://support.google.com/googleplay/android-developer/answer/9859152?hl=ko",
  playAssets: "https://support.google.com/googleplay/android-developer/answer/9866151?hl=ko",
  playPolicy: "https://support.google.com/googleplay/android-developer/answer/9898842?hl=ko",
  playBest: "https://support.google.com/googleplay/android-developer/answer/13393723?hl=ko",
  playPublish: "https://support.google.com/googleplay/android-developer/answer/9859654?hl=ko",
  playIcon: "https://developer.android.com/distribute/google-play/resources/icon-design-specifications",
} as const;

export type When = "next" | "now" | "review";
export const WHEN_LABEL: Record<When, string> = { next: "다음 버전과 함께 나가요", now: "심사 없이 바로 바뀌어요", review: "심사 후 게시하면 나가요" };

export type Field = { id: FieldId; label: string; max: number; min?: number; multiline: boolean; when: When; tip: string; link: string; url?: boolean };

export const FIELDS: Record<Platform, Field[]> = {
  ios: [
    { id: "name", label: "이름", max: 30, min: 2, multiline: false, when: "next", tip: "제품 페이지와 검색 결과에 보이고, 검색에도 쓰여요.", link: LINKS.appleInfo },
    { id: "subtitle", label: "부제", max: 30, multiline: false, when: "next", tip: "이름 바로 아래 보이고, 검색에도 쓰여요. 수식어보다 무엇을 하는 앱인지 쓰세요.", link: LINKS.appleProduct },
    { id: "promotionalText", label: "프로모션 문구", max: 170, multiline: true, when: "now", tip: "설명 위에 보여요. 행사 소식을 쓰기 좋아요. 검색에는 영향이 없어요.", link: LINKS.appleProduct },
    { id: "description", label: "설명", max: 4000, multiline: true, when: "next", tip: "첫 문장이 '더 보기' 앞에 보여요. 짧은 소개 다음에 주요 기능을 쓰세요.", link: LINKS.appleVersion },
    { id: "keywords", label: "키워드", max: 100, multiline: true, when: "next", tip: "사용자에게 안 보이고 검색에만 쓰여요. 쉼표로 나누고 띄어 쓰지 마세요.", link: LINKS.appleSearch },
    { id: "whatsNew", label: "새로운 기능", max: 4000, multiline: true, when: "next", tip: "업데이트할 때 보여요. 중요한 것부터 쓰세요.", link: LINKS.appleVersion },
  ],
  android: [
    { id: "title", label: "앱 이름", max: 30, multiline: false, when: "review", tip: "Google Play 어디서나 보여요.", link: LINKS.playSetup },
    { id: "shortDescription", label: "간단한 설명", max: 80, multiline: true, when: "review", tip: "상세 페이지 첫 문구예요. 금방 낡을 기간 한정 문구는 피하세요.", link: LINKS.playAssets },
    { id: "fullDescription", label: "자세한 설명", max: 4000, multiline: true, when: "review", tip: "첫 문장에 핵심을 쓰고, 사용자가 쓰는 말로 쓰세요. 단어만 늘어놓으면 앱이 정지될 수 있어요.", link: LINKS.playSetup },
    { id: "video", label: "동영상", max: 300, multiline: false, when: "review", url: true, tip: "YouTube 주소를 넣어요. 앱 정보의 첫 칸에 보여요. 공개 또는 일부 공개로 두고, 광고는 끄고, 연령 제한이 없어야 해요.", link: LINKS.playAssets },
  ],
};

/** YouTube 영상 주소에서 영상 id 를 꺼낸다. 채널이나 재생목록 주소는 null */
export function youtubeId(url: string): string | null {
  const m = url.trim().match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/)|youtu\.be\/)([\w-]{11})(?:[?&#].*)?$/);
  return m?.[1] ?? null;
}

export const videoThumb = (url: string | undefined) => {
  const id = url ? youtubeId(url) : null;
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
};

/** 저장할 수 있는 초안의 최대 글자 수. 한도를 조금 넘긴 채 고치는 중일 수 있어 칸 한도보다 넉넉하다 */
export const DRAFT_MAX = 8000;

export const isLang = (v: unknown): v is Lang => v === "ko" || v === "en" || v === "ja";
export const isField = (p: Platform, v: unknown): v is FieldId => FIELDS[p].some((f) => f.id === v);

/** 글자 수. 이모지도 한 글자로 센다. iOS 키워드는 문서마다 100자, 100바이트로 달라 실제 저장된 값(한글 99자, 2026-11-08)에 맞춰 글자로 센다 */
export const countOf = (v: string) => [...v].length;

export const keyOf = (p: Platform, l: Lang, f: FieldId) => `${p}:${l}:${f}`;

/** 편집의 출발점: 스토어에 저장돼 다음에 나갈 값, 없으면 지금 보이는 값 */
export const baseOf = (side: Side | undefined, f: FieldId) => side?.pending?.[f] ?? side?.live[f] ?? "";

// ---------- 자동 점검 ----------

export type Issue = { level: "block" | "warn" | "tip"; text: string; link?: string };

const PRICE = /무료|할인|최저가|광고\s*없|無料|割引|\bfree\b|\bsale\b|\bno ads\b|\d+\s?%\s?(off|할인|オフ)/i;
const RANK = /1위|최고|인기\s*(게임|앱|1)|#\s?1\b|\bno\.?\s?1\b|\bbest\b|\btop\s?\d*\b|ランキング|1位|No\.1/i;
const WORLD_BEST = /세계\s*최고|세계\s*1위|world'?s\s+best|世界一/i;
const OTHER_STORE = /android|google\s*play|안드로이드|구글\s*플레이|플레이\s*스토어|アンドロイド|グーグルプレイ/i;
const KIDS = /for\s+(kids|children)|어린이용|키즈용|子供向け|子ども向け/i;
const CTA = /지금\s*(다운로드|설치)|download\s+now|install\s+now|play\s+now|今すぐ/i;
const NEW_WORD = /\bnew\b|신규|新着/i;
const EDITOR = /에디터\s*추천|editor'?s\s+choice|エディター/i;
const SHORT_HYPE = /\bbest\b|#\s?1\b|\btop\b|\bnew\b|할인|1위/i;
const EMOJI = /\p{Extended_Pictographic}/u;
const REPEAT = /([!?~★☆♥*_.-])\1{1,}/;
const HTML = /<\/?[a-z][^>]*>/i;
const AMOUNT = /[$₩¥€]\s?\d|\d[\d,]*\s?(원|달러|円)/;
/** 이미 앱이나 게임이라는 걸 아는 말이라 키워드 칸을 낭비한다 */
const WASTE = new Set(["app", "apps", "game", "games", "the", "앱", "어플", "게임", "アプリ", "ゲーム"]);

const norm = (s: string) => s.trim().toLowerCase();
const has = (re: RegExp, v: string) => re.test(v);

export type KeywordState = { word: string; state: "ok" | "repeat" | "inName" | "waste" };

/** 키워드 한 개마다 상태. 화면이 칩으로 그린다 */
export function keywordStates(value: string, name: string, subtitle: string): KeywordState[] {
  const seen = new Set<string>();
  const known = `${name} ${subtitle}`.toLowerCase();
  return value
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean)
    .map((word) => {
      const n = norm(word);
      const state: KeywordState["state"] = seen.has(n) ? "repeat" : WASTE.has(n) ? "waste" : known.includes(n) ? "inName" : "ok";
      seen.add(n);
      return { word, state };
    });
}

function iosIssues(f: FieldId, v: string, ctx: Values): Issue[] {
  const out: Issue[] = [];
  if ((f === "name" || f === "subtitle") && has(PRICE, v)) out.push({ level: "warn", text: "이름과 부제에는 가격을 쓸 수 없어요.", link: LINKS.appleReview });
  if (f === "subtitle" && has(WORLD_BEST, v)) out.push({ level: "warn", text: "'세계 최고' 같은 말 대신 무엇을 하는 앱인지 쓰세요.", link: LINKS.appleProduct });
  if (f === "description") {
    if (has(AMOUNT, v)) out.push({ level: "warn", text: "설명에는 구체적인 금액을 쓰지 마세요.", link: LINKS.appleProduct });
    if (has(HTML, v)) out.push({ level: "warn", text: "설명에는 HTML 을 쓸 수 없어요.", link: LINKS.appleVersion });
  }
  if (f !== "keywords" && has(OTHER_STORE, v)) out.push({ level: "warn", text: "App Store 문구에는 다른 플랫폼 이름을 쓸 수 없어요.", link: LINKS.appleReview });
  if (f !== "whatsNew" && has(KIDS, v)) out.push({ level: "warn", text: "'어린이용' 같은 표현은 키즈 카테고리 앱만 쓸 수 있어요.", link: LINKS.appleReview });
  if (f === "keywords") {
    if (/,\s/.test(v)) out.push({ level: "warn", text: "쉼표 뒤의 띄어쓰기는 글자 수만 차지해요. 빼 주세요.", link: LINKS.appleSearch });
    if (/[#@]/.test(v)) out.push({ level: "warn", text: "키워드에는 #과 @를 쓰지 마세요.", link: LINKS.appleSearch });
    const states = keywordStates(v, ctx.name ?? "", ctx.subtitle ?? "");
    const words = (s: KeywordState["state"]) => states.filter((k) => k.state === s).map((k) => k.word);
    if (words("repeat").length) out.push({ level: "warn", text: `같은 키워드가 또 있어요: ${words("repeat").join(", ")}`, link: LINKS.appleSearch });
    if (words("inName").length) out.push({ level: "tip", text: `이름이나 부제에 이미 있어서 빼도 돼요: ${words("inName").join(", ")}`, link: LINKS.appleSearch });
    if (words("waste").length) out.push({ level: "tip", text: `검색에 도움이 안 되는 말이에요: ${words("waste").join(", ")}`, link: LINKS.appleSearch });
  }
  return out;
}

function androidIssues(f: FieldId, v: string, ctx: Values): Issue[] {
  const out: Issue[] = [];
  const policy = LINKS.playPolicy;
  if (f === "title") {
    if (has(EMOJI, v)) out.push({ level: "warn", text: "앱 이름에는 이모지를 쓸 수 없어요.", link: policy });
    if (has(REPEAT, v)) out.push({ level: "warn", text: "같은 특수문자를 반복하지 마세요.", link: policy });
    if (/[A-Z]/.test(v) && v === v.toUpperCase()) out.push({ level: "warn", text: "브랜드 이름이 아니면 전부 대문자로 쓰지 마세요.", link: policy });
    if (has(RANK, v)) out.push({ level: "warn", text: "앱 이름에는 순위나 인기를 뜻하는 말을 쓸 수 없어요.", link: policy });
    if (has(PRICE, v)) out.push({ level: "warn", text: "앱 이름에는 가격이나 할인을 쓸 수 없어요.", link: policy });
    if (has(EDITOR, v) || has(NEW_WORD, v)) out.push({ level: "warn", text: "앱 이름에는 '신규', '에디터 추천' 같은 말을 쓸 수 없어요.", link: policy });
  }
  if (f === "shortDescription") {
    if (has(SHORT_HYPE, v)) out.push({ level: "warn", text: "순위나 할인을 뜻하는 말은 빼는 게 좋아요.", link: LINKS.playAssets });
    if (has(CTA, v)) out.push({ level: "warn", text: "'지금 다운로드' 같은 말은 빼는 게 좋아요.", link: LINKS.playAssets });
    if (/\n/.test(v)) out.push({ level: "warn", text: "줄을 바꾸지 말고 한 문장으로 쓰세요.", link: LINKS.playAssets });
    if (has(EMOJI, v) || has(REPEAT, v)) out.push({ level: "warn", text: "이모지와 반복되는 문장부호는 빼는 게 좋아요.", link: LINKS.playAssets });
  }
  if (f === "fullDescription") {
    if (has(RANK, v) || has(PRICE, v)) out.push({ level: "warn", text: "순위나 가격을 뜻하는 말이 있어요. 꼭 필요한지 봐 주세요.", link: policy });
    const short = (ctx.shortDescription ?? "").trim();
    if (short && v.includes(short)) out.push({ level: "tip", text: "간단한 설명과 같은 문장이 있어요. 다른 내용을 쓰는 게 좋아요.", link: LINKS.playBest });
  }
  return out;
}

/** 한 칸의 점검 결과. ctx 는 같은 스토어, 같은 언어의 다른 칸 값이다 */
export function checkField(platform: Platform, field: Field, value: string, ctx: Values): Issue[] {
  if (!value.trim()) return field.min || field.id === "name" || field.id === "title" ? [{ level: "block", text: "비워 둘 수 없어요." }] : [];
  if (field.url) return youtubeId(value) ? [] : [{ level: "block", text: "YouTube 영상 주소를 넣어 주세요. 채널이나 재생목록 주소는 쓸 수 없어요.", link: field.link }];
  const n = countOf(value);
  const out: Issue[] = [];
  if (n > field.max) out.push({ level: "block", text: `${field.max}자까지 쓸 수 있어요. ${n - field.max}자 줄여 주세요.`, link: field.link });
  if (field.min && n < field.min) out.push({ level: "block", text: `${field.min}자 이상 써 주세요.`, link: field.link });
  return out.concat(platform === "ios" ? iosIssues(field.id, value, ctx) : androidIssues(field.id, value, ctx));
}

// ---------- 사람이 볼 것 ----------

export const HUMAN_CHECKS: Record<Platform, { text: string; link: string }[]> = {
  ios: [
    { text: "설명이 실제 앱 기능과 맞나요?", link: LINKS.appleReview },
    { text: "다른 앱 이름이나 입증할 수 없는 주장이 없나요?", link: LINKS.appleReview },
    { text: "큰 변경이 있으면 새로운 기능에 적었나요?", link: LINKS.appleReview },
    { text: "키워드에 상표, 유명인, 경쟁 앱 이름이 없나요?", link: LINKS.appleSearch },
  ],
  android: [
    { text: "과장이나 기능을 오해하게 하는 표현이 없나요?", link: LINKS.playBest },
    { text: "출처 없는 후기, 다른 앱과 비교가 없나요?", link: LINKS.playBest },
    { text: "번역본도 같은 기준으로 봤나요?", link: LINKS.playBest },
    { text: "유명인이나 다른 브랜드 로고를 쓰지 않았나요?", link: LINKS.playPolicy },
  ],
};
