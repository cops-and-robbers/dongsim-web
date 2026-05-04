import type { MetadataRoute } from "next";

const BASE_URL = "https://copsnro66ers.site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: "Yeti", allow: "/" },
      { userAgent: "Googlebot", allow: "/" },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
