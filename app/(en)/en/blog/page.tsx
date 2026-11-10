import type { Metadata } from "next";
import BlogList from "@/components/blog/BlogList";
import { getMessages } from "@/lib/i18n/messages";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 60;

const meta = getMessages("en").blog.meta;

export const metadata: Metadata = {
  // 루트 레이아웃의 "%s | 경찰과 도둑" 템플릿을 우회(absolute)해 영어 제목만 노출.
  title: { absolute: meta.title },
  description: meta.description,
  alternates: {
    canonical: `${SITE_URL}/en/blog`,
    languages: {
      ...alternateLanguages(SITE_URL, "/blog"),
      "x-default": `${SITE_URL}/blog`,
    },
  },
  openGraph: {
    title: meta.title,
    description: meta.description,
    url: `${SITE_URL}/en/blog`,
    locale: "en_US",
    type: "website",
  },
};

export default function BlogEnPage() {
  return <BlogList locale="en" />;
}
