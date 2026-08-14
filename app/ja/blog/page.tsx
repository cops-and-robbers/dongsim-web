import type { Metadata } from "next";
import BlogList from "@/components/blog/BlogList";
import { getMessages } from "@/lib/i18n/messages";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 60;

const meta = getMessages("ja").blog.meta;

export const metadata: Metadata = {
  // 루트 레이아웃의 "%s | 경찰과 도둑" 템플릿을 우회(absolute)해 일본어 제목만 노출.
  title: { absolute: meta.title },
  description: meta.description,
  alternates: {
    canonical: `${SITE_URL}/ja/blog`,
    languages: {
      ...alternateLanguages(SITE_URL, "/blog"),
      "x-default": `${SITE_URL}/blog`,
    },
  },
  openGraph: {
    title: meta.title,
    description: meta.description,
    url: `${SITE_URL}/ja/blog`,
    locale: "ja_JP",
    type: "website",
  },
};

export default function BlogJaPage() {
  return <BlogList locale="ja" />;
}
