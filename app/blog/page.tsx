import type { Metadata } from "next";
import PostCard from "@/components/blog/PostCard";
import Container from "@/components/ui/Container";
import EmptyState from "@/components/ui/EmptyState";
import { getPosts } from "@/lib/blog/notion";

// 목록은 1분 주기로 재생성 - 노션에서 "공개"를 켜면 늦어도 1~2분 안에 반영된다.
// (이미지가 프록시에서 장기 캐시되므로 짧은 주기가 부담이 없다.)
export const revalidate = 60;

export const metadata: Metadata = {
  title: "이야기",
  description:
    "경찰과 도둑을 만드는 동심지키미 팀이 남기는 발자국들 - 개발기, 행사 후기, 그리고 뒷이야기.",
  alternates: {
    canonical: "/blog",
    types: { "application/rss+xml": "/rss.xml" },
  },
};

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <main className="py-20 md:py-28">
      <Container>
        {/* 헤더 - 큰 타이틀 + 부제, 여백을 넉넉히 */}
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
          <EmptyState
            className="mt-20"
            title="아직 첫 이야기를 준비하고 있어요"
            description="곧 팀의 발자국으로 채워질 자리예요."
          />
        ) : (
          <div className="mt-14 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </Container>
    </main>
  );
}
