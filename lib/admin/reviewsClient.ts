// 어드민 화면에서 리뷰 받은편지함을 부른다. 토큰이 만료됐으면 한 번 재발급하고 다시 묻는다(storePageClient 와 같은 방식).
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import type { Inbox, Platform, Review } from "@/lib/reviews/model";
import type { ReplyTemplate, TemplateInput, TemplateList } from "@/lib/reviews/templates";

const API = "/api/admin/reviews";

async function send(url: string, init: RequestInit = {}): Promise<Response> {
  const go = () => fetch(url, { ...init, headers: { Authorization: `Bearer ${getAccessToken() ?? ""}`, ...(init.body ? { "Content-Type": "application/json" } : {}) }, cache: "no-store" });
  const res = await go();
  if (res.status === 401 && (await reissue())) return go();
  return res;
}

async function json<T>(res: Response, fallback: string): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? fallback);
  return body;
}

export async function fetchInbox(fresh = false): Promise<Inbox> {
  return json<Inbox>(await send(`${API}${fresh ? "?fresh=1" : ""}`), "리뷰를 불러오지 못했어요. 잠시 뒤 다시 확인해 주세요.");
}

export async function fetchWaitingCount(): Promise<number> {
  return (await json<{ waiting: number }>(await send(`${API}?count=1`), "")).waiting;
}

type Key = { platform: Platform; id: string };

const patch = async (body: Key & { action: string; draft?: string | null }) => (await json<{ review: Review }>(await send(API, { method: "PATCH", body: JSON.stringify(body) }), "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.")).review;

export const saveDraft = (key: Key, draft: string | null) => patch({ ...key, action: "draft", draft });
export const skip = (key: Key) => patch({ ...key, action: "skip" });
export const reopen = (key: Key) => patch({ ...key, action: "reopen" });

export async function postReply(key: Key, text: string): Promise<Review> {
  return (await json<{ review: Review }>(await send(API, { method: "POST", body: JSON.stringify({ ...key, text }) }), "답글을 올리지 못했어요. 잠시 뒤 다시 시도해 주세요.")).review;
}

const TEMPLATES = `${API}/templates`;

export async function fetchTemplates(): Promise<TemplateList> {
  return json<TemplateList>(await send(TEMPLATES), "답변 문구를 불러오지 못했어요.");
}

export async function createTemplate(input: TemplateInput): Promise<ReplyTemplate> {
  return (await json<{ template: ReplyTemplate }>(await send(TEMPLATES, { method: "POST", body: JSON.stringify(input) }), "답변 문구를 저장하지 못했어요.")).template;
}

export async function updateTemplate(id: number, updatedAt: string, input: TemplateInput): Promise<ReplyTemplate> {
  return (await json<{ template: ReplyTemplate }>(await send(TEMPLATES, { method: "PUT", body: JSON.stringify({ id, updatedAt, ...input }) }), "답변 문구를 저장하지 못했어요.")).template;
}

export async function deleteTemplate(id: number): Promise<void> {
  await json(await send(`${TEMPLATES}?id=${id}`, { method: "DELETE" }), "답변 문구를 지우지 못했어요.");
}
