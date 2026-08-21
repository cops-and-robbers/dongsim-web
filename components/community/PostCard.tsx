import Link from "next/link";
import { LocationIcon, PeopleIcon } from "@/components/icons/CommunityIcons";
import { isOpen, seatsLeft, type CommunityPost } from "@/lib/community/api";
import { dayLabel, timeLabel, untilLabel } from "@/lib/community/format";

// 목록 한 줄. 그리드가 아니라 가로 행이다.
//
// 모집글에는 사진이 없어서 카드 그리드로 깔면 눈이 지그재그로 움직인다.
// 날짜로 훑는 목록이라 세로로 내려가는 편이 빠르고, 가로로 넓으면 날짜를
// 왼쪽 고정 열로 뽑을 수 있다. 첫 판단 기준이 한 자리에 정렬된다.
//
// 본문은 넣지 않는다. 줄이 길어지면 훑는 속도가 떨어진다.

export default function PostCard({ post }: { post: CommunityPost }) {
  const open = isOpen(post);
  const left = seatsLeft(post);
  const tight = left !== null && left > 0 && left <= 2;
  // 며칠 남았는지가 갈지 말지를 가른다. 날짜만 있으면 매번 오늘과 견줘야 한다
  const until = open ? untilLabel(post.meetingAt) : null;
  const soon = until === "오늘이에요" || until === "내일이에요";

  return (
    <Link
      href={`/g/${post.id}`}
      className={`flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 sm:flex-row sm:gap-6 dark:border-white/10 dark:bg-app-black-900 dark:hover:border-white/20 ${
        open ? "" : "opacity-60"
      }`}
    >
      {/* 날짜 열. 목록을 훑을 때 가장 먼저 보는 값이라 왼쪽에 고정한다 */}
      <div className="shrink-0 sm:w-32">
        <p className="font-bold tracking-tight text-brand-ink dark:text-white">
          {dayLabel(post.meetingAt)}
        </p>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {timeLabel(post.meetingAt)}
        </p>
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
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <h3 className="min-w-0 flex-1 line-clamp-2 text-lg font-bold tracking-tight text-brand-ink dark:text-white">
            {post.title}
          </h3>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
              !open
                ? "bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500"
                : tight
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300"
                  : "bg-brand-blue-bg text-brand-blue dark:bg-brand-green/15 dark:text-brand-green"
            }`}
          >
            {!open ? "마감" : tight ? "자리 얼마 안 남음" : "모집중"}
          </span>
        </div>

        <div className="mt-2 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
          <LocationIcon size={15} className="mt-0.5" />
          <span className="min-w-0">
            {post.location.placeName}
            {post.location.region && (
              <span className="ml-1.5 text-slate-400 dark:text-slate-500">
                {post.location.region}
              </span>
            )}
          </span>
        </div>

        {(post.writerNickname || left !== null) && (
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            {post.writerNickname && <span>주최 {post.writerNickname}</span>}
            {left !== null && (
              <span className="ml-auto flex items-center gap-1.5 font-bold text-slate-500 tabular-nums dark:text-slate-400">
                <PeopleIcon size={13} />
                {post.currentParticipants} / {post.maxParticipants}명
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
