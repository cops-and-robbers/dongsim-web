import type { Metadata } from "next";
import BlogList from "@/components/blog/BlogList";
import { getMessages } from "@/lib/i18n/messages";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

// 목록은 1분 주기로 재생성 - 노션에서 "공개"를 켜면 늦어도 1~2분 안에 반영된다.
// (이미지가 프록시에서 장기 캐시되므로 짧은 주기가 부담이 없다.)
export const revalidate = 60;

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
