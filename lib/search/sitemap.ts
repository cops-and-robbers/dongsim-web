/** 우리 사이트맵의 주소 목록 (#309). 구글이 보는 것과 같은 걸 보려고 배포된 /sitemap.xml 을 읽는다 */

import { SITEMAP_URL } from "./config.ts";

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };

export function parseSitemap(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1].replace(/&(amp|lt|gt|quot|apos);/g, (e) => ENTITIES[e]));
}

export async function sitemapUrls(): Promise<string[]> {
  const res = await fetch(SITEMAP_URL, { cache: "no-store", headers: { "user-agent": "dongsim search tracker" }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`사이트맵을 읽지 못했어요 HTTP ${res.status}`);
  const urls = parseSitemap(await res.text());
  // 빈 목록으로 비교하면 모든 주소가 사라진 것처럼 보인다. 그대로 멈춘다
  if (urls.length === 0) throw new Error("사이트맵에 주소가 하나도 없어요");
  return urls;
}
