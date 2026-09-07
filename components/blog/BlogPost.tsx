/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { Markdown } from "@/components/blog/markdown/Markdown";
import PostCard from "@/components/blog/PostCard";
import ArticleJsonLd from "@/components/seo/ArticleJsonLd";
import Container from "@/components/ui/Container";
import { formatPostDate } from "@/lib/blog/format";
import { getPost, getPosts } from "@/lib/blog/store";
import { getMessages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/config";

// 작성자 + 날짜 한 줄. 날짜는 보는 사람이 아니라 글의 언어를 따른다.
function AuthorLine({
  author,
  date,
  locale,
}: {
  author: string;
  date: string;
  locale: Locale;
}) {
  return (
    <div className="mt-3 flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
      {author && (
        <span className="font-medium text-slate-500 dark:text-slate-400">
          {author}
        </span>
      )}
      {author && date && <span aria-hidden="true">·</span>}
      <span>{formatPostDate(date, locale)}</span>
    </div>
  );
}

// 언어별 블로그 본문. 각 로케일 라우트가 얇게 감싸 쓴다.
export default async function BlogPost({
  slug,
  locale,
}: {
  slug: string;
  locale: Locale;
}) {
  const [post, posts] = await Promise.all([getPost(locale, slug), getPosts(locale)]);
  if (!post) notFound();

  const copy = getMessages(locale).blog;
  // 관련 글 - 같은 언어 최신순에서 현재 글만 빼고 2개.
  const related = posts.filter((p) => p.id !== post.id).slice(0, 2);

  // 커버는 이 페이지의 LCP - R2 영구 URL 이라 그대로 미리 불러온다.
  if (post.coverUrl) {
    preload(post.coverUrl, { as: "image", fetchPriority: "high" });
  }

  return (
    <main className="py-16 md:py-24">
      <ArticleJsonLd post={post} />
      {/* 본문은 읽기 최적화 좁은 컬럼 - 헤더 순서: 카테고리 → 날짜 → 제목 → 커버.
          Container의 max-w-6xl과 유틸리티가 충돌하지 않도록 내부 div로 폭을 제한한다. */}
      <Container>
        <div className="mx-auto w-full max-w-2xl">
          <header>
            {post.tags.length > 0 && (
              <p className="text-sm font-bold tracking-wide text-brand-blue dark:text-brand-green">
                {post.tags.join(" · ")}
              </p>
            )}
            <AuthorLine author={post.author} date={post.date} locale={post.locale} />
            <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-brand-ink sm:text-[2.75rem] sm:leading-[1.2] dark:text-white">
              {post.title}
            </h1>
          </header>

          {post.coverUrl && (
            <img
              src={post.coverUrl}
              fetchPriority="high"
              alt={post.title}
              className="mt-10 aspect-3/2 w-full object-cover sm:-mx-6 sm:w-[calc(100%+3rem)] sm:max-w-none"
            />
          )}

          <article className="mt-12 text-lg text-slate-600 dark:text-slate-300">
            <Markdown>{post.body}</Markdown>
          </article>
        </div>
      </Container>

      {/* 관련 글 - 목록과 같은 미니멀 카드 */}
      {related.length > 0 && (
        <Container className="mt-24">
          <div className="border-t border-slate-200 pt-14 dark:border-white/10">
            <h2 className="text-2xl font-extrabold tracking-tight text-brand-ink dark:text-white">
              {copy.related}
            </h2>
            <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2">
              {related.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  variant="compact"
                  locale={locale}
                />
              ))}
            </div>
          </div>
        </Container>
      )}
    </main>
  );
}
