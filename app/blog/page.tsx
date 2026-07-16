/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/ui/Container";
import { findAuthorProfile } from "@/lib/blog/authors";
import { formatPostDate } from "@/lib/blog/format";
import { getPosts, withImageWidth } from "@/lib/blog/notion";

// 목록은 1분 주기로 재생성 — 노션에서 "공개"를 켜면 늦어도 1~2분 안에 반영된다.
// (이미지가 프록시에서 장기 캐시되므로 짧은 주기가 부담이 없다.)
export const revalidate = 60;

export const metadata: Metadata = {
  title: "이야기",
  description:
    "경찰과 도둑을 만드는 동심지키미 팀이 남기는 발자국들 — 개발기, 행사 후기, 그리고 뒷이야기.",
  alternates: { canonical: "/blog" },
};

// 작성자(팀원이면 프로필 사진 포함) + 날짜 한 줄.
function Byline({
  author,
  date,
  className = "",
}: {
  author: string;
  date: string;
  className?: string;
}) {
  const profile = author ? findAuthorProfile(author) : null;
  return (
    <p
      className={`flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 ${className}`}
    >
      {profile && (
        <img
          src={profile.photo}
          alt=""
          className="h-5 w-5 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
        />
      )}
      {author && <span>{author}</span>}
      {author && date && <span aria-hidden="true">·</span>}
      <span>{formatPostDate(date)}</span>
    </p>
  );
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <main className="py-20 md:py-28">
      <Container>
        {/* 헤더 — 큰 타이틀 + 부제, 여백을 넉넉히 */}
        <header className="max-w-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-brand-ink sm:text-5xl dark:text-white">
            이야기
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
            경찰과 도둑을 만들며 남긴 발자국들.
            <br className="hidden sm:block" />
            개발기, 행사 후기, 그리고 뒷이야기를 기록해요.
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="mt-20 py-16 text-center">
            <div className="mb-6 flex items-end justify-center gap-2">
              <img src="/photobooth/cop.svg" alt="" className="h-20 w-auto" />
              <img src="/photobooth/thief.svg" alt="" className="h-16 w-auto" />
            </div>
            <p className="text-lg font-bold text-brand-ink dark:text-white">
              아직 첫 이야기를 준비하고 있어요
            </p>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              곧 팀의 발자국으로 채워질 자리예요.
            </p>
          </div>
        ) : (
          // 당근 팀 블로그처럼 테두리 없는 미니멀 카드 — 썸네일과 텍스트, 여백으로만 구분.
          <div className="mt-14 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                <div className="aspect-3/2 w-full overflow-hidden rounded-2xl bg-brand-blue-bg dark:bg-app-black-800">
                  {post.coverUrl ? (
                    <img
                      src={withImageWidth(post.coverUrl, 800)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-end justify-center gap-2 pb-4">
                      <img
                        src="/photobooth/cop.svg"
                        alt=""
                        className="h-16 w-auto"
                      />
                      <img
                        src="/photobooth/thief.svg"
                        alt=""
                        className="h-14 w-auto"
                      />
                    </div>
                  )}
                </div>

                {post.tags.length > 0 && (
                  <p className="mt-5 text-xs font-bold tracking-wide text-brand-blue dark:text-brand-green">
                    {post.tags.join(" · ")}
                  </p>
                )}
                <h2 className="mt-2 text-xl font-bold leading-snug text-brand-ink transition group-hover:text-brand-blue dark:text-white dark:group-hover:text-brand-green">
                  {post.title}
                </h2>
                {post.summary && (
                  <p className="mt-2 line-clamp-2 leading-relaxed text-slate-500 dark:text-slate-400">
                    {post.summary}
                  </p>
                )}
                <Byline
                  author={post.author}
                  date={post.date}
                  className="mt-3"
                />
              </Link>
            ))}
          </div>
        )}
      </Container>
    </main>
  );
}
