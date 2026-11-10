import { OG_SIZE, ogAlt, renderBlogOg } from "@/lib/seo/blogOgCard";

export const alt = ogAlt("en");
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return renderBlogOg("en", slug);
}
