/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import CharacterDuo from "@/components/ui/CharacterDuo";
import { formatPostDate } from "@/lib/blog/format";
import { withImageWidth, type BlogPost } from "@/lib/blog/notion";
import { localizedPath, type Locale } from "@/lib/i18n/config";

// 목록형 한 줄 - 카드(PostCard)와 같은 재료를 가로로 눕힌 형태.
// 표지를 작은 썸네일로 줄여 한 화면에 더 많은 글이 들어오게 한다.
export default function PostRow({
  post,
  locale = "ko",
}: {
  post: BlogPost;
  locale?: Locale;
}) {
  return (
    <Link
      href={localizedPath(`/blog/${post.slug}`, locale)}
      className="group flex items-center gap-5 py-6 sm:gap-7"
    >
      <div className="aspect-3/2 w-28 shrink-0 overflow-hidden bg-brand-blue-bg sm:w-44 dark:bg-app-black-800">
        {post.coverUrl ? (
          <img
            src={withImageWidth(post.coverUrl, 400)}
            sizes="(min-width: 640px) 176px, 112px"
            alt={post.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-end justify-center pb-2">
            <CharacterDuo size="sm" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {post.tags.length > 0 && (
          <p className="text-xs font-bold tracking-wide text-brand-blue dark:text-brand-green">
            {post.tags.join(" · ")}
          </p>
        )}
        <h3 className="mt-1.5 line-clamp-2 text-lg leading-snug font-bold text-brand-ink transition group-hover:text-brand-blue sm:text-xl dark:text-white dark:group-hover:text-brand-green">
          {post.title}
        </h3>
        {/* 좁은 화면에서는 요약을 빼서 제목과 날짜가 먼저 읽히게 한다 */}
        {post.summary && (
          <p className="mt-1.5 hidden line-clamp-1 leading-relaxed text-slate-500 sm:block dark:text-slate-400">
            {post.summary}
          </p>
        )}
        <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500">
          {post.author && <span>{post.author}</span>}
          {post.author && post.date && <span aria-hidden="true">·</span>}
          <span>{formatPostDate(post.date)}</span>
        </p>
      </div>
    </Link>
  );
}
