/**
 * 유튜브 링크에 진짜 제목을 박는다 (ADR-0054).
 *
 * 노션이 내보내는 링크 텍스트는 `video` 다. 영상마다 같고, 한국어 글 안에서 튀고,
 * 무엇을 누르는지도 알려주지 않는다. 진짜 제목은 유튜브만 안다.
 *
 * **묻는 일은 동기화가 한다.** 화면에서 물으면 유튜브가 느린 날 글이 같이 느려지고,
 * 유튜브가 죽은 날 글이 같이 죽는다. 렌더 경로에 외부 서비스를 들이지 않는다는
 * 원칙(ADR-0051)은 영상 제목 하나를 위해 깨뜨릴 만한 것이 아니다.
 *
 * 받아온 제목은 마크다운에 그대로 남는다.
 *
 * ```
 * [video](https://www.youtube.com/watch?v=…)
 * [미야기의 캡틴은 고개 숙이지 않는다](https://www.youtube.com/watch?v=… "동수칸TV")
 * ```
 *
 * 채널은 링크의 title 자리에 둔다. 마크다운 문법 안이라 원문을 그대로 읽어도 자연스럽고,
 * 우리 화면 밖(RSS·검색 결과·원문 그대로 보기)에서도 제목이 제목으로 읽힌다.
 *
 * 실패하면 원래 텍스트를 그대로 둔다. 제목을 못 받은 것 때문에 발행이 막히면
 * 손해가 훨씬 크다 — 못 받아도 예전과 같은 모습이 될 뿐이다.
 *
 * **import 가 하나도 없다.** `pnpm check:notion` 이 이 파일을 그냥 node 로 불러 검사하는데,
 * node 는 확장자 없는 TS import 를 풀지 못한다. 그래서 "이 주소가 유튜브인가"는
 * 인자로 받는다 — `feed.ts` 와 같은 이유이고, 같은 이유로 설계도 나아졌다.
 * 이 파일은 "링크를 찾아 제목을 박는다"만 알고, 유튜브 주소의 생김새는 부르는 쪽이 안다.
 */

/** 주소에서 영상 id 를 뽑는 함수. 부르는 쪽이 넘긴다. */
export type IdOf = (href: string) => string | null | undefined;

/** `[텍스트](주소)` 또는 `[텍스트](주소 "제목")` */
const LINK = /\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+"([^"]*)")?\)/g;

export type VideoInfo = { title: string; channel: string };

export type YouTubeLink = {
  /** 원문에 나타난 링크 조각 그대로 */
  whole: string;
  id: string;
  href: string;
};

/**
 * 아직 제목을 못 채운 유튜브 링크를 찾는다.
 *
 * title 이 이미 있으면 지난 동기화에서 채운 것이다. 다시 묻지 않는다 —
 * 글을 고칠 때마다 유튜브에 같은 것을 물으면 동기화만 느려진다.
 */
export function youTubeLinksIn(markdown: string, idOf: IdOf): YouTubeLink[] {
  const found: YouTubeLink[] = [];
  const seen = new Set<string>();
  for (const m of markdown.matchAll(LINK)) {
    const [whole, , href, existing] = m;
    if (existing !== undefined || seen.has(whole)) continue;
    const id = idOf(href);
    if (id) {
      seen.add(whole);
      found.push({ whole, id, href });
    }
  }
  return found;
}

/** 링크 텍스트 안에서 그대로 쓸 수 없는 글자 */
function forText(s: string): string {
  return s.replace(/([\\[\]])/g, "\\$1");
}

/** 링크 title 은 큰따옴표로 감싸므로 그 안의 큰따옴표만 막으면 된다 */
function forTitle(s: string): string {
  return s.replace(/([\\"])/g, "\\$1");
}

/** 받아 온 정보를 원문에 박는다. 못 받은 영상은 건드리지 않는다. */
export function withYouTubeTitles(
  markdown: string,
  found: Map<string, VideoInfo>,
  idOf: IdOf,
): string {
  let out = markdown;
  for (const { whole, id, href } of youTubeLinksIn(markdown, idOf)) {
    const info = found.get(id);
    if (!info?.title) continue;
    const channel = info.channel ? ` "${forTitle(info.channel)}"` : "";
    out = out.split(whole).join(`[${forText(info.title)}](${href}${channel})`);
  }
  return out;
}

/** oEmbed 는 공개 엔드포인트다 — 키가 없고, 비공개 영상에는 응답하지 않는다 */
async function lookup(id: string): Promise<VideoInfo | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${id}`,
    )}&format=json`;
    // 동기화 전체에 300초 상한이 있다. 한 영상이 그것을 갉아먹게 두지 않는다
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; author_name?: string };
    const title = (data.title ?? "").trim();
    if (!title) return null;
    return { title, channel: (data.author_name ?? "").trim() };
  } catch {
    return null;
  }
}

export async function resolveYouTubeTitles(markdown: string, idOf: IdOf): Promise<string> {
  const links = youTubeLinksIn(markdown, idOf);
  if (links.length === 0) return markdown;

  const found = new Map<string, VideoInfo>();
  await Promise.all(
    [...new Set(links.map((l) => l.id))].map(async (id) => {
      const info = await lookup(id);
      if (info) found.set(id, info);
    }),
  );
  return found.size === 0 ? markdown : withYouTubeTitles(markdown, found, idOf);
}
