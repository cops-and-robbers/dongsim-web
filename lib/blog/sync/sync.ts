/**
 * 노션 → Supabase 동기화 (#109).
 *
 * 단방향이다. 노션이 항상 이긴다 - 사이트에서 글을 고치지 않으므로 충돌이 없다.
 * 개인 검증본(INSANE-P/blog)의 구조에 팀 블로그 확장(locale·author)을 더했다.
 */

import { createClient } from "@supabase/supabase-js";
import { listPages, fetchMarkdown, toPost, type NotionPost } from "./notion-client";
import { htmlToMarkdown } from "./html-to-markdown";
import { migrateBodyImages, migrateImage } from "./images";
import { resolveYouTubeTitles } from "./youtube-titles";
import { youTubeId } from "./youtube-id";

/**
 * 동기화는 로그인 세션이 아니라 토큰으로 인증된다.
 * RLS 를 넘어야 하므로 service role 로 접근한다. 이 키는 서버에서만 쓰인다 -
 * NEXT_PUBLIC 접두사를 붙이면 안 된다.
 */
function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase 환경변수가 없습니다");
  return createClient(url, key, { auth: { persistSession: false } });
}

export type SyncedSlug = { slug: string; locale: string };

export type SyncResult = {
  synced: SyncedSlug[];
  skipped: { slug: string; reason: string }[];
  removed: SyncedSlug[];
  /**
   * 이번 동기화로 발행이 내려간 글.
   *
   * synced 에 섞어 두면 "글이 반영됐다"와 "글이 내려갔다"를 응답만 보고 구분할
   * 수 없다. 둘은 확인해야 할 것이 다르다 - 반영된 글은 새 화면이 나오는지,
   * 내려간 글은 그 주소가 정말 닫혔는지 봐야 한다.
   */
  unpublished: SyncedSlug[];
  failed: { slug: string; error: string }[];
  /** 이미지 이관에 실패한 글. 글은 반영되지만 그 이미지는 곧 만료돼 깨진다. */
  imageFailures: { slug: string; count: number }[];
  /**
   * 지우기를 멈춘 이유.
   *
   * 노션이 글을 하나도 주지 않았는데 DB 에는 남아 있을 때 채워진다.
   * 이 값이 있으면 호출자가 응답을 실패로 돌린다 - 조용히 넘어가면
   * 사이트가 통째로 빈 것을 아무도 모른 채 지나간다.
   */
  removalBlocked?: string;
  /**
   * 노션이 내보냈지만 우리가 뜻을 모르는 태그. 글자는 살렸지만 모양은 잃었다.
   * 조용히 두면 노션이 블록을 새로 추가했을 때 글이 깨진 채로 몇 달을 간다.
   */
  unknownTags: { slug: string; tags: string[] }[];
};

/*
  글 하나를 반영한다.

  **바뀐 것이 없으면 쓰지 않는다.** 동기화할 때마다 모든 글을 덮으면
  updated_at 트리거가 매번 돌아 "모든 글이 방금 수정됐다"가 된다.
  사이트맵의 lastmod 와 JSON-LD 의 dateModified 가 그 값을 쓰므로,
  크롤러에게 매 동기화마다 전부 바뀌었다고 거짓말하게 된다.

  **발행 시각도 한 번만 찍는다.** published_at 에 매번 now() 를 넣으면
  발행일이 동기화할 때마다 앞으로 밀린다. 처음 발행된 순간을 남기고 지킨다.
*/
type ExistingRow = {
  slug: string;
  locale: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  cover_image: string | null;
  author: string | null;
  entry_date: string | null;
  tags: string[] | null;
  status: string;
  published_at: string | null;
};

const CONTENT_FIELDS = [
  "slug",
  "locale",
  "title",
  "excerpt",
  "content",
  "cover_image",
  "author",
  "entry_date",
  "tags",
  "status",
] as const;

