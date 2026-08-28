// 커뮤니티 모집글 - 웹은 읽기만 한다. 글쓰기·참여·댓글은 앱에서 한다(#46).
//
// 서버 컴포넌트에서만 부르므로 CORS 를 타지 않고 토큰도 필요 없다.
// BE 의 조회 API 는 인증 없이 열려 있다(2026-08-21 dev 확인).
// 스펙 문서에는 전역 JWT 를 상속해 "인증 필요"로 보이지만 실제 동작은 공개다.

import type { Locale } from "@/lib/i18n/config";
import { USE_MOCK, mockGet, mockList } from "./mock";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.copsandrobbers.app";

/** ENDED 는 모임 날짜가 지난 글. 화면에서는 COMPLETED 와 같은 "마감"이다. */
export type PostStatus = "RECRUITING" | "COMPLETED" | "ENDED";

export type PostLocation = {
  latitude: number;
  longitude: number;
  /** 동 단위 지역. 역지오코딩이 실패하면 null */
  region: string | null;
  /** 지번 주소. BE 가 "노출하지 말고 복사용"이라 명시해서 화면에 그리지 않는다 */
  address?: string | null;
  /** 작성자가 직접 입력한 만나는 곳. 작성 시 필수라 항상 있다 */
  placeName: string;
  /** ISO 3166-1 alpha-2. 역지오코딩이 실패하면 null */
  countryCode: string | null;
};

export type CommunityPost = {
  id: number;
  writerId: number;
  /** 탈퇴한 작성자면 null (BE 의 "알수없음" 문자열은 받는 쪽에서 null 로 바꾼다) */
  writerNickname: string | null;
  /** 작성자 프로필 아이콘 번호. 앱 에셋과 같은 번호 체계다 */
  writerProfileIcon: number;
  /** 내가 이 글 채팅방에 참여 중인지. 웹은 비로그인이라 항상 false 고 쓰지 않는다 */
  chatJoined?: boolean;
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
};

/**
 * 목록은 국가를 특정하지 않으면 400 이다. 앱은 현재 위치를 보내지만 웹은 위치 권한이 없다.
 *
 * IP 로 알아내는 방법은 쓰지 않는다. 페이지가 ISR 로 캐시되는데 IP 로 갈라지면 캐시를
 * 못 쓰고, 무엇보다 검색엔진 크롤러 IP 는 대부분 미국이라 색인이 통째로 미국 목록으로
 * 잡힌다. 검색 유입을 노리는 페이지에서 그건 치명적이다.
 *
 * 그래서 경로가 곧 국가다. URL 이 국가를 정하니 캐시·색인·공유가 모두 성립한다.
 * 영어는 국가를 알려주지 않으므로(영어 사용자가 어디 사는지 알 수 없다) 한국으로 둔다.
 * 영어 라우트를 따로 열 때 그 경로에서 국가를 정하면 된다.
 */
const COUNTRY_BY_LOCALE: Record<Locale, string> = {
  ko: "KR",
  ja: "JP",
  en: "KR",
};

export function countryOf(locale: Locale): string {
  return COUNTRY_BY_LOCALE[locale];
}

/**
 * 모집글 하나를 어느 언어로 그릴지.
 *
 * 글이 열리는 나라의 말로 그린다. 일본 모임 글은 본문부터 일본어라,
 * 그 둘레만 한국어면 오히려 읽기 어렵다.
 */
export function localeOfPost(post: CommunityPost): Locale {
  if (post.location.countryCode === "JP") return "ja";
  if (post.location.countryCode === "KR") return "ko";
  return "en";
}

/**
 * 모집글 주소. 언어가 경로에 들어간다.
 *
 * App Router 에서 `<html lang>` 은 루트 레이아웃만 그린다. 경로에 언어가 없으면
 * 일본어 글이 `lang="ko"` 로 선언돼 검색엔진도 스크린 리더도 언어를 잘못 잡는다.
 * 사이트의 다른 페이지(/ja/blog, /ja/game)와 같은 구조로 맞춘다.
 *
 * 글 하나에 주소도 하나다. 국가가 언어를 정하므로 중복 색인이 생기지 않는다.
 * 딥링크는 경로 셋을 등록하면 된다(AASA·AndroidManifest 각각).
 */
export function postPath(post: CommunityPost): string {
  const locale = localeOfPost(post);
  const prefix = locale === "ko" ? "" : `/${locale}`;
  return `${prefix}/g/${post.id}`;
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

  const page = await get<PostPage>(`/api/community-posts?${query}`, LIST_TTL);
  if (!page) return EMPTY_PAGE;
  return { ...page, content: page.content.map(normalizeWriter) };
}

export async function getPost(postId: number): Promise<CommunityPost | null> {
  if (USE_MOCK) return mockGet(postId);
  const post = await get<CommunityPost>(
    `/api/community-posts/${postId}`,
    DETAIL_TTL,
  );
  return post && normalizeWriter(post);
}

/**
 * 탈퇴한 작성자를 BE 는 한국어 "알수없음"으로 준다. 일본어·영어 페이지에
 * 그대로 내보낼 수 없어서 null 로 바꾸고, 화면은 주최 줄을 통째로 접는다.
 */
function normalizeWriter(post: CommunityPost): CommunityPost {
  if (post.writerNickname !== "알수없음") return post;
  return { ...post, writerNickname: null };
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

/**
 * 구글 지도로 보낸다.
 *
 * 카카오나 네이버는 한국 밖에서 쓸모가 없다. 모임은 이미 여러 나라에서 열리고 있어
 * 한 나라에서만 되는 지도를 링크할 수 없다. 앱도 google_maps_flutter 를 쓰고 있어
 * 앱과 웹이 같은 지도를 보게 된다.
 *
 * 이름이 아니라 좌표로 보낸다. 이름으로 검색하면 같은 이름의 다른 곳으로 갈 수 있다.
 */
/**
 * 작성자 프로필 아이콘 경로. 앱에서 가져온 에셋만 그리고, 모르는 번호는
 * null 을 줘서 화면이 아이콘 없이도 성립하게 한다. 앱에 스킨이 늘면 여기도 늘린다.
 */
export function profileIconSrc(iconNumber: number): string | null {
  return iconNumber === 1 || iconNumber === 2
    ? `/community/profile-${iconNumber}.svg`
    : null;
}

export function mapUrl(post: CommunityPost): string {
  const { latitude, longitude } = post.location;
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}
