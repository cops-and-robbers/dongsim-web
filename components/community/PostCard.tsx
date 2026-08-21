import Link from "next/link";
import { CalendarIcon, LocationIcon, PeopleIcon } from "@/components/icons/CommunityIcons";
import { isOpen, seatsLeft, type CommunityPost } from "@/lib/community/api";
import { meetingLabel } from "@/lib/community/format";

// 목록 한 칸. 참여 판단에 필요한 것만 담는다 - 언제, 어디서, 몇 자리 남았는지.
// 본문은 넣지 않는다. 카드가 길어지면 훑는 속도가 떨어진다.

export default function PostCard({ post }: { post: CommunityPost }) {
  const open = isOpen(post);
  const left = seatsLeft(post);
  const tight = left !== null && left > 0 && left <= 2;

  return (
    <Link
      href={`/g/${post.id}`}
      className={`block rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-white/10 dark:bg-app-black-900 dark:hover:border-white/20 ${
        open ? "" : "opacity-60"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            !open
              ? "bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500"
              : tight
                ? "bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300"
                : "bg-brand-blue-bg text-brand-blue dark:bg-brand-green/15 dark:text-brand-green"
          }`}
        >
          {!open ? "마감" : tight ? "자리 얼마 안 남음" : "모집중"}
        </span>
        {left !== null && (
          <span className="ml-auto flex items-center gap-1.5 text-sm font-bold text-slate-500 tabular-nums dark:text-slate-400">
            <PeopleIcon size={14} />
            {post.currentParticipants} / {post.maxParticipants}명
          </span>
        )}
      </div>

      <h3 className="mt-3 line-clamp-2 text-lg font-bold tracking-tight text-brand-ink dark:text-white">
        {post.title}
      </h3>

      <div className="mt-3 flex flex-col gap-1.5 text-sm text-slate-600 dark:text-slate-300">
        {/* 만나는 곳과 행정 구역은 성격이 달라 줄을 나눈다. 한 줄에 이어 붙이면
            카드가 좁아 가운데서 끊기고, 어디까지가 장소인지 안 보인다.
            region 은 나라마다 형식이 달라 앞부분을 잘라낼 수 없다 */}
        <span className="flex items-start gap-2">
          <LocationIcon size={15} className="mt-0.5" />
          <span className="min-w-0">
            {post.location.placeName}
            {post.location.region && (
              <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                {post.location.region}
              </span>
            )}
          </span>
        </span>
        <span className="flex items-start gap-2">
          <CalendarIcon size={15} className="mt-0.5 text-brand-blue dark:text-brand-green" />
          {meetingLabel(post.meetingAt)}
        </span>
      </div>

      {post.writerNickname && (
        <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-white/5 dark:text-slate-500">
          {post.writerNickname} 님이 열었어요
        </p>
      )}
    </Link>
  );
}
