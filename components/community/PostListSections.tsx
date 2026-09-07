import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import PostCard from "@/components/community/PostCard";
import {
  allOpenPosts,
  isOpen,
  listPosts,
  listScopeOf,
  type ListScope,
} from "@/lib/community/api";
import { getCommunityText } from "@/lib/i18n/community";
import type { Locale } from "@/lib/i18n/config";

// 모임 목록. 열린 모임을 위에 두고 지난 모임은 아래에 흐리게 남긴다.
//
// 열린 모임은 전부 보여준다. "더 보기"를 두지 않는 대신 서버에서 커서를 따라
// 끝까지 받는다. 열린 모임은 날짜가 지나면 닫혀서 개수가 저절로 유한하다.
// 응답이 캐시되는 동안 시각이 흐르므로 받아온 뒤 한 번 더 거르고 세운다.
//
// 지난 모임을 지우지 않는 이유: 열린 모임이 두세 개일 때 목록이 텅 비면
// "아무도 안 하는구나"로 읽힌다. 실제로 열렸던 기록이 신뢰 신호가 된다.
// 다만 다 보여주면 지난 것이 화면을 덮어버려서 최근 넷만 남긴다.

/** 가까운 날짜부터 */
const SOONEST = (a: { meetingAt: string }, b: { meetingAt: string }) =>
  new Date(a.meetingAt).getTime() - new Date(b.meetingAt).getTime();

/** 최근에 열렸던 것부터 */
const RECENT = (a: { meetingAt: string }, b: { meetingAt: string }) => -SOONEST(a, b);

const PAST_LIMIT = 4;

// 열린 모임 전량 수집(allOpenPosts)은 사이트맵과 같이 쓰므로 api 로 옮겼다(#107).
const PAGE_SIZE = 48;

/** 렌더 밖에서 시각을 한 번 재서, 열린/지난 분류가 한 요청 안에서 일관되게 한다. */
async function loadPosts(scope: ListScope) {
  const now = Date.now();
  // 지난 모임은 "최근에 써진" 순서(LATEST)로 받아야 최근에 지난 것을 집는다
  const [openAll, latest] = await Promise.all([
    allOpenPosts(scope, now),
    listPosts({ ...scope, size: PAGE_SIZE, sort: "LATEST" }),
  ]);
  return {
    open: openAll.sort(SOONEST),
    past: latest.content.filter((post) => !isOpen(post, now)).sort(RECENT),
  };
}

export default async function PostListSections({ locale }: { locale: Locale }) {
  // 범위를 안 주면 400 이다. 앱은 현재 위치를 쓰지만 웹은 경로의 언어로 정한다
  const { open, past } = await loadPosts(listScopeOf(locale));
  const t = getCommunityText(locale).list;

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
              <PostCard key={post.id} post={post} locale={locale} />
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
            <h2 className="mt-14 text-lg font-extrabold tracking-tight text-brand-ink dark:text-white">
              {t.pastHeading}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {past.slice(0, PAST_LIMIT).map((post) => (
                <PostCard key={post.id} post={post} locale={locale} />
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
