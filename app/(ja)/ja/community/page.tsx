import type { Metadata } from "next";
import PostListSections from "@/components/community/PostListSections";
import { getCommunityText } from "@/lib/i18n/community";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 60;

const meta = getCommunityText("ja").meta;

export const metadata: Metadata = {
  // 루트 레이아웃의 "%s | 경찰과 도둑" 템플릿을 우회(absolute)해 해당 언어 제목만 노출.
  title: { absolute: meta.title },
  description: meta.description,
  alternates: {
    canonical: `${SITE_URL}/ja/community`,
    languages: {
      ...alternateLanguages(SITE_URL, "/community"),
      "x-default": `${SITE_URL}/community`,
    },
  },
  openGraph: {
    title: meta.title,
    description: meta.description,
    url: `${SITE_URL}/ja/community`,
    locale: "ja_JP",
    type: "website",
  },
};

export default function CommunityJaPage() {
  return <PostListSections locale="ja" />;
}
