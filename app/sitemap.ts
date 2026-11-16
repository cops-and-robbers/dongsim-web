import type { MetadataRoute } from "next";
import { getAllPosts, type BlogPost } from "@/lib/blog/store";
import { allPostsByLatest, isOpen, listScopeOf, postPath } from "@/lib/community/api";
import { LOCALES, alternateLanguages, localizedPath } from "@/lib/i18n/config";

const BASE_URL = "https://copsandrobbers.app";

// 노션에 새 글을 공개하면 재배포 없이도 사이트맵에 들어오도록 주기적으로 다시 만든다.
// (기본값은 빌드 시 1회 생성이라, 배포 사이에 올린 글이 색인 대상에서 빠진다)
// 목록·RSS와 같은 결의 주기. 사이트맵은 크롤러만 읽으므로 더 길게 잡아도 무방하다.
export const revalidate = 600;

/**
 * 블로그 글의 lastmod. 글을 고친 시각을 쓰고, 없으면(수정 시각을 아직 안 읽은 글) 노션 날짜를 쓴다.
 * 노션 날짜는 글을 고쳐도 그대로라, 그것만 쓰면 고친 글을 구글이 다시 읽을 신호가 없다(#309)
 */
function lastModifiedOf(post: BlogPost): { lastModified?: Date } {
  const when = post.updatedAt || post.date;
  return when ? { lastModified: new Date(when) } : {};
}

// 수정일(lastmod)은 정확히 아는 주소에만 넣는다. 고정 페이지에 만드는 시각을 넣으면
// 매번 "오늘 바뀜"이 되고, 구글은 계속 틀리는 lastmod 를 사이트 전체에서 무시한다(#299).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 언어 구분 없이 받아 각 글을 자기 언어 경로로 넣는다. 연동 미설정·오류 시 빈 배열.
  const allPosts = await getAllPosts();
  const posts = allPosts.filter((post) => post.locale === "ko");

  // 열린 모집글만 넣는다. 글마다 지역·장소 이름이 들어가 지역 검색 유입 경로가
  // 된다(#107). 글 하나에 주소도 하나라(postPath - 국가가 언어를 정한다)
  // 중복 색인이 없다. 마감된 글은 장소와 시간만 남은 얇은 페이지라 넣었던 8개가
  // 모두 색인되지 않았고, 사이트 전체 평가만 끌어내려 빼고 noindex 를 준다(#299).
  const meetupNow = Date.now();
  const meetupPages = (
    await Promise.all(
      LOCALES.map((locale) => allPostsByLatest(listScopeOf(locale))),
    )
  )
    .flat()
    .filter((post) => isOpen(post, meetupNow))
    .map((post) => ({
      url: `${BASE_URL}${postPath(post)}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));

  return [
    {
      url: `${BASE_URL}/`,
      changeFrequency: "weekly",
      priority: 1,
      // 공유 이미지(opengraph-image)는 Next 가 주소를 정해서 적지 않는다. 적어 둔 .png 주소는 404였다(#299)
      images: [
        `${BASE_URL}/brand/logo.svg`,
        `${BASE_URL}/brand/app-icon.png`,
        `${BASE_URL}/characters/police.svg`,
        `${BASE_URL}/characters/robber.svg`,
      ],
      alternates: {
        languages: alternateLanguages(BASE_URL),
      },
    },
    {
      url: `${BASE_URL}/en`,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: alternateLanguages(BASE_URL),
      },
    },
    {
      url: `${BASE_URL}/ja`,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: alternateLanguages(BASE_URL),
      },
    },
    ...(["/online", "/en/online", "/ja/online"] as const).map((url) => ({
      url: `${BASE_URL}${url}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: { languages: alternateLanguages(BASE_URL, "/online") },
    })),
    {
      url: `${BASE_URL}/game`,
      changeFrequency: "monthly",
      priority: 0.9,
      images: [
        `${BASE_URL}/characters/police-chase.svg`,
        `${BASE_URL}/characters/robber-flee.svg`,
        `${BASE_URL}/icons/police-badge.svg`,
        `${BASE_URL}/icons/robber-badge.svg`,
        `${BASE_URL}/icons/shoeprint.svg`,
      ],
      alternates: {
        languages: alternateLanguages(BASE_URL, "/game"),
      },
    },
    {
      url: `${BASE_URL}/en/game`,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: alternateLanguages(BASE_URL, "/game"),
      },
    },
    {
      url: `${BASE_URL}/ja/game`,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: alternateLanguages(BASE_URL, "/game"),
      },
    },
    {
      url: `${BASE_URL}/team`,
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: alternateLanguages(BASE_URL, "/team"),
      },
    },
    {
      url: `${BASE_URL}/en/team`,
      changeFrequency: "monthly",
      priority: 0.6,
      alternates: {
        languages: alternateLanguages(BASE_URL, "/team"),
      },
    },
    {
      url: `${BASE_URL}/ja/team`,
      changeFrequency: "monthly",
      priority: 0.6,
      alternates: {
        languages: alternateLanguages(BASE_URL, "/team"),
      },
    },
    {
      url: `${BASE_URL}/team/members`,
      changeFrequency: "monthly",
      priority: 0.6,
      images: [
        `${BASE_URL}/team/park.jpeg`,
        `${BASE_URL}/team/lee.jpeg`,
        `${BASE_URL}/team/hong.jpeg`,
        `${BASE_URL}/team/jeong.jpeg`,
        `${BASE_URL}/team/yoon.jpeg`,
        `${BASE_URL}/team/hwang.png`,
      ],
    },
    {
      url: `${BASE_URL}/blog`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    // 모임 목록. 개별 모집글은 며칠 살고 죽지만 이 페이지는 계속 남아 유입구가 된다.
    // 나라마다 목록이 다르므로 언어별 경로를 모두 넣는다
    ...(["", "/en", "/ja"] as const).map((prefix) => ({
      url: `${BASE_URL}${prefix}/community`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...posts.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      ...lastModifiedOf(post),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    // 영어·일본어 블로그. 글이 아직 없어도 목록은 넣어 색인을 시작한다.
    ...(["en", "ja"] as const).flatMap((locale) => [
      {
        url: `${BASE_URL}${localizedPath("/blog", locale)}`,
          changeFrequency: "weekly" as const,
        priority: 0.6,
      },
      ...allPosts
        .filter((post) => post.locale === locale)
        .map((post) => ({
          url: `${BASE_URL}${localizedPath(`/blog/${post.slug}`, locale)}`,
          ...lastModifiedOf(post),
          changeFrequency: "monthly" as const,
          priority: 0.7,
        })),
    ]),
    // 법적 문서(#299), 체험 페이지, 계정 삭제 페이지(#272)는 넣지 않는다. 검색으로 찾아올 페이지가 아니고,
    // 사이트맵에 넣으면 "검색에 내보낼 주소"라고 알리는 셈이라 사이트 평가를 끌어내린다.
    // 페이지는 그대로 열리고 푸터·링크로 크롤링된다.
    ...meetupPages,
  ];
}
