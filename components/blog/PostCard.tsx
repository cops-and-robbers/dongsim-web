/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import CharacterDuo from "@/components/ui/CharacterDuo";
import { findAuthorProfile } from "@/lib/blog/authors";
import { formatPostDate } from "@/lib/blog/format";
import { withImageWidth, type BlogPost } from "@/lib/blog/notion";

// 블로그 글 카드 - 목록·관련 글에서 재사용.
// 테두리 없이 썸네일과 텍스트, 여백만으로 구분하는 미니멀 스타일.
// full: 태그 + 제목 + 요약 + 작성자·날짜 / compact: 제목 + 날짜만

type Props = {
  post: BlogPost;
  variant?: "full" | "compact";
};

export default function PostCard({ post, variant = "full" }: Props) {
  const profile = post.author ? findAuthorProfile(post.author) : null;
  const compact = variant === "compact";

  return (
    <Link href={`/blog/${post.slug}`} className="group">
      <div className="aspect-3/2 w-full overflow-hidden rounded-2xl bg-brand-blue-bg dark:bg-app-black-800">
        {post.coverUrl ? (
          <img
            src={withImageWidth(post.coverUrl, 800)}
            srcSet={
              post.coverUrl.startsWith("/api/blog/image")
                ? `${withImageWidth(post.coverUrl, 640)} 640w, ${withImageWidth(post.coverUrl, 800)} 800w`
                : undefined
            }
            sizes="(min-width: 1024px) 352px, (min-width: 640px) 50vw, 100vw"
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-end justify-center pb-4">
            <CharacterDuo size="sm" />
          </div>
        )}
      </div>

      {!compact && post.tags.length > 0 && (
        <p className="mt-5 text-xs font-bold tracking-wide text-brand-blue dark:text-brand-green">
          {post.tags.join(" · ")}
        </p>
      )}
      <h3
        className={`font-bold leading-snug text-brand-ink transition group-hover:text-brand-blue dark:text-white dark:group-hover:text-brand-green ${
          compact ? "mt-4 text-lg" : "mt-2 text-xl"
        }`}
      >
        {post.title}
      </h3>
      {!compact && post.summary && (
        <p className="mt-2 line-clamp-2 leading-relaxed text-slate-500 dark:text-slate-400">
          {post.summary}
        </p>
      )}

      {compact ? (
        <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
          {formatPostDate(post.date)}
        </p>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500">
          {profile && (
            <img
              src={profile.photo}
              alt=""
              className="h-5 w-5 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
            />
          )}
          {post.author && <span>{post.author}</span>}
          {post.author && post.date && <span aria-hidden="true">·</span>}
          <span>{formatPostDate(post.date)}</span>
        </p>
      )}
    </Link>
  );
}
