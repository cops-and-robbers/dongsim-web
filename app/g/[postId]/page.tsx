import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostDetailSections from "@/components/community/PostDetailSections";
import { getPost, isOpen, seatsLeft } from "@/lib/community/api";
import { meetingLabel, seatLabel } from "@/lib/community/format";
import { SITE_URL } from "@/lib/constants";

// 상세는 목록보다 느리게 바뀐다. 공유 링크로 몰릴 수 있어 캐시를 조금 길게 둔다.
export const revalidate = 120;

type Params = { params: Promise<{ postId: string }> };

/** 공유 카드에 들어갈 한 줄. 장소·시간·남은 자리 순으로 붙인다. */
function shareLine(post: NonNullable<Awaited<ReturnType<typeof getPost>>>) {
  const left = seatsLeft(post);
  const parts = [post.location.placeName, meetingLabel(post.meetingAt)];
  if (!isOpen(post)) parts.push("마감된 모임");
  else if (left !== null) parts.push(seatLabel(left));
  return parts.join(" · ");
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { postId } = await params;
  const post = await getPost(Number(postId));
  if (!post) return { title: "모임" };

  const description = shareLine(post);
  return {
    title: post.title,
    description,
    alternates: { canonical: `/g/${post.id}` },
    openGraph: {
      title: post.title,
      description,
      url: `${SITE_URL}/g/${post.id}`,
      type: "article",
    },
  };
}

export default async function CommunityPostPage({ params }: Params) {
  const { postId } = await params;
  const id = Number(postId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const post = await getPost(id);
  if (!post) notFound();

  return <PostDetailSections post={post} locale="ko" />;
}
