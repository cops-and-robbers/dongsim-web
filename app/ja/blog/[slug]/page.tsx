import type { Metadata } from "next";
import BlogPost from "@/components/blog/BlogPost";
import { getPost, getPosts } from "@/lib/blog/store";
import { getMessages } from "@/lib/i18n/messages";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 300;

// DB 가 잠깐 죽었다고 배포가 실패하면 안 된다. 빠진 글은 첫 요청 때 만들어진다
export async function generateStaticParams() {
  const posts = await getPosts("ja").catch(() => []);
  return posts.map((post) => ({ slug: post.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // 목록에서 찾지 않고 글 하나를 직접 묻는다. 조회가 실패하면 던져서,
  // 공통 제목·홈 canonical 이 캐시되지 않고 직전 정상본이 남는다(#188)
  const post = await getPost("ja", slug);
  const meta = getMessages("ja").blog.meta;
  if (!post) return { title: { absolute: meta.title } };

  return {
    title: { absolute: post.title },
    description: post.summary || meta.description,
    alternates: { canonical: `${SITE_URL}/ja/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.summary || undefined,
      type: "article",
      locale: "ja_JP",
      url: `${SITE_URL}/ja/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostJaPage({ params }: Props) {
  const { slug } = await params;
  return <BlogPost slug={slug} locale="ja" />;
}
