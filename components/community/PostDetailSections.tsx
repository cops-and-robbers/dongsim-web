import Link from "next/link";
import Container from "@/components/ui/Container";
import PostCard from "@/components/community/PostCard";
import { CalendarIcon, PeopleIcon, PinIcon } from "@/components/icons/CommunityIcons";
import {
  isOpen,
  listPosts,
  mapUrl,
  seatsLeft,
  type CommunityPost,
} from "@/lib/community/api";
import { meetingLabel, seatLabel, untilLabel } from "@/lib/community/format";
import { getCommunityText } from "@/lib/i18n/community";
import type { Locale } from "@/lib/i18n/config";

// 모집글 상세. 공유 링크가 떨어지는 자리라 이 페이지가 전환을 정한다.
//
// 웹에 두지 않는 것: 댓글, 참여자 명단, 정확한 집결 지점.
// 남의 대화이고, 시간과 장소가 다 공개되면 실제 위험이 된다(#46).

export default async function PostDetailSections({
  post,
  locale,
}: {
  post: CommunityPost;
  locale: Locale;
}) {
  const t = getCommunityText(locale).detail;
  const open = isOpen(post);
  const left = seatsLeft(post);
  const full = left !== null && left <= 0;
  const map = mapUrl(post);
  const until = untilLabel(post.meetingAt);

  // 마감된 글은 막다른 길이 되면 안 된다. 오픈 채널에 뿌려진 링크는 며칠 뒤에 눌린다
  const nearby = open ? [] : await openPostsExcept(post.id, 2);

  return (
    <section className="pt-10 pb-28 sm:pt-14 sm:pb-32">
      <Container className="max-w-2xl">
        <Link
          href="/community"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-brand-ink dark:text-slate-400 dark:hover:text-white"
        >
          <span aria-hidden="true">←</span>
          {t.back}
        </Link>

        <div className="mt-6 flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              open
                ? "bg-brand-blue-bg text-brand-blue dark:bg-brand-green/15 dark:text-brand-green"
                : "bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500"
            }`}
          >
            {open ? "모집중" : "마감"}
          </span>
          {left !== null && (
            <span className="flex items-center gap-1.5 text-sm font-bold text-slate-500 tabular-nums dark:text-slate-400">
              <PeopleIcon size={14} />
              {post.currentParticipants} / {post.maxParticipants}명
            </span>
          )}
        </div>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-balance text-brand-ink sm:text-4xl dark:text-white">
          {post.title}
        </h1>

        {!open && (
          <div className="mt-6 rounded-2xl bg-slate-100 p-5 dark:bg-white/5">
            <p className="font-bold text-brand-ink dark:text-white">
              {full ? t.fullTitle : t.closedTitle}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {full ? t.fullBody : t.closedBody}
            </p>
          </div>
        )}

        <dl className="mt-7 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
          {post.placeName && (
            <div className="flex items-baseline gap-4 p-4 sm:px-5">
              <dt className="w-14 shrink-0 text-sm font-semibold text-slate-400 dark:text-slate-500">
                {t.place}
              </dt>
              <dd className="font-semibold text-brand-ink dark:text-white">
                <span className="flex items-center gap-2">
                  <PinIcon size={15} className="text-brand-blue dark:text-brand-green" />
                  {post.placeName}
                </span>
                <span className="mt-1 block text-sm font-normal text-slate-400 dark:text-slate-500">
                  {t.placeHint}
                </span>
              </dd>
              {map && (
                <a
                  href={map}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto shrink-0 text-sm font-bold text-brand-blue dark:text-brand-green"
                >
                  {t.openMap}
                </a>
              )}
            </div>
          )}
          <div className="flex items-baseline gap-4 border-t border-slate-100 p-4 first:border-t-0 sm:px-5 dark:border-white/5">
            <dt className="w-14 shrink-0 text-sm font-semibold text-slate-400 dark:text-slate-500">
              {t.when}
            </dt>
            <dd className="font-semibold text-brand-ink dark:text-white">
              <span className="flex items-center gap-2">
                <CalendarIcon size={15} className="text-brand-blue dark:text-brand-green" />
                {meetingLabel(post.meetingAt)}
              </span>
              {until && (
                <span className="mt-1 block text-sm font-normal text-slate-400 dark:text-slate-500">
                  {until}
                </span>
              )}
            </dd>
          </div>
          {post.writerNickname && (
            <div className="flex items-baseline gap-4 border-t border-slate-100 p-4 sm:px-5 dark:border-white/5">
              <dt className="w-14 shrink-0 text-sm font-semibold text-slate-400 dark:text-slate-500">
                {t.host}
              </dt>
              <dd className="font-semibold text-brand-ink dark:text-white">
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
                {seatLabel(left)}
              </strong>
              <span className="text-sm text-slate-500 tabular-nums dark:text-slate-400">
                {post.currentParticipants} / {post.maxParticipants}명
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

        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 p-5 dark:border-white/10">
          <p className="font-bold text-brand-ink dark:text-white">{t.inAppTitle}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t.inAppBody}
          </p>
        </div>

        {nearby.length > 0 && (
          <>
            <h2 className="mt-14 text-lg font-extrabold tracking-tight text-brand-ink dark:text-white">
              {t.openNearby}
            </h2>
            <div className="mt-4 grid gap-4">
              {nearby.map((item) => (
                <PostCard key={item.id} post={item} />
              ))}
            </div>
          </>
        )}
      </Container>

      {/* 이 페이지의 목적이 하나뿐이라 바닥에 붙여 둔다. 스크롤 길이와 무관하게 보인다 */}
      <div className="sticky bottom-0 mt-10 border-t border-slate-200 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-app-black/90">
        <Container className="flex max-w-2xl items-center gap-4 py-3.5">
          <p className="hidden text-xs text-slate-400 sm:block dark:text-slate-500">
            {open ? t.joinHint : t.otherHint}
          </p>
          <Link
            href="/download"
            className="ml-auto max-sm:w-full rounded-full bg-brand-blue px-7 py-3 text-center font-bold text-white transition hover:-translate-y-0.5 active:scale-95 dark:bg-brand-green dark:text-app-black"
          >
            {open ? t.joinButton : t.otherButton}
          </Link>
        </Container>
      </div>
    </section>
  );
}

/** 마감 글 아래에 붙일 열린 모임 몇 개. 실패해도 빈 배열이면 섹션이 사라진다. */
async function openPostsExcept(excludeId: number, take: number) {
  const { content } = await listPosts(0, 24);
  const now = Date.now();
  return content.filter((item) => item.id !== excludeId && isOpen(item, now)).slice(0, take);
}
