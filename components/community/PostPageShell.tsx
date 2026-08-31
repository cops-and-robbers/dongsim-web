import { notFound, permanentRedirect } from "next/navigation";
import PostDetailSections from "@/components/community/PostDetailSections";
import EventJsonLd from "@/components/seo/EventJsonLd";
import { getPost, localeOfPost, postPath } from "@/lib/community/api";
import type { Locale } from "@/lib/i18n/config";

// 언어별 상세 라우트 셋이 공통으로 쓰는 껍데기.
//
// 글의 국가가 언어를 정하므로, 다른 언어 경로로 들어오면 제 주소로 보낸다.
// 그래야 글 하나에 주소가 하나로 유지되고 중복 색인이 생기지 않는다.

export default async function PostPageShell({
  postId,
  locale,
}: {
  postId: string;
  locale: Locale;
}) {
  const id = Number(postId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const post = await getPost(id);
  if (!post) notFound();

  // 글의 국가는 바뀌지 않으므로 영구 이동(308). 임시(307)는 검색엔진이
  // 정본 신호를 온전히 넘기지 않는다
  const path = postPath(post);
  const here = locale === "ko" ? `/g/${id}` : `/${locale}/g/${id}`;
  if (path !== here) permanentRedirect(path);

  return (
    <>
      <EventJsonLd post={post} />
      <PostDetailSections post={post} locale={localeOfPost(post)} />
    </>
  );
}
