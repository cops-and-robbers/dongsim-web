/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import NotionBlocks from "@/components/blog/NotionBlocks";
import ArticleJsonLd from "@/components/seo/ArticleJsonLd";
import Container from "@/components/ui/Container";
import { findAuthorProfile } from "@/lib/blog/authors";
import { formatPostDate } from "@/lib/blog/format";
import { getBlocks, getPosts } from "@/lib/blog/notion";
import { SITE_URL } from "@/lib/constants";

// 본문은 30분 주기로 재생성. 새 슬러그는 첫 요청 때 온디맨드로 생성된다.
export const revalidate = 1800;

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const posts = await getPosts();
  const post = posts.find((p) => p.slug === slug);
  if (!post) return { title: "이야기 — 경찰과 도둑" };

  return {
    title: `${post.title} — 경찰과 도둑`,
    description: post.summary || `동심지키미 팀의 이야기 — ${post.title}`,
    alternates: { canonical: `/blog/${post.slug}` },
    // og:image는 같은 폴더의 opengraph-image.tsx(동적 브랜드 카드)가 자동으로 붙인다.
    openGraph: {
      title: post.title,
      description: post.summary || undefined,
      type: "article",
      url: `${SITE_URL}/blog/${post.slug}`,
    },
  };
}

// 작성자(팀원이면 프로필 사진 포함) + 날짜 한 줄.
function AuthorLine({ author, date }: { author: string; date: string }) {
  const profile = author ? findAuthorProfile(author) : null;
  return (
    <p className="mt-3 flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
      {profile && (
        <img
          src={profile.photo}
          alt=""
          className="h-6 w-6 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
        />
      )}
      {author && (
        <span className="font-medium text-slate-500 dark:text-slate-400">
          {author}
        </span>
      )}
      {author && date && <span aria-hidden="true">·</span>}
      <span>{formatPostDate(date)}</span>
    </p>
  );
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const posts = await getPosts();
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  const blocks = await getBlocks(post.id);
  // 관련 글 — 최신순에서 현재 글만 빼고 2개 (당근 팀 블로그의 하단 추천 방식).
  const related = posts.filter((p) => p.id !== post.id).slice(0, 2);

  return (
    <main className="py-16 md:py-24">
      <ArticleJsonLd post={post} />
      {/* 본문은 읽기 최적화 좁은 컬럼 — 헤더 순서: 카테고리 → 날짜 → 제목 → 커버.
          Container의 max-w-6xl과 유틸리티가 충돌하지 않도록 내부 div로 폭을 제한한다. */}
      <Container>
        <div className="mx-auto w-full max-w-2xl">
          <header>
            {post.tags.length > 0 && (
              <p className="text-sm font-bold tracking-wide text-brand-blue dark:text-brand-green">
                {post.tags.join(" · ")}
              </p>
            )}
            <AuthorLine author={post.author} date={post.date} />
            <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-brand-ink sm:text-[2.75rem] sm:leading-[1.2] dark:text-white">
              {post.title}
            </h1>
          </header>

          {post.coverUrl && (
            <img
              src={post.coverUrl}
              alt=""
              className="mt-10 aspect-video w-full rounded-3xl object-cover sm:-mx-6 sm:w-[calc(100%+3rem)] sm:max-w-none"
            />
          )}

          <article className="mt-12">
            <NotionBlocks blocks={blocks} />
          </article>
        </div>
      </Container>

      {/* 관련 글 — 목록과 같은 미니멀 카드 */}
      {related.length > 0 && (
        <Container className="mt-24">
          <div className="border-t border-slate-200 pt-14 dark:border-white/10">
            <h2 className="text-2xl font-extrabold tracking-tight text-brand-ink dark:text-white">
              이런 이야기는 어때요?
            </h2>
            <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2">
              {related.map((p) => (
                <Link key={p.id} href={`/blog/${p.slug}`} className="group">
                  <div className="aspect-3/2 w-full overflow-hidden rounded-2xl bg-brand-blue-bg dark:bg-app-black-800">
                    {p.coverUrl ? (
                      <img
                        src={p.coverUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-end justify-center gap-2 pb-4">
                        <img
                          src="/photobooth/cop.svg"
                          alt=""
                          className="h-14 w-auto"
                        />
                        <img
                          src="/photobooth/thief.svg"
                          alt=""
                          className="h-12 w-auto"
                        />
                      </div>
                    )}
                  </div>
                  <h3 className="mt-4 text-lg font-bold leading-snug text-brand-ink transition group-hover:text-brand-blue dark:text-white dark:group-hover:text-brand-green">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
                    {formatPostDate(p.date)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </Container>
      )}
    </main>
  );
}
