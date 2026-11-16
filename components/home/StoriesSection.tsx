import Link from "next/link";
import PostCard from "@/components/blog/PostCard";
import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { getPosts } from "@/lib/blog/store";
import { getMessages } from "@/lib/i18n/messages";
import { localizedPath, type Locale } from "@/lib/i18n/config";

// 홈 아래 최근 글 카드 3개와 목록 링크(#343).
//
// 바깥에서 들어오는 링크는 거의 모두 홈으로 온다(앱 스토어의 개발자 웹사이트 링크, 2026-11-16 서치 콘솔).
// 그런데 홈에서 글로 가는 링크가 없어서, 글은 색인되지 않은 목록 페이지에서만 링크를 받았다.
// 글이 없는 언어(영어)는 칸을 그리지 않고, 글을 못 읽어도 홈은 그대로 연다.
export default async function StoriesSection({
  locale,
  tone = "white",
}: {
  locale: Locale;
  // 앞뒤 칸과 배경이 겹치지 않게 고른다
  tone?: "white" | "slate";
}) {
  const posts = await getPosts(locale).catch(() => []);
  if (posts.length === 0) return null;
  const copy = getMessages(locale).home.stories;

  return (
    <section
      className={`py-24 transition-colors duration-500 sm:py-32 ${
        tone === "slate" ? "bg-slate-50 dark:bg-app-black-900" : "bg-white dark:bg-app-black"
      }`}
    >
      <Container>
        <ScrollReveal animation="fadeInUp">
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-brand-ink sm:text-4xl dark:text-white">
            {copy.heading}
          </h2>
          <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
            {copy.sub}
          </p>
        </ScrollReveal>
        <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {posts.slice(0, 3).map((post) => (
            <PostCard key={post.id} post={post} variant="compact" locale={locale} />
          ))}
        </div>
        <Link
          href={localizedPath("/blog", locale)}
          className="mt-10 inline-flex items-center gap-1 text-base font-bold text-brand-blue underline-offset-4 hover:underline dark:text-brand-green"
        >
          {copy.more} <span aria-hidden>→</span>
        </Link>
      </Container>
    </section>
  );
}
