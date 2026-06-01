import type { MetadataRoute } from "next";

const BASE_URL = "https://copsnro66ers.site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
      images: [
        `${BASE_URL}/opengraph-image.png`,
        `${BASE_URL}/brand/logo-v5.png`,
        `${BASE_URL}/brand/app-icon.png`,
        `${BASE_URL}/characters/police.svg`,
        `${BASE_URL}/characters/robber.svg`,
      ],
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
    },
    {
      url: `${BASE_URL}/team`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
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
