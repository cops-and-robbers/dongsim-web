/**
 * 본문 마크다운에서 목차와 읽는 시간을 뽑는다 (ADR-0027).
 *
 * 렌더된 DOM을 훑지 않고 원문에서 뽑는 이유는, 서버에서 목차를 만들어 내려보내야
 * 자바스크립트가 늦게 와도 목차가 보이고 검색엔진에도 잡히기 때문이다.
 */

/** 코드 블록 안의 `## ` 을 제목으로 잘못 읽지 않도록 펜스 구간을 먼저 지운다 */
export function stripFences(md: string): string {
  return md.replace(/^```[\s\S]*?^```/gm, "");
}

/**
 * 마크다운 문법을 걷어내고 사람이 읽는 글자만 남긴다.
 *
 * 목차와 본문 제목이 **같은 글자에서** id 를 만들어야 서로 맞는다.
 * 본문 쪽은 렌더된 글자를 쓰므로(링크는 링크 글자만, 코드는 코드 안 글자만 남는다),
 * 목차 쪽도 원문에서 같은 결과가 나오게 걷어내야 한다.
 * 이걸 맞추지 않으면 굵게·인라인 코드·링크가 든 제목에서 목차를 눌러도 아무 데도 가지 않는다.
 */
export function plainText(md: string): string {
  return md
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // 그림 → 대체 글자
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 링크 → 링크 글자
    .replace(/`([^`]*)`/g, "$1") // 인라인 코드 → 안의 글자
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // 굵게
    .replace(/(\*|_)(.*?)\1/g, "$2") // 기울임
    .replace(/~~(.*?)~~/g, "$1") // 취소선
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 제목 문자열 → 앵커 id.
 * 한글을 그대로 두면 주소창에서 %EA%B0%99은 식으로 길어지므로 공백만 하이픈으로 바꾸고
 * 링크로 쓸 수 없는 문자를 턴다. 같은 제목이 여러 번 나오면 뒤에 번호를 붙인다.
 */
export function slugify(text: string, seen?: Map<string, number>): string {
  const base =
    text
      .trim()
      .toLowerCase()
      .replace(/[`*_[\]()#]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^\p{Letter}\p{Number}-]/gu, "") || "section";
  if (!seen) return base;
  const n = seen.get(base) ?? 0;
  seen.set(base, n + 1);
  return n === 0 ? base : `${base}-${n}`;
}

export type Heading = { id: string; text: string };

/** h2 만 모은다. h3 까지 넣으면 목차가 본문만큼 길어져 훑는 도구가 아니게 된다. */
export function extractHeadings(md: string): Heading[] {
  const seen = new Map<string, number>();
  const out: Heading[] = [];
  for (const m of stripFences(md).matchAll(/^##\s+(.+?)\s*#*\s*$/gm)) {
    const text = plainText(m[1]);
    if (text) out.push({ id: slugify(text, seen), text });
  }
  return out;
}
