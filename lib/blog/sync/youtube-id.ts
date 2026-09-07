/*
  유튜브 주소 파서 (ADR-0051).

  화면(`YouTube.tsx`)과 떼어 놓는다. 그 파일에는 JSX 가 있어서 node 로 바로 못 읽고,
  그러면 검사 스크립트가 이 함수를 돌려 볼 수 없다.
  주소를 읽는 일은 화면과 아무 상관이 없으므로 나와 있는 편이 맞다.
*/

/**
 * 유튜브 주소에서 영상 id 를 꺼낸다. 아니면 `undefined`.
 *
 * 네 가지 모양을 다 받는다 — 주소창에서 복사하는 `watch?v=`,
 * 공유 단추가 주는 `youtu.be/`, 임베드 주소인 `/embed/`, 그리고 `/shorts/`.
 * 노션이 어느 모양으로 넘길지 우리가 정하지 못하므로 다 받아 두는 편이 낫다.
 */
export function youTubeId(url: string): string | undefined {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return undefined;
  }
  const host = u.hostname.replace(/^www\./, "");
  const ok = (id: string | null | undefined) => (id && /^[\w-]{6,20}$/.test(id) ? id : undefined);

  if (host === "youtu.be") return ok(u.pathname.slice(1));
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") return ok(u.searchParams.get("v"));
    const m = u.pathname.match(/^\/(?:embed|shorts|v)\/([^/]+)/);
    return ok(m?.[1]);
  }
  return undefined;
}

/**
 * 쇼츠 주소인가. 쇼츠는 세로 영상이라 화면이 다른 틀(9:16 세로 칸)로 그린다 -
 * 16:9 칸에 넣으면 양옆이 검은 띠로 채워진다.
 */
export function isYouTubeShorts(url: string): boolean {
  try {
    return /^\/shorts\//.test(new URL(url).pathname);
  } catch {
    return false;
  }
}
