// 커뮤니티 모집글 - 웹은 읽기만 한다. 글쓰기·참여·댓글은 앱에서 한다(#46).
//
// 서버 컴포넌트에서만 부르므로 CORS 를 타지 않고 토큰도 필요 없다.
// BE 의 GET 두 개는 인증 없이 열려 있다(2026-08-20 dev 확인).
// 스펙 문서에는 전역 JWT 를 상속해 "인증 필요"로 보이지만 실제 동작은 공개다.

import type { Locale } from "@/lib/i18n/config";
import { USE_MOCK, mockGet, mockList } from "./mock";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.copsandrobbers.app";

export type PostStatus = "RECRUITING" | "COMPLETED";

export type PostLocation = {
  latitude: number;
  longitude: number;
  /** 동 단위 지역. 역지오코딩이 실패하면 null */
  region: string | null;
  /** 작성자가 직접 입력한 만나는 곳. 작성 시 필수라 항상 있다 */
  placeName: string;
  /** ISO 3166-1 alpha-2. 역지오코딩이 실패하면 null */
  countryCode: string | null;
};

export type CommunityPost = {
  id: number;
  writerId: number;
  /** 탈퇴한 작성자면 null */
  writerNickname: string | null;
  title: string;
  content: string;
  /** ISO8601 + 오프셋. 예: 2026-08-10T14:00:00+09:00 */
  meetingAt: string;
  location: PostLocation;
  maxParticipants: number;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;

  // 아직 BE 응답에 없다. 생기면 화면이 저절로 채워지도록 선택형으로 둔다.
  // 없는 동안에는 자리 관련 표시를 통째로 접는다.
  currentParticipants?: number;
};

export type PostPage = {
  content: CommunityPost[];
  /** 커서 방식이라 총 개수가 없다. 다음 장이 있는지만 알 수 있다 */
  cursor: { nextCursor: string | null; hasNext: boolean };
  countryCode?: string;
};

/**
 * 목록은 국가를 특정하지 않으면 400 이다.
 * 앱은 현재 위치를 보내지만 웹은 위치 권한이 없으므로 경로의 언어로 정한다.
 */
const COUNTRY_BY_LOCALE: Record<Locale, string> = {
  ko: "KR",
  ja: "JP",
  en: "US",
};

export function countryOf(locale: Locale): string {
  return COUNTRY_BY_LOCALE[locale];
}

/** 목록은 자주 바뀌므로 짧게, 상세는 그보다 길게 캐시한다. */
const LIST_TTL = 60;
const DETAIL_TTL = 120;

const EMPTY_PAGE: PostPage = {
  content: [],
  cursor: { nextCursor: null, hasNext: false },
};

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

export async function listPosts({
  countryCode,
  size = 24,
  cursor,
}: {
  countryCode: string;
  size?: number;
  cursor?: string;
}): Promise<PostPage> {
  if (USE_MOCK) return mockList(size, cursor);

  const query = new URLSearchParams({ countryCode, size: String(size) });
  if (cursor) query.set("cursor", cursor);

  return (
    (await get<PostPage>(`/api/community-posts?${query}`, LIST_TTL)) ?? EMPTY_PAGE
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
export function mapUrl(post: CommunityPost): string {
  const { latitude, longitude, placeName } = post.location;
  return `https://map.kakao.com/link/map/${encodeURIComponent(
    placeName,
  )},${latitude},${longitude}`;
}
