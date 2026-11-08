// 로컬에서 리뷰 받은편지함을 보는 가짜 값. 실제 스토어와 Supabase 에 닿지 않는다.
import type { Inbox, Platform, Review } from "@/lib/reviews/model";
import { waitingCount } from "@/lib/reviews/model";

const base = { title: "", translated: null, appVersion: null, device: null, reply: null, replyAt: null, replyState: null, replyBy: null, skippedBy: null, skippedAt: null, draft: null, draftBy: null } as const;

let reviews: Review[] = [
  { ...base, platform: "android", id: "p1", rating: 1, body: "위치가 자꾸 끊겨서 게임이 안 돼요. 친구들이랑 하다가 계속 튕겨요.", author: "김도윤", place: "ko", appVersion: "3.2.7", device: "Galaxy S23", reviewedAt: "2026-11-08T03:10:00.000Z", draft: "불편을 드려 죄송해요. ", draftBy: "마케터" },
  { ...base, platform: "ios", id: "i1", rating: 3, title: "재밌는데", body: "방 만드는 게 조금 헷갈려요. 초대 코드가 어디 있는지 한참 찾았어요.", author: "도망자", place: "KOR", reviewedAt: "2026-11-05T10:00:00.000Z" },
  { ...base, platform: "android", id: "p2", rating: 2, body: "Good idea but the map is hard to read on small phones.", translated: "아이디어는 좋은데 작은 폰에서는 지도가 잘 안 보여요.", author: "Sam", place: "en", appVersion: "3.2.6", device: "Pixel 7", reviewedAt: "2026-11-04T08:00:00.000Z" },
  { ...base, platform: "ios", id: "i2", rating: 5, title: "좋아요", body: "좋아요", author: "경도왕", place: "KOR", reviewedAt: "2026-07-21T01:00:00.000Z" },
  { ...base, platform: "ios", id: "i3", rating: 5, body: "어릴 때 생각나요", author: "치즈", place: "KOR", reviewedAt: "2026-05-11T01:00:00.000Z", reply: "그 시절처럼 뛰어 주셔서 고마워요.", replyAt: "2026-05-12T01:00:00.000Z", replyState: "published", replyBy: "찬빈" },
  { ...base, platform: "android", id: "p3", rating: 4, body: "학교 축제에서 했는데 재밌었어요", author: "민서", place: "ko", appVersion: "3.2.7", device: "Galaxy A54", reviewedAt: "2026-05-03T01:00:00.000Z", skippedAt: "2026-05-04T01:00:00.000Z", skippedBy: "찬빈" },
];

export const mockInbox = (): Inbox => ({ reviews, syncError: null, writable: true });
export const mockWaiting = () => ({ waiting: waitingCount(reviews) });

function change(platform: Platform, id: string, values: Partial<Review>): { review: Review } {
  reviews = reviews.map((r) => (r.platform === platform && r.id === id ? { ...r, ...values } : r));
  return { review: reviews.find((r) => r.platform === platform && r.id === id)! };
}

export function mockPatchReview(body: { platform: Platform; id: string; action: string; draft?: string | null }): { review: Review } {
  if (body.action === "skip") return change(body.platform, body.id, { skippedAt: new Date().toISOString(), skippedBy: "로컬 관리자" });
  if (body.action === "reopen") return change(body.platform, body.id, { skippedAt: null, skippedBy: null });
  return change(body.platform, body.id, { draft: body.draft ?? null, draftBy: body.draft ? "로컬 관리자" : null });
}

export function mockReply(body: { platform: Platform; id: string; text: string }): { review: Review } {
  return change(body.platform, body.id, { reply: body.text, replyAt: new Date().toISOString(), replyState: body.platform === "ios" ? "pending" : "published", replyBy: "로컬 관리자", draft: null, draftBy: null, skippedAt: null, skippedBy: null });
}
