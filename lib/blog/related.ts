/**
 * 글 아래 "이런 이야기는 어때요?"에 보일 글. 최신순 목록에서 이 글 바로 다음 차례(더 오래된 글)부터
 * 고르고, 끝에 닿으면 처음으로 돈다.
 *
 * 최신 두 글만 보여 주면 어느 글에서나 같은 두 글로만 링크가 몰리고, 나머지 글은 목록 하나에서만
 * 링크를 받는다. 차례대로 고르면 모든 글이 다른 글 두 개에서 링크를 받는다(#343)
 */
export function relatedPosts<T extends { id: string }>(
  posts: readonly T[],
  id: string,
  count = 2,
): T[] {
  const at = posts.findIndex((p) => p.id === id);
  const others = posts.filter((p) => p.id !== id);
  if (others.length <= count) return others.slice(0, count);
  const out: T[] = [];
  for (let step = 1; out.length < count; step++) {
    const p = posts[(at + step) % posts.length];
    if (p.id !== id) out.push(p);
  }
  return out;
}
