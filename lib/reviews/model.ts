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
/** 답변 문구의 맞춤 문장 자리. 채우기 전에는 올릴 수 없다 */
export const CUSTOM_BLANK = "[이 리뷰에 맞는 한 문장을 적어 주세요]";
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
  if (text.includes(CUSTOM_BLANK)) return "맞춤 문장 자리를 이 리뷰에 맞게 채워 주세요.";
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

/** 따옴표 안의 줄바꿈까지 읽는 CSV. 리뷰 글에는 줄바꿈과 쉼표가 들어 있다 */
export function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) rows.push([...row, cell.replace(/\r$/, "")]);
  return rows;
}

/**
 * Google Play 가 달마다 버킷에 쌓는 리뷰 파일. API 는 최근 7일치만 줘서 지난 리뷰를 여기서 채운다.
 * 글이 있는 리뷰만, 리뷰 번호는 링크에서 읽는다. 쓴 사람 이름은 파일에 없다
 */
export function fromPlayCsv(text: string): StoreReview[] {
  const [head, ...rows] = csvRows(text);
  if (!head) return [];
  const at = (name: string) => head.findIndex((h) => h.trim() === name);
  const col = { version: at("App Version Name"), lang: at("Reviewer Language"), device: at("Device"), updated: at("Review Last Update Millis Since Epoch"), star: at("Star Rating"), title: at("Review Title"), text: at("Review Text"), replyAt: at("Developer Reply Millis Since Epoch"), reply: at("Developer Reply Text"), link: at("Review Link") };
  if (col.text < 0 || col.link < 0 || col.star < 0 || col.updated < 0) throw new Error(`Play 리뷰 파일의 열이 달라요 (열: ${head.join(", ")})`);
  return rows.flatMap((c) => {
    const body = (c[col.text] ?? "").trim();
    const id = (c[col.link] ?? "").match(/reviewid=([^&\s]+)/i)?.[1];
    if (!body || !id) return [];
    const replyMs = Number(c[col.replyAt]);
    const reply = (c[col.reply] ?? "").trim() || null;
    return [{ platform: "android" as const, id: decodeURIComponent(id), rating: Number(c[col.star]), title: (c[col.title] ?? "").trim(), body, translated: null, author: "", place: c[col.lang] || null, appVersion: c[col.version] || null, device: c[col.device] || null, reviewedAt: new Date(Number(c[col.updated])).toISOString(), reply, replyAt: reply && replyMs ? new Date(replyMs).toISOString() : null, replyState: reply ? ("published" as const) : null }];
  });
}

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
