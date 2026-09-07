import { LEGAL_DOCS } from "@/lib/legal/documents";
import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog/notion";
import { allOpenPosts, listScopeOf, postPath } from "@/lib/community/api";
import { LOCALES, alternateLanguages, localizedPath } from "@/lib/i18n/config";

const BASE_URL = "https://copsandrobbers.app";

// 노션에 새 글을 공개하면 재배포 없이도 사이트맵에 들어오도록 주기적으로 다시 만든다.
// (기본값은 빌드 시 1회 생성이라, 배포 사이에 올린 글이 색인 대상에서 빠진다)
// 목록·RSS와 같은 결의 주기. 사이트맵은 크롤러만 읽으므로 더 길게 잡아도 무방하다.
export const revalidate = 600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  // 언어 구분 없이 받아 각 글을 자기 언어 경로로 넣는다. 연동 미설정·오류 시 빈 배열.
  const allPosts = await getAllPosts();
  const posts = allPosts.filter((post) => post.locale === "ko");

  // 모집글 상세. 글마다 지역·장소 이름이 들어가 지역 검색 유입 경로가 된다(#107).
  // 글 하나에 주소도 하나라(postPath - 국가가 언어를 정한다) 중복 색인이 없다.
  // 종료 글은 넣지 않는다 - 지난 모임 페이지가 대량 색인되면 철 지난 콘텐츠
  // 판정 위험이 있고, 모임이 끝나면 다음 재생성 때 자연히 빠진다.
  const meetupPages = (
    await Promise.all(LOCALES.map((locale) => allOpenPosts(listScopeOf(locale))))
  )
    .flat()
    .map((post) => ({
      url: `${BASE_URL}${postPath(post)}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));

  return [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
      images: [
        `${BASE_URL}/opengraph-image.png`,
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
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: alternateLanguages(BASE_URL),
      },
    },
    {
      url: `${BASE_URL}/ja`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: alternateLanguages(BASE_URL),
      },
    },
    {
      url: `${BASE_URL}/game`,
      lastModified: now,
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
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: alternateLanguages(BASE_URL, "/game"),
      },
    },
    {
      url: `${BASE_URL}/ja/game`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: alternateLanguages(BASE_URL, "/game"),
      },
    },
    {
      url: `${BASE_URL}/demo`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: alternateLanguages(BASE_URL, "/demo"),
      },
    },
    {
      url: `${BASE_URL}/en/demo`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
      alternates: {
        languages: alternateLanguages(BASE_URL, "/demo"),
      },
    },
    {
      url: `${BASE_URL}/ja/demo`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
      alternates: {
        languages: alternateLanguages(BASE_URL, "/demo"),
      },
    },
    {
      url: `${BASE_URL}/team`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: alternateLanguages(BASE_URL, "/team"),
      },
    },
    {
      url: `${BASE_URL}/en/team`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
      alternates: {
        languages: alternateLanguages(BASE_URL, "/team"),
      },
    },
    {
      url: `${BASE_URL}/ja/team`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
      alternates: {
        languages: alternateLanguages(BASE_URL, "/team"),
      },
    },
    {
      url: `${BASE_URL}/team/members`,
      lastModified: now,
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
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    // 모임 목록. 개별 모집글은 며칠 살고 죽지만 이 페이지는 계속 남아 유입구가 된다.
    // 나라마다 목록이 다르므로 언어별 경로를 모두 넣는다
    ...(["", "/en", "/ja"] as const).map((prefix) => ({
      url: `${BASE_URL}${prefix}/community`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...posts.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: post.date ? new Date(post.date) : now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    // 영어·일본어 블로그. 글이 아직 없어도 목록은 넣어 색인을 시작한다.
    ...(["en", "ja"] as const).flatMap((locale) => [
      {
        url: `${BASE_URL}${localizedPath("/blog", locale)}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      },
      ...allPosts
        .filter((post) => post.locale === locale)
        .map((post) => ({
          url: `${BASE_URL}${localizedPath(`/blog/${post.slug}`, locale)}`,
          lastModified: post.date ? new Date(post.date) : now,
          changeFrequency: "monthly" as const,
          priority: 0.7,
        })),
    ]),
    // 법적 문서는 언어별로 낸다. 앱 웹뷰용 /legal/*/embed 는 같은 내용이 두 주소로
    // 잡히지 않도록 빼둔다(robots.ts 도 같은 경로를 막는다).
    ...LOCALES.flatMap((locale) =>
      LEGAL_DOCS.map((doc) => ({
        url: `${BASE_URL}${localizedPath(`/${doc}`, locale)}`,
        lastModified: now,
        changeFrequency: "yearly" as const,
        priority: 0.3,
      })),
    ),
    ...meetupPages,
  ];
}
