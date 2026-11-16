/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import CharacterDuo from "@/components/ui/CharacterDuo";
import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { formatPostDate } from "@/lib/blog/format";
import { getPosts, type BlogPost } from "@/lib/blog/store";
import { getMessages } from "@/lib/i18n/messages";
import { localizedPath, type Locale } from "@/lib/i18n/config";

// 홈 아래 최근 글 3개와 목록 버튼(#343).
//
// 바깥에서 들어오는 링크는 거의 모두 홈으로 온다(앱 스토어의 개발자 웹사이트 링크, 2026-11-16 서치 콘솔).
// 그런데 홈에서 글로 가는 링크가 없어서, 글은 색인되지 않은 목록 페이지에서만 링크를 받았다.
//
// 모양은 홈의 다른 칸을 그대로 따른다. 블로그 목록의 작은 카드를 가져왔더니 랜딩 안에서 따로 놀았다.
// - 제목: 두 줄 큰 제목과 설명 한 줄(이용 방법, 기능 소개 칸과 같은 크기)
// - 카드: 기능 소개 카드와 같은 액자(둥근 테두리, 위 그림, 올리면 살짝 뜸)에 분류, 제목, 요약, 날짜
// - 목록 버튼: 제목 줄 오른쪽 알약 버튼(사이트 공통 outline 버튼 모양). 폰에서는 카드 아래 한 줄을 다 쓴다
// - 폰에서는 카드를 옆으로 넘긴다. 다음 카드가 조금 보여서 더 있다는 걸 알고, 세 장이 세로로 길게 쌓이지 않는다
//
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
  const listHref = localizedPath("/blog", locale);

  return (
    <section
      className={`py-24 transition-colors duration-500 sm:py-32 ${
        tone === "slate" ? "bg-slate-50 dark:bg-app-black-900" : "bg-white dark:bg-app-black"
      }`}
    >
      <Container>
        <div className="flex items-end justify-between gap-10">
          <ScrollReveal animation="fadeInUp">
            <div className="max-w-2xl">
              <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl dark:text-white">
                {copy.title1}
                <br />
                {copy.title2}
              </h2>
              <p className="mt-5 text-pretty text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
                {copy.sub}
              </p>
            </div>
          </ScrollReveal>
          <MoreButton href={listHref} label={copy.more} className="hidden shrink-0 md:inline-flex" />
        </div>

        <ul className="-mx-6 mt-14 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
          {posts.slice(0, 3).map((post, i) => (
            <li key={post.id} className="w-[78%] shrink-0 snap-start sm:w-[45%] md:w-auto">
              <ScrollReveal animation="fadeInUp" delayMs={i * 80} className="h-full">
                <StoryCard post={post} locale={locale} />
              </ScrollReveal>
            </li>
          ))}
        </ul>

        <MoreButton href={listHref} label={copy.more} className="mt-10 flex w-full md:hidden" />
      </Container>
    </section>
  );
}

// 사이트 공통 Button 의 outline 모양에 화살표를 더했다. Button 은 inline-block 이라 화살표를 나란히 두려면 여기서 그린다
function MoreButton({ href, label, className }: { href: string; label: string; className: string }) {
  return (
    <Link
      href={href}
      className={`group items-center justify-center gap-1.5 rounded-full border border-slate-300 px-7 py-3 text-base font-bold text-slate-700 transition hover:-translate-y-0.5 hover:border-brand-blue hover:text-brand-blue active:scale-95 dark:border-white/15 dark:text-slate-200 dark:hover:border-brand-green dark:hover:text-brand-green ${className}`}
    >
      {label}
      <svg viewBox="0 0 16 16" className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
        <path
          d="M3 8h9M8.5 4.5 12 8l-3.5 3.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </Link>
  );
}

// 기능 소개 카드(FeaturesSection)와 같은 액자
function StoryCard({ post, locale }: { post: BlogPost; locale: Locale }) {
  return (
    <Link
      href={localizedPath(`/blog/${post.slug}`, locale)}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-app-black dark:ring-white/10 dark:hover:shadow-2xl dark:hover:ring-white/20"
    >
      <div className="aspect-7/5 w-full overflow-hidden bg-brand-blue-bg dark:bg-app-black-800">
        {post.coverUrl ? (
          <img
            src={post.coverUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-end justify-center pb-4">
            <CharacterDuo size="sm" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col border-t border-slate-100 p-6 sm:p-7 dark:border-white/10">
        {post.tags.length > 0 && (
          <p className="text-xs font-bold tracking-wide text-brand-blue dark:text-brand-green">
            {post.tags.slice(0, 2).join(" · ")}
          </p>
        )}
        <h3 className="mt-2 line-clamp-2 text-lg font-bold leading-snug text-slate-900 transition-colors group-hover:text-brand-blue dark:text-white dark:group-hover:text-brand-green">
          {post.title}
        </h3>
        {post.summary && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {post.summary}
          </p>
        )}
        <p className="mt-auto pt-4 text-sm text-slate-400 dark:text-slate-500">
          {formatPostDate(post.date, post.locale)}
        </p>
      </div>
    </Link>
  );
}
