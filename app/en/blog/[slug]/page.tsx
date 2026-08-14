import type { Metadata } from "next";
import BlogPost from "@/components/blog/BlogPost";
import { getPosts } from "@/lib/blog/notion";
import { getMessages } from "@/lib/i18n/messages";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 300;

export async function generateStaticParams() {
  const posts = await getPosts("en");
  return posts.map((post) => ({ slug: post.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const posts = await getPosts("en");
  const post = posts.find((p) => p.slug === slug);
  const meta = getMessages("en").blog.meta;
  if (!post) return { title: { absolute: meta.title } };

  return {
    title: { absolute: post.title },
    description: post.summary || meta.description,
    alternates: { canonical: `${SITE_URL}/en/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.summary || undefined,
      type: "article",
      locale: "en_US",
      url: `${SITE_URL}/en/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostEnPage({ params }: Props) {
  const { slug } = await params;
  return <BlogPost slug={slug} locale="en" />;
}