/** 본문에서 처음 나오는 그림. 마크다운 이미지 문법만 본다 */
function firstImageOf(body: string): string | undefined {
  return body.match(/!\[[^\]]*\]\(([^)\s]+)/)?.[1];
}

/** 두 행의 내용이 같은가 - 태그는 순서까지 본다(노션이 순서를 지킨다) */
function sameContent(a: ExistingRow, b: Record<string, unknown>): boolean {
  return CONTENT_FIELDS.every((k) => {
    const x = a[k];
    const y = b[k];
    if (Array.isArray(x) || Array.isArray(y)) {
      return JSON.stringify(x ?? []) === JSON.stringify(y ?? []);
    }
    return (x ?? null) === (y ?? null);
  });
}

/** 쓰기 결과. 발행이 내려간 경우를 따로 알려야 호출자가 그 주소를 확인할 수 있다. */
type WriteOutcome = "unchanged" | "written" | "unpublished";

async function upsertPost(
  supabase: ReturnType<typeof db>,
  post: NotionPost,
): Promise<WriteOutcome> {
  const { data: existing } = await supabase
    .from("posts")
    .select(
      "slug, locale, title, excerpt, content, cover_image, author, entry_date, tags, status, published_at",
    )
    .eq("notion_page_id", post.pageId)
    .maybeSingle();

  const prev = (existing as ExistingRow | null) ?? null;

  const content = {
    slug: post.slug,
    locale: post.locale,
    title: post.title,
    excerpt: post.summary || null,
    content: post.body,
    /*
      대표 이미지를 여기서 정한다. 커버가 없으면 본문 첫 그림, 그것도 없으면 null -
      화면이 본문을 뒤지지 않고 컬럼 하나만 보면 되도록.
      이 시점의 본문은 이미 R2 주소로 바뀌어 있다 - 이미지 이관이 먼저 돈다.
    */
    cover_image: post.coverUrl ?? firstImageOf(post.body) ?? null,
    author: post.author || null,
    entry_date: post.date || null,
    tags: post.tags,
    // 공개 체크가 꺼지면 draft - "지운다"가 아니라 "감춘다"는 의도다
    status: post.published ? "published" : "draft",
  };

  if (prev && sameContent(prev, content)) return "unchanged";

  const row = {
    notion_page_id: post.pageId,
    ...content,
    // 이미 발행된 글은 처음 찍힌 시각을 지킨다
    published_at: post.published ? (prev?.published_at ?? new Date().toISOString()) : null,
    synced_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("posts").upsert(row, { onConflict: "notion_page_id" });
  if (error) throw new Error(error.message);

  // 발행돼 있던 글이 draft 가 됐다면, 그 주소는 이제 닫혀야 한다
  const pulled = prev?.status === "published" && content.status === "draft";
  return pulled ? "unpublished" : "written";
}

/**
 * 노션에서 사라진 글을 DB에서 지운다.
 *
 * 감추지 않고 지우는 이유: 노션이 휴지통에 30일 보관하므로 복구 경로가 이미 있다.
 * 남겨두면 노션에 원본이 없어 되살릴 수도 정리할 수도 없는 유령 데이터가 쌓인다.
 */
async function removeGone(
  supabase: ReturnType<typeof db>,
  livePageIds: string[],
): Promise<SyncedSlug[]> {
  const { data } = await supabase.from("posts").select("id, slug, locale, notion_page_id");
  if (!data?.length) return [];

  const gone = data.filter((r) => !livePageIds.includes(r.notion_page_id as string));
  if (gone.length === 0) return [];

  await supabase
    .from("posts")
    .delete()
    .in(
      "id",
      gone.map((r) => r.id),
    );
  return gone.map((r) => ({ slug: r.slug as string, locale: r.locale as string }));
}

/**
 * 전체 동기화.
 * 한 글이 실패해도 나머지는 반영한다 - 글 하나 때문에 전부 막히면 안 된다.
 * 대신 실패가 하나라도 있으면 호출자가 5xx로 응답한다(조용한 실패가 가장 나쁘다).
 */
export async function syncFromNotion(
  options: {
    /** 노션이 빈 목록을 줘도 지우기를 진행한다. 정말로 다 비울 때만 쓴다. */
    allowEmpty?: boolean;
  } = {},
): Promise<SyncResult> {
  const supabase = db();
  const result: SyncResult = {
    synced: [],
    skipped: [],
    removed: [],
    unpublished: [],
    failed: [],
    imageFailures: [],
    unknownTags: [],
  };

  const pages = await listPages();

  for (const page of pages) {
    let slug = "(알 수 없음)";
    try {
      const raw = await fetchMarkdown(page.id);
      const converted = htmlToMarkdown(raw);
      const post = toPost(page, converted.markdown);
      slug = post.slug || "(슬러그 없음)";

      /*
        슬러그가 없으면 URL을 만들 수 없다.

        초안이면 조용히 건너뛰지만, **발행 체크가 켜진 글은 실패로 격상한다** -
        팀원이 슬러그를 깜빡한 채 발행을 누르면 "동기화는 성공했는데 사이트에
        글이 없는" 상태가 되는데, 그걸 200 으로 돌리면 아무도 알아채지 못한다.
      */
      if (!post.slug) {
        if (post.published) {
          result.failed.push({ slug: post.title, error: "발행 글에 슬러그가 비어 있음" });
        } else {
          result.skipped.push({ slug: post.title, reason: "슬러그가 비어 있음(초안)" });
        }
        continue;
      }

      // 노션은 유튜브 링크 텍스트를 `video` 로 준다. 여기서 진짜 제목을 박아 두면
      // 화면은 묻지 않아도 된다. 못 받으면 원래 텍스트가 남을 뿐이라 발행을 막지 않는다.
      post.body = await resolveYouTubeTitles(post.body, youTubeId);

      // 노션 이미지 URL은 한 시간이면 만료된다. 본문과 커버를 R2로 옮긴다.
      const migrated = await migrateBodyImages(post.body);
      post.body = migrated.body;
      if (migrated.failed > 0) {
        result.imageFailures.push({ slug: post.slug, count: migrated.failed });
      }

      if (post.coverUrl) {
        try {
          post.coverUrl = await migrateImage(post.coverUrl);
        } catch {
          // 커버가 실패하면 만료될 URL이 남는다. 글은 살리되 알린다.
          result.imageFailures.push({ slug: post.slug, count: 1 });
        }
      }

      if (converted.unknownTags.length > 0) {
        result.unknownTags.push({ slug: post.slug, tags: converted.unknownTags });
      }

      const outcome = await upsertPost(supabase, post);
      const entry = { slug: post.slug, locale: post.locale };
      if (outcome === "written") result.synced.push(entry);
      else if (outcome === "unpublished") result.unpublished.push(entry);
      else result.skipped.push({ slug: post.slug, reason: "바뀐 것이 없음" });
    } catch (e) {
      result.failed.push({ slug, error: e instanceof Error ? e.message : String(e) });
    }
  }

  /*
    지우기의 바닥.

    노션이 빈 목록을 주는 데는 두 가지 이유가 있고, 응답만으로는 구분되지 않는다.
    정말로 글을 다 지웠거나, 노션이 잠깐 제대로 답하지 못했거나.
    앞은 드물고 뒤는 흔하다. 그래서 **0 이면 지우지 않는다.**

    지울 것이 애초에 없으면(첫 배포 등) 막을 것도 없으므로 조용히 지나간다.
    정말로 비울 때는 allowEmpty 로 한 번 더 누른다.
  */
  if (pages.length === 0 && !options.allowEmpty) {
    const { count } = await supabase.from("posts").select("id", { count: "exact", head: true });
    if (count && count > 0) {
      result.removalBlocked = `노션이 글을 하나도 주지 않았다 - ${count}개를 지우지 않고 멈춘다`;
      return result;
    }
  }

  result.removed = await removeGone(
    supabase,
    pages.map((p) => p.id),
  );

  return result;
}
