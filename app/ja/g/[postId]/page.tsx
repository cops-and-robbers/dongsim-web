import type { Metadata } from "next";
import PostPageShell from "@/components/community/PostPageShell";
import { getPost, isOpen, localeOfPost, postPath, seatsLeft } from "@/lib/community/api";
import { meetingLabel } from "@/lib/community/format";
import { getCommunityText } from "@/lib/i18n/community";
import { SITE_URL } from "@/lib/constants";

// 상세는 목록보다 느리게 바뀐다. 공유 링크로 몰릴 수 있어 캐시를 조금 길게 둔다.
export const revalidate = 120;

type Params = { params: Promise<{ postId: string }> };

/** 공유 카드에 들어갈 한 줄. 장소·시간·남은 자리 순으로 붙인다. */
function shareLine(post: NonNullable<Awaited<ReturnType<typeof getPost>>>) {
  const locale = localeOfPost(post);
  const c = getCommunityText(locale).card;
  const left = seatsLeft(post);
  const parts = [post.location.placeName, meetingLabel(post.meetingAt, locale)];
  if (!isOpen(post)) parts.push(c.closed);
  else if (left !== null) parts.push(left > 0 ? c.seatsLeft(left) : c.seatsNone);
  return parts.join(" · ");
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { postId } = await params;
  const post = await getPost(Number(postId));
  if (!post) return { title: getCommunityText("ja").meta.title };

  const description = shareLine(post);
  return {
    title: { absolute: post.title },
    description,
    // 글의 국가가 주소를 정한다. 다른 언어 경로로 들어와도 정본은 하나다
    alternates: { canonical: `${SITE_URL}${postPath(post)}` },
    openGraph: {
      title: post.title,
      description,
      url: `${SITE_URL}${postPath(post)}`,
      locale: "ja_JP",
      type: "article",
    },
  };
}

export default async function CommunityPostJaPage({ params }: Params) {
  const { postId } = await params;
  return <PostPageShell postId={postId} locale="ja" />;
}
