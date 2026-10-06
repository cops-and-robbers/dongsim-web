/**
 * 게시물 반응률 (#145). 표와 상세 창이 같이 쓴다.
 *
 * 반응률 = 상호작용 / 본 사람(인스타그램의 도달). 마케팅에서 말하는 참여율(engagement rate)이다.
 * 화면에서는 "도달한 계정", "참여율"이 무엇을 나눈 건지 바로 안 읽혀 "본 사람", "반응률"로 쓴다.
 * 상호작용은 인스타가 주는 total_interactions(좋아요, 댓글, 저장, 공유 등)를 쓰고,
 * 없으면 네 가지를 더한다(둘은 1 안팎으로만 다르다, 2026-10-06 대조).
 * 본 사람으로 나누는 비율이라 적게 퍼진 게시물일수록 크게 나온다(71명이 보고 10명이 반응하면 14%).
 * 그래서 본 사람이 MIN_REACH 보다 적으면 화면은 흐리게 두고 참고용이라고 적는다.
 */

export const MIN_REACH = 100;

type Post = {
  reach: number | null;
  totalInteractions: number | null;
  likes: number | null;
  comments: number | null;
  saved: number | null;
  shares: number | null;
};

export function engagementOf(p: Post): number | null {
  if (!p.reach) return null;
  const interactions = p.totalInteractions ?? (p.likes ?? 0) + (p.comments ?? 0) + (p.saved ?? 0) + (p.shares ?? 0);
  return interactions / p.reach;
}

export const smallReach = (p: Post) => (p.reach ?? 0) < MIN_REACH;
