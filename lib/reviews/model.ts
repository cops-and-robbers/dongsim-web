/**
 * 어드민 리뷰 받은편지함의 값과 규칙 (docs/admin-ui.md "리뷰"). 순수 함수만 둔다.
 */
export type Platform = "ios" | "android";

/** 스토어에서 온 값 */
export type StoreReview = {
  platform: Platform;
  id: string;
  rating: number;
  title: string;
  body: string;
  /** 다른 언어 리뷰를 구글이 한국어로 옮긴 글. body 가 원문이다 */
  translated: string | null;
  author: string;
  place: string | null;
  appVersion: string | null;
  device: string | null;
  reviewedAt: string;
  reply: string | null;
  replyAt: string | null;
  /** App Store 답글은 게시 전에 pending 이다 */
  replyState: "pending" | "published" | null;
};

export type Review = StoreReview & { replyBy: string | null; skippedBy: string | null; skippedAt: string | null; draft: string | null; draftBy: string | null };

export type InboxState = "waiting" | "replied" | "skipped";
export type Tab = "waiting" | "done" | "all";

export type Inbox = { reviews: Review[]; syncError: string | null; writable: boolean; readOnlyReason?: string };

/** Google Play 답글 한도. App Store 는 공식 문서에 한도가 없어 서버 오류로 알린다 */
export const REPLY_MAX: Record<Platform, number | null> = { ios: null, android: 350 };
/** 저장소를 지키는 값. 스토어 한도가 아니다 */
export const DRAFT_MAX = 6000;

const isLater = (a: string, b: string | null) => !!b && new Date(a).getTime() > new Date(b).getTime();

/** 답글이나 넘기기 뒤에 사용자가 리뷰를 고쳤는지. 애플은 고친 시각을 주지 않아 Google Play 만 해당된다 */
export const editedAfter = (r: Review) => isLater(r.reviewedAt, r.reply ? r.replyAt : r.skippedAt);

export function stateOf(r: Review): InboxState {
  if (editedAfter(r)) return "waiting";
  if (r.reply) return "replied";
  return r.skippedAt ? "skipped" : "waiting";
}

const newest = (a: Review, b: Review) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime();

/** 답글 대기는 낮은 별점부터, 나머지는 최근 것부터 */
export function listFor(tab: Tab, reviews: Review[], platform: Platform | "all"): Review[] {
  const mine = reviews.filter((r) => platform === "all" || r.platform === platform);
  if (tab === "waiting") return mine.filter((r) => stateOf(r) === "waiting").sort((a, b) => a.rating - b.rating || newest(a, b));
  return (tab === "done" ? mine.filter((r) => stateOf(r) !== "waiting") : [...mine]).sort(newest);
}

export const waitingCount = (reviews: Review[]) => reviews.filter((r) => stateOf(r) === "waiting").length;

export const countOf = (text: string) => [...text].length;

/** 답글을 등록할 수 없는 이유. 없으면 null */
export function replyProblem(platform: Platform, text: string): string | null {
  if (!text.trim()) return "답글을 써 주세요.";
  const max = REPLY_MAX[platform];
  if (max !== null && countOf(text) > max) return `Google Play 답글은 ${max}자까지 쓸 수 있어요.`;
  if (countOf(text) > DRAFT_MAX) return "답글이 너무 길어요.";
  return null;
}

type AscReview = { id: string; attributes?: Record<string, unknown>; relationships?: Record<string, { data?: { id: string } | null }> };
type AscIncluded = { id: string; attributes?: Record<string, unknown> };

const str = (v: unknown) => (typeof v === "string" ? v : "");

export function fromAsc(row: AscReview, included: AscIncluded[]): StoreReview {
  const a = row.attributes ?? {};
  const responseId = row.relationships?.response?.data?.id;
  const response = responseId ? included.find((i) => i.id === responseId)?.attributes : undefined;
  return {
    platform: "ios",
    id: row.id,
    rating: Number(a.rating),
    title: str(a.title),
    body: str(a.body),
    translated: null,
    author: str(a.reviewerNickname),
    place: str(a.territory) || null,
    appVersion: null,
    device: null,
    reviewedAt: str(a.createdDate),
    reply: response ? str(response.responseBody) : null,
    replyAt: response ? str(response.lastModifiedDate) : null,
    replyState: response ? (response.state === "PUBLISHED" ? "published" : "pending") : null,
  };
}

export type PlayReview = {
  reviewId: string;
  authorName?: string;
  comments?: {
    userComment?: { text?: string; originalText?: string; starRating?: number; reviewerLanguage?: string; device?: string; appVersionName?: string; androidOsVersion?: number; lastModified?: { seconds?: string } };
    developerComment?: { text?: string; lastModified?: { seconds?: string } };
  }[];
};

const fromSeconds = (s?: string) => new Date(Number(s ?? 0) * 1000).toISOString();

export function fromPlay(row: PlayReview): StoreReview {
  const user = row.comments?.find((c) => c.userComment)?.userComment ?? {};
  const dev = row.comments?.find((c) => c.developerComment)?.developerComment;
  // 번역을 부탁하면 text 가 번역이고 originalText 가 원문이다. 제목이 있으면 탭으로 이어 온다
  const original = (user.originalText ?? user.text ?? "").trim();
  const [title, body] = original.includes("\t") ? original.split("\t", 2) : ["", original];
  return {
    platform: "android",
    id: row.reviewId,
    rating: user.starRating ?? 0,
    title,
    body,
    translated: user.originalText ? (user.text ?? "").replace("\t", " ").trim() : null,
    author: row.authorName ?? "",
    place: user.reviewerLanguage ?? null,
    appVersion: user.appVersionName ?? null,
    device: user.device ?? null,
    reviewedAt: fromSeconds(user.lastModified?.seconds),
    reply: dev?.text ?? null,
    replyAt: dev ? fromSeconds(dev.lastModified?.seconds) : null,
    replyState: dev ? "published" : null,
  };
}
