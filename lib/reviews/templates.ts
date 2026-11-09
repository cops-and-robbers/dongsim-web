/**
 * 리뷰 답변 문구의 값과 규칙 (docs/admin-ui.md "리뷰"). 순수 함수만 둔다.
 */
import { countOf, CUSTOM_BLANK, DRAFT_MAX, REPLY_MAX, type Review } from "./model.ts";

export const REPLY_LANGS = ["ko", "en", "ja"] as const;
export type ReplyLang = (typeof REPLY_LANGS)[number];
export const LANG_LABEL: Record<ReplyLang, string> = { ko: "한국어", en: "영어", ja: "일본어" };

/** 어울리는 별점. 낮음은 3점 이하다 */
export type Fit = "low" | "high" | "any";
export const FIT_LABEL: Record<Fit, string> = { low: "낮은 별점", high: "높은 별점", any: "모든 별점" };

export type Bodies = Record<ReplyLang, string>;
export type ReplyTemplate = { id: number; title: string; fit: Fit; bodies: Bodies; updatedBy: string; updatedAt: string };
export type TemplateInput = { title: string; fit: Fit; bodies: Bodies };
export type TemplateList = { templates: ReplyTemplate[]; writable: boolean; readOnlyReason?: string };

export const NAME_TOKEN = "{이름}";
export const CUSTOM_TOKEN = "{맞춤 문장}";
export const TITLE_MAX = 30;

const NAMELESS: Record<ReplyLang, string> = { ko: "이용자", en: "there", ja: "ユーザー" };

const HANGUL = /[가-힣]/;
const KANA = /[぀-ヿ]/;
const LATIN = /[A-Za-z]/;
const CJK = /[一-鿿]/;

const IOS_PLACE: Record<string, ReplyLang> = { KOR: "ko", JPN: "ja", USA: "en", GBR: "en", AUS: "en", CAN: "en", IRL: "en", NZL: "en" };

/** 답글을 쓸 언어. 스토어 나라와 글의 언어가 다를 수 있어 글을 먼저 본다. 모르면 null 이다 */
export function replyLangOf(r: Pick<Review, "platform" | "place" | "body">): ReplyLang | null {
  if (KANA.test(r.body)) return "ja";
  if (HANGUL.test(r.body)) return "ko";
  if (LATIN.test(r.body) && !CJK.test(r.body)) return "en";
  if (!r.place) return null;
  if (r.platform === "ios") return IOS_PLACE[r.place] ?? null;
  const code = r.place.slice(0, 2).toLowerCase();
  return (REPLY_LANGS as readonly string[]).includes(code) ? (code as ReplyLang) : null;
}

/** 넣기 전 문구를 답글로 바꾼다. 맞춤 문장 자리는 채우기 전까지 올릴 수 없다 */
export function fillTemplate(body: string, author: string, lang: ReplyLang): string {
  return body.split(NAME_TOKEN).join(author.trim() || NAMELESS[lang]).split(CUSTOM_TOKEN).join(CUSTOM_BLANK).trim();
}

export const fits = (fit: Fit, rating: number) => fit === "any" || (fit === "low" ? rating <= 3 : rating >= 4);

/** 답글 칸에 보여 줄 순서. 별점이 맞고 그 언어로 쓴 문구가 먼저다 */
export function recommend(list: ReplyTemplate[], rating: number, lang: ReplyLang): ReplyTemplate[] {
  const score = (t: ReplyTemplate) => (t.bodies[lang].trim() ? 0 : 4) + (t.fit !== "any" && fits(t.fit, rating) ? 0 : fits(t.fit, rating) ? 1 : 2);
  return [...list].sort((a, b) => score(a) - score(b));
}

/** 토큰을 뺀 글자 수. 맞춤 문장 길이는 쓰는 사람마다 달라서 세지 않는다 */
export const lengthOf = (body: string) => countOf(body.split(NAME_TOKEN).join("").split(CUSTOM_TOKEN).join("").trim());

export const overPlay = (body: string) => lengthOf(body) > (REPLY_MAX.android ?? Infinity);

/** 저장할 수 없는 이유. 없으면 null */
export function templateProblem(t: TemplateInput): string | null {
  if (!t.title.trim()) return "상황 이름을 적어 주세요.";
  if (countOf(t.title.trim()) > TITLE_MAX) return `상황 이름은 ${TITLE_MAX}자까지 쓸 수 있어요.`;
  if (!REPLY_LANGS.some((l) => t.bodies[l].trim())) return "한 언어 이상 문구를 써 주세요.";
  if (REPLY_LANGS.some((l) => countOf(t.bodies[l]) > DRAFT_MAX)) return "문구가 너무 길어요.";
  return null;
}
