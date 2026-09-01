import type { Metadata } from "next";
import PostListSections from "@/components/community/PostListSections";
import { getCommunityText } from "@/lib/i18n/community";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

// 목록은 자주 바뀐다. 새 모집글이 1분 안에 뜨게 한다.
export const revalidate = 60;

const meta = getCommunityText("ko").meta;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: {
    canonical: "/community",
    languages: {
      ...alternateLanguages(SITE_URL, "/community"),
      "x-default": `${SITE_URL}/community`,
    },
  },
};

export default function CommunityPage() {
  return <PostListSections locale="ko" />;
}
