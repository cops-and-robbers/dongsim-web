import { OG_SIZE, ogAlt, renderBlogOg } from "@/lib/seo/blogOgCard";

export const alt = ogAlt("ko");
export const size = OG_SIZE;
export const contentType = "image/png";

// 목록용 카드 - 개별 글이 아니라 섹션 브랜드 카드를 만든다.
export default async function Image() {
  return renderBlogOg("ko");
}
