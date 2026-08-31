"use client";

// 공지사항 REST 클라이언트. BE의 /api/notices CRUD 계약을 그대로 따른다.
// 기본은 상대경로(/api/notices)라 dev에서 MSW 목이 가로챈다.
// 실서버로 붙일 땐 NEXT_PUBLIC_USE_DEV_NOTICES=true (단, BE가 /api/notices CORS를 열어야 함).
//
// 다국어(BE #174): 본문이 언어별 번역으로 분리됐다. 조회는 language 쿼리로 언어를
// 고르고, 요청 언어의 번역이 없으면 원문 언어로 대체된다. 응답의 language 와
// requestedLanguage 가 다르면 그 언어의 번역이 아직 없다는 뜻이다.
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";

export type NoticeCategory = "NOTICE" | "MAINTENANCE" | "EVENT" | "UPDATE";

export type NoticeLanguage = "ko" | "ja" | "en";

export type Notice = {
  id: number;
  title: string;
  content: string;
  /** 본문의 실제 언어. requestedLanguage 와 다르면 요청 언어의 번역이 없어 대체된 것 */
  language: NoticeLanguage;
  requestedLanguage: NoticeLanguage;
  pinned: boolean;
  category: NoticeCategory;
  createdAt: string;
  updatedAt: string;
};

export type NoticeList = {
  content: Notice[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
};

export type NoticeTranslationInput = {
  language: NoticeLanguage;
  title: string;
  content: string;
};

export type NoticeInput = {
  pinned: boolean;
  category: NoticeCategory;
  originalLanguage: NoticeLanguage;
  /** 저장할 언어 전체. 수정 시 기존 번역을 통째로 대체한다 */
  translations: NoticeTranslationInput[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const USE_DEV =
  process.env.NEXT_PUBLIC_USE_DEV_NOTICES === "true" && API_BASE !== "";
const BASE = USE_DEV ? API_BASE : ""; // "" -> 상대경로 -> MSW 목

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const url = `${BASE}/api/notices${path}`;
  const send = () => fetch(url, { ...init, headers: authHeaders() });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  return res;
}

export async function listNotices(params: {
  page: number;
  size: number;
  category?: NoticeCategory;
  language?: NoticeLanguage;
}): Promise<NoticeList> {
  const q = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
  });
  if (params.category) q.set("category", params.category);
  if (params.language) q.set("language", params.language);
  const res = await request(`?${q.toString()}`);
  if (!res.ok) throw new Error("공지 목록을 불러오지 못했어요.");
  return res.json();
}

export type NoticeTranslations = {
  originalLanguage: NoticeLanguage;
  translations: Partial<Record<NoticeLanguage, { title: string; content: string }>>;
};

/** 어드민 편집용. 언어 대체 없이 저장된 번역 전체를 받는다 (관리자 전용 API). */
export async function fetchNoticeTranslations(id: number): Promise<NoticeTranslations> {
  const res = await request(`/${id}/translations`);
  if (!res.ok) throw new Error("번역을 불러오지 못했어요.");
  const data: {
    originalLanguage: NoticeLanguage;
    translations: NoticeTranslationInput[];
  } = await res.json();
  return {
    originalLanguage: data.originalLanguage,
    translations: Object.fromEntries(
      data.translations.map((t) => [t.language, { title: t.title, content: t.content }])
    ),
  };
}

export async function createNotice(input: NoticeInput): Promise<Notice> {
  const res = await request("", { method: "POST", body: JSON.stringify(input) });
  if (!res.ok) throw new Error("공지 등록에 실패했어요.");
  return res.json();
}

export async function updateNotice(id: number, input: NoticeInput): Promise<Notice> {
  const res = await request(`/${id}`, { method: "PUT", body: JSON.stringify(input) });
  if (!res.ok) throw new Error("공지 수정에 실패했어요.");
  return res.json();
}

export async function deleteNotice(id: number): Promise<void> {
  const res = await request(`/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("공지 삭제에 실패했어요.");
}

// 카테고리 표시용 메타(라벨 + 배지 색).
export const NOTICE_CATEGORY: Record<
  NoticeCategory,
  { label: string; badge: string }
> = {
  NOTICE: { label: "공지", badge: "bg-sd-info-weak text-sd-info" },
  MAINTENANCE: { label: "점검", badge: "bg-sd-warning-weak text-sd-warning" },
  EVENT: { label: "이벤트", badge: "bg-sd-positive-weak text-sd-positive" },
  UPDATE: { label: "업데이트", badge: "bg-sd-gray-200 text-sd-fg-muted" },
};

export const NOTICE_CATEGORIES: NoticeCategory[] = [
  "NOTICE",
  "MAINTENANCE",
  "EVENT",
  "UPDATE",
];

export const NOTICE_LANGUAGE: Record<NoticeLanguage, { label: string }> = {
  ko: { label: "한국어" },
  ja: { label: "日本語" },
  en: { label: "English" },
};

export const NOTICE_LANGUAGES: NoticeLanguage[] = ["ko", "ja", "en"];
