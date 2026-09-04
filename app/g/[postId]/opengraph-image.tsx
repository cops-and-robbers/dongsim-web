import {
  OG_ALT,
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderCommunityOgImage,
} from "@/lib/community/og-image";

// 모집글 공유 카드 - 렌더링은 공용 렌더러에 위임한다 (#103).

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  return renderCommunityOgImage(postId);
}
