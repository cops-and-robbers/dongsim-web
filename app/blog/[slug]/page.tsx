import type { Metadata } from "next";
import BlogPost from "@/components/blog/BlogPost";
import { getPosts } from "@/lib/blog/notion";
import { getMessages } from "@/lib/i18n/messages";
import { SITE_URL } from "@/lib/constants";

// 본문은 5분 주기로 재생성. 새 슬러그는 첫 요청 때 온디맨드로 생성된다.
// (이미지는 프록시가 자체 캐시하므로 페이지 캐시 수명과 무관하게 안전하다.)
export const revalidate = 300;

export async function generateStaticParams() {
  const posts = await getPosts("ko");
  return posts.map((post) => ({ slug: post.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const posts = await getPosts("ko");
  const post = posts.find((p) => p.slug === slug);
  const meta = getMessages("ko").blog.meta;
  if (!post) return { title: meta.title };

  return {
    title: post.title,
    description: post.summary || `동심지키미 팀의 이야기 - ${post.title}`,
    alternates: { canonical: `/blog/${post.slug}` },
    // og:image는 같은 폴더의 opengraph-image.tsx(동적 브랜드 카드)가 자동으로 붙인다.
    openGraph: {
      title: post.title,
      description: post.summary || undefined,
      type: "article",
      url: `${SITE_URL}/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  return <BlogPost slug={slug} locale="ko" />;
}
