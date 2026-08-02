import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/blog/notion";
import { alternateLanguages } from "@/lib/i18n/config";

const BASE_URL = "https://copsandrobbers.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const posts = await getPosts(); // 연동 미설정·오류 시 빈 배열이라 안전

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
    ...posts.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: post.date ? new Date(post.date) : now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/location`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/marketing`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
