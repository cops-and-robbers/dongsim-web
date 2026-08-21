import Link from "next/link";
import Container from "@/components/ui/Container";
import PostCard from "@/components/community/PostCard";
import {
  CalendarIcon,
  LocationIcon,
  PeopleIcon,
} from "@/components/icons/CommunityIcons";
import {
  countryOf,
  isOpen,
  listPosts,
  mapUrl,
  seatsLeft,
  type CommunityPost,
} from "@/lib/community/api";
import { daysUntil, meetingLabel } from "@/lib/community/format";
import { getCommunityText } from "@/lib/i18n/community";
import type { Locale } from "@/lib/i18n/config";

// 모집글 상세. 공유 링크가 떨어지는 자리라 이 페이지가 전환을 정한다.
//
// 뒤로 가는 링크를 두지 않는다. 여기 오는 사람 대부분은 목록이 아니라 남이 보낸
// 링크로 들어온다. 가본 적 없는 목록으로 "돌아가라"고 하는 셈이다.
// 대신 글이 끝나면 다른 모임을 보여준다. 블로그 상세가 쓰는 방식과 같다.
//
// 웹에 두지 않는 것: 댓글, 참여자 명단, 정확한 집결 지점, 좋아요·스크랩.
// 앞의 셋은 남의 것이라서, 마지막은 비로그인이 누를 수 없어서다(#46).

