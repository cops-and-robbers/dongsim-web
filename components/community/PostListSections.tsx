import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import PostCard from "@/components/community/PostCard";
import { isOpen, listPosts } from "@/lib/community/api";
import { getCommunityText } from "@/lib/i18n/community";
import type { Locale } from "@/lib/i18n/config";

// 모임 목록. 열린 모임을 위에 두고 지난 모임은 아래에 흐리게 남긴다.
//
// 지난 모임을 지우지 않는 이유: 열린 모임이 두세 개일 때 목록이 텅 비면
// "아무도 안 하는구나"로 읽힌다. 실제로 열렸던 기록이 신뢰 신호가 된다.

export default async function PostListSections({ locale }: { locale: Locale }) {
  const { content } = await listPosts(0, 48);
  const t = getCommunityText(locale).list;

  const now = Date.now();
  const open = content.filter((post) => isOpen(post, now));
  const past = content.filter((post) => !isOpen(post, now));

  return (
    <section className="py-16 sm:py-20">
      <Container className="max-w-4xl">
        <p className="text-sm font-bold tracking-wider text-brand-blue dark:text-brand-green">
          {t.eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-balance text-brand-ink sm:text-4xl dark:text-white">
          {t.heading}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
          {t.lede}
        </p>

        {open.length > 0 ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {open.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <EmptyState
            pose="search"
            title={t.emptyTitle}
            description={t.emptyBody}
          />
        )}

        {past.length > 0 && (
          <>
            <div className="mt-14 flex items-baseline gap-3">
              <h2 className="text-lg font-extrabold tracking-tight text-brand-ink dark:text-white">
                {t.pastHeading}
              </h2>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                {t.pastCount(content.length)}
              </p>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {past.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </>
        )}

        <div className="mt-16 rounded-3xl bg-brand-blue-bg p-8 dark:bg-app-black-900">
          <h2 className="text-xl font-extrabold tracking-tight text-brand-ink dark:text-white">
            {t.ctaHeading}
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">{t.ctaBody}</p>
          <Button href="/download" className="mt-6">
            {t.ctaButton}
          </Button>
        </div>
      </Container>
    </section>
  );
}
