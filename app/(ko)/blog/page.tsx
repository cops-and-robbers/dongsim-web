import type { Metadata } from "next";
import BlogList from "@/components/blog/BlogList";
import { getMessages } from "@/lib/i18n/messages";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

// 글이 바뀌면 동기화(/api/blog/sync)가 목록을 버리고 미리 데운다. 시간 주기는 놓쳤을 때를 위한 것이라
// 길게 둔다. 짧으면 방문과 수집기마다 다시 만들어 Vercel CPU 를 쓴다(#335)
export const revalidate = 3600;

const meta = getMessages("ko").blog.meta;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: {
    canonical: "/blog",
    languages: {
      ...alternateLanguages(SITE_URL, "/blog"),
      "x-default": `${SITE_URL}/blog`,
    },
    types: { "application/rss+xml": "/rss.xml" },
  },
};

export default function BlogPage() {
  return <BlogList locale="ko" />;
}
