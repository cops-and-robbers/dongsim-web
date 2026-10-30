/**
 * 블로그 읽기 계층 (#109 2단계).
 *
 * 화면·RSS·사이트맵·OG 카드가 전부 여기만 본다. 데이터는 동기화(/api/blog/sync)가
 * 채워 둔 Supabase 를 읽는다 - 렌더 경로에 노션이 끼지 않으므로 노션 장애·지연이
 * 사이트에 전파되지 않는다.
 *
 * 캐시는 페이지 ISR(목록 60초 / 본문 300초, 기존 주기 그대로)에 맡긴다.
 * 동기화가 revalidatePath 로 캐시를 버리고 데우므로 발행은 즉시 반영된다.
 *
 * 조회 오류는 삼키지 않고 던진다(#188). 재생성 중에 오류가 나면 Next 가 직전의
 * 정상 페이지를 계속 내보내는데, 빈 목록으로 바꾸면 그 장치가 꺼진다. 실제로
 * 글 페이지가 공통 제목·홈 canonical 이나 404 로 캐시돼 검색엔진에 나갔다.
 *
 * BlogPost 타입은 옛 노션 직독판(3단계에서 제거)과 같은 모양이다 -
 * 화면 코드가 데이터 출처를 몰라도 되도록.
 */

import { createClient } from "@supabase/supabase-js";
import { cache } from "react";
import type { Locale } from "@/lib/i18n/config";

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  author: string;
  date: string; // ISO(YYYY-MM-DD)
  tags: string[];
  /** 목록 카드·OG에 쓸 커버 이미지 URL(R2). 없으면 null. */
  coverUrl: string | null;
  locale: Locale;
};

export type BlogPostWithBody = BlogPost & {
  /** 본문 마크다운. 이미지 URL 은 이미 R2 로 치환돼 있다. */
  body: string;
};

/**
 * 읽기 전용이지만 service role 을 쓴다. anon 키로도 발행 글은 읽히지만(RLS),
 * 서버에서만 도는 코드라 키를 나눠 얻는 것이 없고, 프로젝트가 Data API 를
 * secret 전용으로 잠가 둔 상태와도 맞는다.
 */
function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

type Row = {
  id: string;
  slug: string;
  locale: string;
  title: string;
  excerpt: string | null;
  content?: string;
  cover_image: string | null;
  author: string | null;
  entry_date: string | null;
  tags: string[] | null;
};

function toPost(row: Row): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.excerpt ?? "",
    author: row.author ?? "",
    date: row.entry_date ?? "",
    tags: row.tags ?? [],
    coverUrl: row.cover_image,
    locale: row.locale as Locale,
  };
}

const LIST_COLUMNS = "id, slug, locale, title, excerpt, cover_image, author, entry_date, tags";

/** 조회 오류를 어느 조회에서 났는지와 함께 던진다. */
function fail(what: string, message: string): never {
  throw new Error(`블로그 ${what} 조회 실패: ${message}`);
}

/**
 * 발행된 글 목록(본문 제외), 최신 날짜순.
 * 연결 설정이 없으면(로컬) 빈 목록, 조회 오류는 던진다.
 */
export async function getPosts(locale: Locale): Promise<BlogPost[]> {
  const supabase = db();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("posts")
    .select(LIST_COLUMNS)
    .eq("locale", locale)
    .eq("status", "published")
    .order("entry_date", { ascending: false });

  if (error) fail("목록", error.message);
  return ((data ?? []) as Row[]).map(toPost);
}

/** 모든 언어의 발행 글. 사이트맵이 쓴다. */
export async function getAllPosts(): Promise<BlogPost[]> {
  const supabase = db();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("posts")
    .select(LIST_COLUMNS)
    .eq("status", "published")
    .order("entry_date", { ascending: false });

  if (error) fail("전체 목록", error.message);
  return ((data ?? []) as Row[]).map(toPost);
}

/**
 * 글 하나(본문 포함). 없거나 미발행이면 null - 호출자가 notFound 로 돌린다.
 * 조회 오류는 "없는 글"과 다르므로 던진다.
 * 메타데이터와 본문이 같은 요청에서 같은 글을 묻으므로 요청 안에서 한 번으로 묶는다.
 */
export const getPost = cache(async function getPost(
  locale: Locale,
  slug: string,
): Promise<BlogPostWithBody | null> {
  const supabase = db();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("posts")
    .select(`${LIST_COLUMNS}, content`)
    .eq("locale", locale)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) fail(`글(${locale}/${slug})`, error.message);
  if (!data) return null;
  const row = data as Row;
  return { ...toPost(row), body: row.content ?? "" };
});
