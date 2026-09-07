/**
 * 동기화용 노션 API 클라이언트 (#109).
 *
 * 버전을 둘로 나눠 쓴다 - 마크다운 엔드포인트는 최신 버전에만 있고,
 * DB 쿼리는 안정된 구버전으로 충분하다. 하나로 통일하려다 한쪽이 깨지는 것보다
 * 용도별로 고정하는 편이 안전하다.
 *
 * 화면이 쓰는 lib/blog/notion.ts(SDK v5, 블록 트리 조회)와 별개다 - 그쪽은
 * 렌더 전환(#109 2단계)이 끝나면 내려간다.
 */

const API = "https://api.notion.com/v1";

/** DB 쿼리·페이지 조회용 (안정 버전) */
const V_DATA = "2022-06-28";
/** 페이지를 마크다운으로 받는 엔드포인트용 (이 버전부터 존재) */
const V_MARKDOWN = "2025-09-03";

/** 노션에서 읽어온 글 하나. DB로 넘어가기 전의 모양. */
export type NotionPost = {
  pageId: string;
  slug: string;
  /** "언어" 속성. 비어 있으면 ko (속성 도입 전의 글이 한국어 블로그에 남도록) */
  locale: "ko" | "en" | "ja";
  title: string;
  summary: string;
  author: string;
  /** "YYYY-MM-DD" */
  date: string;
  tags: string[];
  published: boolean;
  /** 페이지 커버 URL(서명·만료됨). 없으면 undefined */
  coverUrl?: string;
  /** 본문 마크다운 */
  body: string;
};

function token(): string {
  const t = process.env.NOTION_TOKEN;
  if (!t) throw new Error("NOTION_TOKEN이 설정되지 않았습니다");
  return t;
}

async function call<T>(path: string, version: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Notion-Version": version,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`노션 ${path} 실패 (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

type NotionProp = {
  type: string;
  title?: { plain_text: string }[];
  rich_text?: { plain_text: string }[];
  checkbox?: boolean;
  date?: { start: string } | null;
  multi_select?: { name: string }[];
  select?: { name: string } | null;
};

type NotionPage = {
  id: string;
  properties: Record<string, NotionProp>;
  cover?:
    | { type: "external"; external: { url: string } }
    | { type: "file"; file: { url: string } }
    | null;
};

/* 속성 이름은 팀 노션 DB의 규약(docs/blog-system.md)과 1:1이다.
   기존 화면 코드(lib/blog/notion.ts)처럼 한/영 별칭을 모두 받는다 -
   팀원이 영어 템플릿으로 DB를 복제해도 동기화가 조용히 깨지지 않도록. */
function prop(page: NotionPage, ...names: string[]): NotionProp | undefined {
  for (const name of names) {
    if (page.properties[name]) return page.properties[name];
  }
  return undefined;
}

const text = (p?: NotionProp): string =>
  (p?.title ?? p?.rich_text ?? []).map((t) => t.plain_text).join("").trim();

function localeOf(page: NotionPage): "ko" | "en" | "ja" {
  const raw = prop(page, "언어", "Language", "locale")?.select?.name;
  return raw === "en" || raw === "ja" ? raw : "ko";
}

function coverUrlOf(page: NotionPage): string | undefined {
  if (!page.cover) return undefined;
  return page.cover.type === "external" ? page.cover.external.url : page.cover.file.url;
}

/**
 * 노션 DB의 모든 글을 읽는다(본문 제외). 페이지네이션을 끝까지 따라간다.
 *
 * "공개" 필터를 걸지 않는 이유: 발행이 내려간 글을 알아야 draft 전환과
 * 삭제 판정을 할 수 있다. 공개 여부는 toPost 가 속성으로 읽는다.
 */
export async function listPages(): Promise<NotionPage[]> {
  const dbId = process.env.NOTION_BLOG_DATABASE_ID;
  if (!dbId) throw new Error("NOTION_BLOG_DATABASE_ID가 설정되지 않았습니다");

  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const res = await call<{
      results: NotionPage[];
      has_more: boolean;
      next_cursor: string | null;
    }>(`/databases/${dbId}/query`, V_DATA, {
      method: "POST",
      body: JSON.stringify({ page_size: 100, start_cursor: cursor }),
    });
    pages.push(...res.results);
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return pages;
}

/** 페이지 본문을 마크다운으로 받는다. 변환기를 직접 만들지 않기 위한 선택이다. */
export async function fetchMarkdown(pageId: string): Promise<string> {
  const res = await call<{ markdown?: string; content?: string }>(
    `/pages/${pageId}/markdown`,
    V_MARKDOWN,
  );
  return res.markdown ?? res.content ?? "";
}

/** 페이지 속성을 우리 모양으로 옮긴다. 본문은 별도로 채운다. */
export function toPost(page: NotionPage, body: string): NotionPost {
  return {
    pageId: page.id,
    slug: text(prop(page, "슬러그", "Slug", "slug")),
    locale: localeOf(page),
    title: text(prop(page, "제목", "Title", "이름", "Name")),
    summary: text(prop(page, "요약", "Summary")),
    author: text(prop(page, "작성자", "Author")),
    date: prop(page, "날짜", "Date")?.date?.start?.slice(0, 10) ?? "",
    tags: (prop(page, "태그", "Tags")?.multi_select ?? []).map((t) => t.name),
    published: prop(page, "공개", "Published")?.checkbox ?? false,
    coverUrl: coverUrlOf(page),
    body,
  };
}

export type { NotionPage };
