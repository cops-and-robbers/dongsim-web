import { getPosts } from "@/lib/blog/notion";
import { BRAND, SITE_URL } from "@/lib/constants";

// 블로그 RSS 피드 - RSS 리더 구독과 기술 블로그 수집 서비스(어썸 데브블로그 등) 등록용.
// 목록 페이지와 같은 주기(5분)로 재생성된다.
export const revalidate = 300;

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET(): Promise<Response> {
  const posts = await getPosts();

  const items = posts
    .map((post) => {
      const url = `${SITE_URL}/blog/${post.slug}`;
      const pubDate = post.date ? new Date(post.date).toUTCString() : "";
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      ${post.summary ? `<description>${escapeXml(post.summary)}</description>` : ""}
      ${post.author ? `<dc:creator>${escapeXml(post.author)}</dc:creator>` : ""}
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(`${BRAND.game} 이야기`)}</title>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    <description>${escapeXml(
      `${BRAND.game}을 만드는 ${BRAND.fullName} 팀이 남기는 발자국들 - 개발기, 행사 후기, 그리고 뒷이야기.`,
    )}</description>
    <language>ko</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
    },
  });
}
