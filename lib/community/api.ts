// 커뮤니티 모집글 - 웹은 읽기만 한다. 글쓰기·참여·댓글은 앱에서 한다(#46).
//
// 서버 컴포넌트에서만 부르므로 CORS 를 타지 않고 토큰도 필요 없다.
// BE 의 GET 두 개는 인증 없이 열려 있다(2026-08-19 확인).

import { USE_MOCK, mockGet, mockList } from "./mock";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.copsandrobbers.app";

export type PostStatus = "RECRUITING" | "COMPLETED";

export type CommunityPost = {
  id: number;
  writerId: number;
  title: string;
  content: string;
  /** ISO8601 + 오프셋. 예: 2026-08-10T14:00:00+09:00 */
  meetingAt: string;
  location: { latitude: number; longitude: number } | null;
  maxParticipants: number;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;

  // 아래 셋은 아직 BE 응답에 없다. 생기면 화면이 저절로 채워지도록 선택형으로 둔다.
  // 없는 동안에는 그 줄을 그리지 않는다. 지어내서 채우면 안 되는 값들이다.
  /** 지금까지 참여한 사람 수. 남은 자리 계산에 쓴다 */
  currentParticipants?: number;
  /** 사람이 읽는 장소 이름. 좌표만으로는 목록에 쓸 수 없다 */
  placeName?: string;
  /** 연 사람 닉네임. 모르는 사람 모임이라 누가 여는지가 참여 판단에 필요하다 */
  writerNickname?: string;
};

export type PostPage = {
  content: CommunityPost[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
};

/** 목록은 자주 바뀌므로 짧게, 상세는 그보다 길게 캐시한다. */
const LIST_TTL = 60;
const DETAIL_TTL = 120;

async function get<T>(path: string, ttl: number): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: ttl } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // 백엔드가 잠깐 죽어도 페이지는 떠야 한다. 빈 화면이 500 보다 낫다
    return null;
  }
}

export async function listPosts(page = 0, size = 24): Promise<PostPage> {
  if (USE_MOCK) return mockList(page, size);
  const data = await get<PostPage>(
    `/api/community-posts?page=${page}&size=${size}`,
    LIST_TTL,
  );
  return (
    data ?? {
      content: [],
      page: { size, number: page, totalElements: 0, totalPages: 0 },
    }
  );
}

export async function getPost(postId: number): Promise<CommunityPost | null> {
  if (USE_MOCK) return mockGet(postId);
  return get<CommunityPost>(`/api/community-posts/${postId}`, DETAIL_TTL);
}

/** 모집중이면서 약속 시각이 아직 안 지난 글. 목록에서 위로 올린다. */
export function isOpen(post: CommunityPost, now: number = Date.now()): boolean {
  return post.status === "RECRUITING" && new Date(post.meetingAt).getTime() > now;
}

/**
 * 남은 자리. 참여 인원을 모르면 null 을 준다.
 * 이 값이 null 이면 화면에서 자리 관련 표시를 통째로 접는다.
 */
export function seatsLeft(post: CommunityPost): number | null {
  if (typeof post.currentParticipants !== "number") return null;
  return Math.max(0, post.maxParticipants - post.currentParticipants);
}

/** 카카오 지도로 보낸다. 앱을 안 깔아도 브라우저에서 열린다. */
export function mapUrl(post: CommunityPost): string | null {
  if (!post.location) return null;
  const { latitude, longitude } = post.location;
  return `https://map.kakao.com/link/map/${encodeURIComponent(
    post.placeName ?? "모임 장소",
  )},${latitude},${longitude}`;
}
