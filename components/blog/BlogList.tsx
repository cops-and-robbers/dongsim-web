import PostCard from "@/components/blog/PostCard";
import Container from "@/components/ui/Container";
import EmptyState from "@/components/ui/EmptyState";
import { getPosts } from "@/lib/blog/notion";
import { getMessages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/config";

// 언어별 블로그 목록. 각 로케일 라우트가 얇게 감싸 쓴다.
export default async function BlogList({ locale }: { locale: Locale }) {
  const posts = await getPosts(locale);
  const copy = getMessages(locale).blog;

  return (
    <main className="py-20 md:py-28">
      <Container>
        {/* 헤더 - 큰 타이틀 + 부제, 여백을 넉넉히 */}
        <header className="max-w-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-brand-ink sm:text-5xl dark:text-white">
            {copy.title}
          </h1>
          <p className="mt-5 text-lg leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300">
            {copy.lead}
          </p>
        </header>

        {posts.length === 0 ? (
          <EmptyState
            className="mt-20"
            title={copy.empty.title}
            description={copy.empty.description}
          />
        ) : (
          <div className="mt-14 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} locale={locale} />
            ))}
          </div>
        )}
      </Container>
    </main>
  );
}
