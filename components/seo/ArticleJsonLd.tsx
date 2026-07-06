import { BRAND, SITE_URL } from "@/lib/constants";
import type { BlogPost } from "@/lib/blog/notion";

// 블로그 글의 Article 구조화 데이터 — 검색 결과에 날짜·작성자가 붙는 리치 결과 대상이 된다.
export default function ArticleJsonLd({ post }: { post: BlogPost }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.summary || undefined,
    datePublished: post.date || undefined,
    author: post.author
      ? { "@type": "Person", name: post.author }
      : { "@type": "Organization", name: BRAND.fullName },
    publisher: { "@type": "Organization", name: BRAND.fullName },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    image: post.coverUrl
      ? [
          post.coverUrl.startsWith("/")
            ? `${SITE_URL}${post.coverUrl}`
            : post.coverUrl,
        ]
      : undefined,
    inLanguage: "ko",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
