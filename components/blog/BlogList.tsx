import PostCard from "@/components/blog/PostCard";
import PostRow from "@/components/blog/PostRow";
import BlogViewToggle from "@/components/blog/BlogViewToggle";
import Container from "@/components/ui/Container";
import EmptyState from "@/components/ui/EmptyState";
import { getPosts } from "@/lib/blog/notion";
import { getMessages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/config";

// 언어별 블로그 목록. 각 로케일 라우트가 얇게 감싸 쓴다.
//
// 카드형·목록형 두 레이아웃을 모두 그려두고 CSS가 하나만 보여준다(globals.css).
// 목록을 클라이언트 상태로 고르면 서버가 그린 카드형이 먼저 보였다가 튀고,
// 여기서 PostCard를 클라이언트 컴포넌트로 끌어들이면 notion.ts를 통해
// sharp가 브라우저 번들로 딸려온다.
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
          <>
            {/* 토글만 오른쪽에 떠 있으면 어디에 걸린 컨트롤인지 모호하다.
                가는 구분선 위에 글 수와 나란히 놓아 목록을 다루는 줄로 읽히게 한다. */}
            <div className="mt-12 flex items-center justify-between border-b border-slate-200 pb-4 dark:border-white/10">
              <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                {copy.view.count.replace("{count}", String(posts.length))}
              </p>
              <BlogViewToggle
                labels={{
                  label: copy.view.label,
                  card: copy.view.card,
                  list: copy.view.list,
                }}
              />
            </div>

            <div
              data-blog-panel="card"
              className="mt-8 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3"
            >
              {posts.map((post, i) => (
                <div
                  key={post.id}
                  style={{ "--blog-item-index": i } as React.CSSProperties}
                >
                  <PostCard post={post} locale={locale} />
                </div>
              ))}
            </div>

            <ul
              data-blog-panel="list"
              className="mt-8 divide-y divide-slate-200 dark:divide-app-black-800"
            >
              {posts.map((post, i) => (
                <li
                  key={post.id}
                  style={{ "--blog-item-index": i } as React.CSSProperties}
                >
                  <PostRow post={post} locale={locale} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Container>
    </main>
  );
}
