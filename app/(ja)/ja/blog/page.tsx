import type { Metadata } from "next";
import BlogList from "@/components/blog/BlogList";
import { getMessages } from "@/lib/i18n/messages";
import { blogListIndexing } from "@/lib/blog/listIndex";
import { localesWithPosts } from "@/lib/blog/store";
import { SITE_URL } from "@/lib/constants";

// 동기화가 바뀐 목록을 바로 버린다. 주기는 놓쳤을 때를 위한 것(#335)
export const revalidate = 3600;

const meta = getMessages("ja").blog.meta;

// 일본어 글이 없으면 noindex, hreflang 은 글이 있는 언어끼리만(#343, lib/blog/listIndex.ts)
export async function generateMetadata(): Promise<Metadata> {
  const { index, languages } = blogListIndexing(SITE_URL, "ja", await localesWithPosts());
  return {
    // 루트 레이아웃의 "%s | 경찰과 도둑" 템플릿을 우회(absolute)해 일본어 제목만 노출.
    title: { absolute: meta.title },
    description: meta.description,
    ...(index ? {} : { robots: { index: false, follow: true } }),
    alternates: {
      canonical: `${SITE_URL}/ja/blog`,
      languages,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${SITE_URL}/ja/blog`,
      locale: "ja_JP",
      type: "website",
    },
  };
}

export default function BlogJaPage() {
  return <BlogList locale="ja" />;
}
