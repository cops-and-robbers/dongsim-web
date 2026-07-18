// Notion을 CMS로 쓰는 블로그 데이터 레이어 (서버 전용).
// 팀 Notion 데이터베이스에서 "공개" 체크된 글만 읽어온다.
// - 필요한 env: NOTION_TOKEN, NOTION_BLOG_DATABASE_ID (없으면 빈 목록 - 빌드는 깨지지 않는다)
// - DB 속성 규약(글쓰기 가이드와 일치): 제목(title) · 슬러그(text) · 요약(text) ·
//   작성자(text) · 날짜(date) · 태그(multi-select) · 공개(checkbox), 커버는 페이지 커버.
// - Notion 파일 URL은 1시간짜리 서명 URL이라 /api/blog/image 프록시로 감싼다.

import { Client } from "@notionhq/client";

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  author: string;
  date: string; // ISO(YYYY-MM-DD)
  tags: string[];
  /** 목록 카드·OG에 쓸 커버 이미지 URL(프록시 경유). 없으면 null. */
  coverUrl: string | null;
};

// 렌더러가 소비하는 최소 구조만 타입으로 잡는다(SDK 응답은 구조적으로 이보다 크다).
export type RichTextItem = {
  plain_text: string;
  href: string | null;
  annotations: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
};

export type NotionBlock = {
  id: string;
  type: string;
  has_children: boolean;
  children?: NotionBlock[];
} & Record<string, unknown>;

const TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_BLOG_DATABASE_ID;

const notion = TOKEN ? new Client({ auth: TOKEN }) : null;

// 데이터베이스 ID → 실제 쿼리 대상인 data source ID (API 2025-09 체계).
// 모듈 스코프에 캐시해 서버 인스턴스당 한 번만 조회한다.
let dataSourceIdPromise: Promise<string | null> | null = null;
function getDataSourceId(): Promise<string | null> {
  if (!notion || !DATABASE_ID) return Promise.resolve(null);
  if (!dataSourceIdPromise) {
    dataSourceIdPromise = notion.databases
      .retrieve({ database_id: DATABASE_ID })
      .then((db) => {
        const sources = (db as { data_sources?: { id: string }[] })
          .data_sources;
        return sources?.[0]?.id ?? null;
      })
      .catch((e) => {
        console.error("[blog] Notion 데이터베이스 조회 실패:", e);
        dataSourceIdPromise = null; // 일시 오류면 다음 요청에서 재시도
        return null;
      });
  }
  return dataSourceIdPromise;
}

type NotionPage = {
  id: string;
  last_edited_time?: string;
  cover?:
    | { type: "external"; external: { url: string } }
    | { type: "file"; file: { url: string } }
    | null;
  properties: Record<
    string,
    {
      type: string;
      title?: RichTextItem[];
      rich_text?: RichTextItem[];
      date?: { start: string } | null;
      checkbox?: boolean;
      multi_select?: { name: string }[];
    }
  >;
};

function plain(items?: RichTextItem[]): string {
  return (items ?? []).map((t) => t.plain_text).join("");
}

/** 이름 후보 중 존재하는 속성을 찾는다(한/영 표기 혼용 허용). */
function prop(page: NotionPage, ...names: string[]) {
  for (const n of names) {
    if (page.properties[n]) return page.properties[n];
  }
  return undefined;
}

function toPost(page: NotionPage): BlogPost | null {
  // 제목은 이름과 무관하게 title 타입 속성을 찾는다.
  const titleProp = Object.values(page.properties).find(
    (p) => p.type === "title"
  );
  const title = plain(titleProp?.title);
  const slug = plain(prop(page, "슬러그", "Slug", "slug")?.rich_text).trim();
  if (!title || !slug) return null; // 슬러그 없는 글은 발행 대상이 아니다

  return {
    id: page.id,
    slug,
    title,
    summary: plain(prop(page, "요약", "Summary")?.rich_text),
    author: plain(prop(page, "작성자", "Author")?.rich_text),
    date: prop(page, "날짜", "Date")?.date?.start ?? "",
    tags: (prop(page, "태그", "Tags")?.multi_select ?? []).map((t) => t.name),
    coverUrl: coverToUrl(page),
  };
}

function coverToUrl(page: NotionPage): string | null {
  if (!page.cover) return null;
  if (page.cover.type === "external") return page.cover.external.url;
  // Notion 업로드 파일은 서명 URL이 만료되므로 프록시를 거친다.
  // v=수정시각 → 커버가 바뀌면 URL이 바뀌어 장기 CDN 캐시와 공존한다.
  const v = encodeURIComponent(page.last_edited_time ?? "");
  return `/api/blog/image?page=${page.id}&v=${v}`;
}

/** 프록시 이미지 URL에 리사이즈 폭을 지정한다(외부 URL은 그대로 통과). */
export function withImageWidth(url: string, width: number): string {
  return url.startsWith("/api/blog/image") ? `${url}&w=${width}` : url;
}

