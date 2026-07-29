/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import NotionBlocks from "@/components/blog/NotionBlocks";
import PostCard from "@/components/blog/PostCard";
import ArticleJsonLd from "@/components/seo/ArticleJsonLd";
import Container from "@/components/ui/Container";
import { findAuthorProfile } from "@/lib/blog/authors";
import { formatPostDate } from "@/lib/blog/format";
import { getBlocks, getPosts, withImageWidth } from "@/lib/blog/notion";
import { SITE_URL } from "@/lib/constants";

// 본문은 5분 주기로 재생성. 새 슬러그는 첫 요청 때 온디맨드로 생성된다.
// (이미지는 프록시가 자체 캐시하므로 페이지 캐시 수명과 무관하게 안전하다.)
export const revalidate = 300;

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const posts = await getPosts();
  const post = posts.find((p) => p.slug === slug);
  if (!post) return { title: "이야기" };

  return {
    title: post.title,
    description: post.summary || `동심지키미 팀의 이야기 - ${post.title}`,
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

// 작성자 + 날짜 한 줄. 작성자가 팀원이면 아바타가 붙고, 클릭하면 GitHub으로 간다.
function AuthorLine({ author, date }: { author: string; date: string }) {
  const profile = author ? findAuthorProfile(author) : null;
  return (
    <div className="mt-3 flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
      {profile ? (
        <a
          href={profile.github}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2"
        >
          <img
            src={profile.photo}
            alt=""
            className="h-6 w-6 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
          />
          <span className="font-medium text-slate-500 underline-offset-4 group-hover:underline dark:text-slate-400">
            {author}
          </span>
        </a>
      ) : (
        author && (
          <span className="font-medium text-slate-500 dark:text-slate-400">
            {author}
          </span>
        )
      )}
      {author && date && <span aria-hidden="true">·</span>}
      <span>{formatPostDate(date)}</span>
    </div>
  );
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const posts = await getPosts();
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  const blocks = await getBlocks(post.id);
  // 관련 글 - 최신순에서 현재 글만 빼고 2개.
  const related = posts.filter((p) => p.id !== post.id).slice(0, 2);

  // 커버는 이 페이지의 LCP - 프록시 이미지면 반응형 소스를 만들고 미리 불러온다.
  const coverIsProxy = post.coverUrl?.startsWith("/api/blog/image") ?? false;
  const coverSrcSet = coverIsProxy
    ? `${withImageWidth(post.coverUrl!, 800)} 800w, ${withImageWidth(post.coverUrl!, 1600)} 1600w`
    : undefined;
  const coverSizes = coverSrcSet ? "(min-width: 768px) 720px, 100vw" : undefined;
  if (post.coverUrl) {
    preload(withImageWidth(post.coverUrl, 1600), {
      as: "image",
      fetchPriority: "high",
      imageSrcSet: coverSrcSet,
      imageSizes: coverSizes,
    });
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
            <AuthorLine author={post.author} date={post.date} />
            <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-brand-ink sm:text-[2.75rem] sm:leading-[1.2] dark:text-white">
              {post.title}
            </h1>
          </header>

          {post.coverUrl && (
            <img
              src={withImageWidth(post.coverUrl, 1600)}
              srcSet={coverSrcSet}
              sizes={coverSizes}
              fetchPriority="high"
              alt=""
              className="mt-10 aspect-3/2 w-full object-cover sm:-mx-6 sm:w-[calc(100%+3rem)] sm:max-w-none"
            />
          )}

          <article className="mt-12">
            <NotionBlocks blocks={blocks} />
          </article>
        </div>
      </Container>

      {/* 관련 글 - 목록과 같은 미니멀 카드 */}
      {related.length > 0 && (
        <Container className="mt-24">
          <div className="border-t border-slate-200 pt-14 dark:border-white/10">
            <h2 className="text-2xl font-extrabold tracking-tight text-brand-ink dark:text-white">
              이런 이야기는 어때요?
            </h2>
            <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2">
              {related.map((p) => (
                <PostCard key={p.id} post={p} variant="compact" />
              ))}
            </div>
          </div>
        </Container>
      )}
    </main>
  );
}
