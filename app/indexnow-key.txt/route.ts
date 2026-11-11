import { indexNowKey } from "@/lib/search/indexnow";

/**
 * IndexNow 키 파일(#309). 빙, 네이버 등이 이 주소에서 키를 읽어 우리가 보낸 알림이 진짜인지 확인한다.
 * 키는 공개되는 값이지만 저장소에 두지 않고 환경변수(INDEXNOW_KEY)로 받는다. 없으면 없는 주소처럼 404.
 */
export function GET() {
  const key = indexNowKey();
  if (!key) return new Response("Not found", { status: 404 });
  return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
