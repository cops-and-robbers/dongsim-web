import Link from "next/link";
import { LocationIcon, PeopleIcon } from "@/components/icons/CommunityIcons";
import {
  isOpen,
  postPath,
  profileIconSrc,
  seatsLeft,
  type CommunityPost,
} from "@/lib/community/api";
import { dayLabel, daysUntil, timeLabel, zoneOf } from "@/lib/community/format";
import { getCommunityText } from "@/lib/i18n/community";
import type { Locale } from "@/lib/i18n/config";

// 목록 한 칸.
//
// 날짜를 카드 맨 위에 둔다. 그리드는 카드 높이가 제각각이라 날짜가 아래에 있으면
// 칸마다 다른 높이에 흩어져 눈이 지그재그로 움직인다. 맨 위에 두면 어느 칸이든
// 같은 자리라 가로로도 세로로도 한 줄로 읽힌다.
//
// 본문은 넣지 않는다. 카드가 길어지면 훑는 속도가 떨어진다.

export default function PostCard({
  post,
  locale,
}: {
  post: CommunityPost;
  locale: Locale;
}) {
  const t = getCommunityText(locale).card;
  const open = isOpen(post);
  const left = seatsLeft(post);
  // 며칠 남았는지가 갈지 말지를 가른다. 날짜만 있으면 매번 오늘과 견줘야 한다
  const days = open ? daysUntil(post.meetingAt) : null;
  const until =
    days === null ? null : days === 0 ? t.today : days === 1 ? t.tomorrow : t.inDays(days);
  const soon = days !== null && days <= 1;

  return (
    <Link
      href={postPath(post)}
      className={`flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-white/10 dark:bg-app-black-900 dark:hover:border-white/20 ${
        open ? "" : "opacity-60"
      }`}
    >
      <div className="flex items-start gap-3">
        <p className="min-w-0 font-bold tracking-tight text-brand-ink dark:text-white">
          {dayLabel(post.meetingAt, locale, zoneOf(post.location))}
          <span className="ml-1.5 font-medium text-slate-500 dark:text-slate-400">
            {timeLabel(post.meetingAt, locale, zoneOf(post.location))}
          </span>
        </p>
      </div>

      {until && (
        <p
          className={`mt-1 text-sm ${
            soon
              ? "font-bold text-brand-blue dark:text-brand-green"
              : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {until}
        </p>
      )}

      <h3 className="mt-3 line-clamp-2 text-lg font-bold tracking-tight text-brand-ink dark:text-white">
        {post.title}
      </h3>

      {/* 만나는 곳과 행정 구역은 성격이 달라 줄을 나눈다. 한 줄에 이어 붙이면
          카드가 좁아 가운데서 끊기고, 어디까지가 장소인지 안 보인다 */}
      <div className="mt-2 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
        <LocationIcon size={15} className="mt-0.5" />
        <span className="min-w-0">
          {post.location.placeName}
          {post.location.region && (
            <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
              {post.location.region}
            </span>
          )}
        </span>
      </div>

      {(post.writerNickname || left !== null) && (
        <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-white/5 dark:text-slate-500">
          {post.writerNickname && (
            <span className="flex min-w-0 items-center gap-1.5">
              {profileIconSrc(post.writerProfileIcon) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profileIconSrc(post.writerProfileIcon)!}
                  alt=""
                  width={16}
                  height={16}
                  className="shrink-0 rounded-full"
                />
              )}
              <span className="truncate">{t.host(post.writerNickname)}</span>
            </span>
          )}
          {left !== null && (
            <span className="ml-auto flex items-center gap-1.5 font-bold text-slate-500 tabular-nums dark:text-slate-400">
              <PeopleIcon size={13} />
              {t.seats(post.currentParticipants ?? 0, post.maxParticipants)}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