/** 공개된 글 전체 - 날짜 내림차순. 연동 미설정·오류 시 빈 배열. */
export async function getPosts(): Promise<BlogPost[]> {
  const dataSourceId = await getDataSourceId();
  if (!notion || !dataSourceId) return [];

  try {
    const posts: BlogPost[] = [];
    let cursor: string | undefined;
    do {
      const res = await notion.dataSources.query({
        data_source_id: dataSourceId,
        filter: { property: "공개", checkbox: { equals: true } },
        sorts: [{ property: "날짜", direction: "descending" }],
        page_size: 100,
        start_cursor: cursor,
      });
      for (const page of res.results as unknown as NotionPage[]) {
        const post = toPost(page);
        if (post) posts.push(post);
      }
      cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
    } while (cursor);
    return posts;
  } catch (e) {
    console.error("[blog] 글 목록 조회 실패:", e);
    return [];
  }
}

/** 페이지 본문 블록 트리 - 토글·리스트 하위까지 재귀(깊이 3). */
export async function getBlocks(
  pageId: string,
  depth = 0
): Promise<NotionBlock[]> {
  if (!notion || depth > 3) return [];

  try {
    const blocks: NotionBlock[] = [];
    let cursor: string | undefined;
    do {
      const res = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 100,
        start_cursor: cursor,
      });
      blocks.push(...(res.results as unknown as NotionBlock[]));
      cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
    } while (cursor);

    await Promise.all(
      blocks
        .filter((b) => b.has_children)
        .map(async (b) => {
          b.children = await getBlocks(b.id, depth + 1);
        })
    );
    if (depth === 0) await attachImageDimensions(blocks);
    return blocks;
  } catch (e) {
    console.error("[blog] 본문 블록 조회 실패:", e);
    return [];
  }
}

export type ImageDimensions = { width: number; height: number };

// 이미지 실제 치수 캐시 - 키는 블록 id + 수정 시각(이미지가 바뀌면 다시 잰다).
// 치수를 알아야 렌더러가 자리를 미리 확보해 로딩 중 레이아웃 점프(CLS)가 없다.
const dimensionCache = new Map<string, ImageDimensions | null>();

// 본문 이미지 블록들의 가로세로 치수를 병렬로 알아내 블록에 붙인다.
// 파일 전체가 아니라 앞부분(헤더)만 Range로 받아서 가볍다. 실패해도 글은 그대로 뜬다.
async function attachImageDimensions(blocks: NotionBlock[]): Promise<void> {
  const { default: sharp } = await import("sharp");

  const probe = async (block: NotionBlock): Promise<void> => {
    const image = block.image as
      | { type: "file"; file: { url: string } }
      | { type: "external"; external: { url: string } }
      | undefined;
    if (!image) return;
    const url = image.type === "file" ? image.file.url : image.external.url;
    const key = `${block.id}:${String(block.last_edited_time ?? "")}`;

    if (!dimensionCache.has(key)) {
      try {
        const res = await fetch(url, {
          headers: { Range: "bytes=0-131071" }, // 앞 128KB면 대부분 포맷의 헤더가 들어온다
        });
        const buf = Buffer.from(await res.arrayBuffer());
        const meta = await sharp(buf).metadata();
        // EXIF 회전(5~8)은 가로세로가 뒤집힌다 - 프록시가 .rotate()로 보정해 내보내는 기준에 맞춘다.
        const swapped = (meta.orientation ?? 1) >= 5;
        const width = swapped ? meta.height : meta.width;
        const height = swapped ? meta.width : meta.height;
        dimensionCache.set(
          key,
          width && height ? { width, height } : null
        );
      } catch {
        dimensionCache.set(key, null); // 실패한 이미지는 재시도하지 않는다
      }
    }
    const dim = dimensionCache.get(key);
    if (dim) block.dimensions = dim;
  };

  const walk = (list: NotionBlock[]): NotionBlock[] =>
    list.flatMap((b) => [b, ...(b.children ? walk(b.children) : [])]);

  await Promise.all(
    walk(blocks)
      .filter((b) => b.type === "image")
      .map(probe)
  );
}

/** 이미지 프록시용 - 블록/페이지 커버의 현재(신선한) 서명 URL을 얻는다. */
export async function getFreshImageUrl(params: {
  blockId?: string;
  pageId?: string;
}): Promise<string | null> {
  if (!notion) return null;
  try {
    if (params.blockId) {
      const block = (await notion.blocks.retrieve({
        block_id: params.blockId,
      })) as unknown as NotionBlock;
      const image = block.image as
        | { type: "file"; file: { url: string } }
        | { type: "external"; external: { url: string } }
        | undefined;
      if (!image) return null;
      return image.type === "file" ? image.file.url : image.external.url;
    }
    if (params.pageId) {
      const page = (await notion.pages.retrieve({
        page_id: params.pageId,
      })) as unknown as NotionPage;
      if (!page.cover) return null;
      return page.cover.type === "file"
        ? page.cover.file.url
        : page.cover.external.url;
    }
    return null;
  } catch (e) {
    console.error("[blog] 이미지 URL 조회 실패:", e);
    return null;
  }
}
