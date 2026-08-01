import type { MetadataRoute } from "next";

const BASE_URL = "https://copsandrobbers.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/join/" },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