export default async function PostDetailSections({
  post,
  locale,
}: {
  post: CommunityPost;
  locale: Locale;
}) {
  const text = getCommunityText(locale);
  const t = text.detail;
  const c = text.card;
  const open = isOpen(post);
  const left = seatsLeft(post);
  const full = left !== null && left <= 0;
  const days = open ? daysUntil(post.meetingAt) : null;
  const until =
    days === null ? null : days === 0 ? c.today : days === 1 ? c.tomorrow : c.inDays(days);
  const more = await otherOpenPosts(post, locale, 2);

  return (
    <main className="pt-10 pb-28 sm:pt-16 sm:pb-32">
      <Container className="max-w-2xl">
        <header>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                open
                  ? "bg-brand-blue-bg text-brand-blue dark:bg-brand-green/15 dark:text-brand-green"
                  : "bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500"
              }`}
            >
              {open ? c.open : c.closed}
            </span>
            {left !== null && (
              <span className="flex items-center gap-1.5 text-sm font-bold text-slate-500 tabular-nums dark:text-slate-400">
                <PeopleIcon size={14} />
                {c.seats(post.currentParticipants ?? 0, post.maxParticipants)}
              </span>
            )}
          </div>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-balance text-brand-ink sm:text-4xl dark:text-white">
            {post.title}
          </h1>
        </header>

        {!open && (
          <div className="mt-7 rounded-2xl bg-slate-100 p-5 dark:bg-white/5">
            <p className="font-bold text-brand-ink dark:text-white">
              {full ? t.fullTitle : t.closedTitle}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {full ? t.fullBody : t.closedBody}
            </p>
          </div>
        )}

        {/* 일시가 장소보다 위다. 그날 갈 수 없으면 장소는 볼 이유가 없다 */}
        <dl className="mt-7 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
          <div className="flex items-baseline gap-4 p-4 sm:px-5">
            <dt className="w-12 shrink-0 text-sm font-semibold text-slate-400 dark:text-slate-500">
              {t.when}
            </dt>
            <dd className="min-w-0 font-semibold text-brand-ink dark:text-white">
              <span className="flex items-center gap-2">
                <CalendarIcon
                  size={15}
                  className="text-brand-blue dark:text-brand-green"
                />
                {meetingLabel(post.meetingAt, locale)}
              </span>
              {until && (
                <span className="mt-1 block text-sm font-normal text-slate-500 dark:text-slate-400">
                  {until}
                </span>
              )}
            </dd>
          </div>

          <div className="flex items-baseline gap-4 border-t border-slate-100 p-4 sm:px-5 dark:border-white/5">
            <dt className="w-12 shrink-0 text-sm font-semibold text-slate-400 dark:text-slate-500">
              {t.place}
            </dt>
            <dd className="min-w-0 font-semibold text-brand-ink dark:text-white">
              <span className="flex items-center gap-2">
                <LocationIcon size={15} />
                {post.location.placeName}
              </span>
              {post.location.region && (
                <span className="mt-1 block text-sm font-normal text-slate-500 dark:text-slate-400">
                  {post.location.region}
                </span>
              )}
              {/* 사실과 안내는 성격이 달라 한 줄에 묶지 않는다 */}
              <span className="mt-1.5 block text-sm font-normal text-slate-400 dark:text-slate-500">
                {t.placeHint}
              </span>
            </dd>
            <a
              href={mapUrl(post)}
              target="_blank"
              rel="noreferrer"
              className="ml-auto shrink-0 text-sm font-bold text-brand-blue dark:text-brand-green"
            >
              {t.openMap}
            </a>
          </div>

          {/* 닉네임이 자동 생성이라 앞세울 값이 아니다. 일시·장소와 같은 무게로 둔다 */}
          {post.writerNickname && (
            <div className="flex items-baseline gap-4 border-t border-slate-100 p-4 sm:px-5 dark:border-white/5">
              <dt className="w-12 shrink-0 text-sm font-semibold text-slate-400 dark:text-slate-500">
                {t.host}
              </dt>
              <dd className="min-w-0 font-semibold text-brand-ink dark:text-white">
                {post.writerNickname}
              </dd>
            </div>
          )}
        </dl>

        <p className="mt-7 text-base leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-200">
          {post.content}
        </p>

        {open && left !== null && (
          <div className="mt-8">
            <div className="flex items-baseline justify-between">
              <strong className="font-extrabold tracking-tight text-brand-ink dark:text-white">
                {left > 0 ? c.seatsLeft(left) : c.seatsNone}
              </strong>
              <span className="text-sm text-slate-500 tabular-nums dark:text-slate-400">
                {c.seats(post.currentParticipants ?? 0, post.maxParticipants)}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-brand-blue dark:bg-brand-green"
                style={{
                  width: `${Math.round(((post.currentParticipants ?? 0) / post.maxParticipants) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </Container>

      {/* 글이 끝나면 다른 모임. 링크로 들어온 사람에게 필요한 건 뒤로가 아니라 다음이다 */}
      <Container className="mt-20 max-w-2xl">
        <div className="border-t border-slate-200 pt-12 dark:border-white/10">
          <div className="flex items-baseline justify-between gap-4">
            {more.length > 0 && (
              <h2 className="text-xl font-extrabold tracking-tight text-brand-ink dark:text-white">
                {t.moreHeading}
              </h2>
            )}
            <Link
              href="/community"
              className="ml-auto shrink-0 text-sm font-bold text-brand-blue dark:text-brand-green"
            >
              {t.moreAll}
            </Link>
          </div>
          {more.length > 0 && (
            <div className="mt-6 grid gap-4">
              {more.map((item) => (
                <PostCard key={item.id} post={item} locale={locale} />
              ))}
            </div>
          )}
        </div>
      </Container>

      {/* 이 페이지의 목적이 하나뿐이라 바닥에 붙여 둔다. 스크롤 길이와 무관하게 보인다 */}
      <div className="sticky bottom-0 mt-10 border-t border-slate-200 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-app-black/90">
        <Container className="flex max-w-2xl items-center gap-4 py-3.5">
          <p className="hidden text-xs text-slate-400 sm:block dark:text-slate-500">
            {open ? t.joinHint : t.otherHint}
          </p>
          <Link
            href="/download"
            className="ml-auto rounded-full bg-brand-blue px-7 py-3 text-center font-bold text-white transition hover:-translate-y-0.5 active:scale-95 max-sm:w-full dark:bg-brand-green dark:text-app-black"
          >
            {open ? t.joinButton : t.otherButton}
          </Link>
        </Container>
      </div>
    </main>
  );
}

/**
 * 아래에 붙일 다른 열린 모임 몇 개.
 * 같은 나라 글만 보여준다. 일본 글 밑에 한국 모임이 뜨면 도움이 안 된다.
 */
async function otherOpenPosts(post: CommunityPost, locale: Locale, take: number) {
  const country = post.location.countryCode ?? countryOf(locale);
  const { content } = await listPosts({ countryCode: country, size: 24 });
  const now = Date.now();
  return content
    .filter((item) => item.id !== post.id && isOpen(item, now))
    .slice(0, take);
}
