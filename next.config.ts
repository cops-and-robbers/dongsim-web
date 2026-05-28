import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    const json = [{ key: "Content-Type", value: "application/json" }];
    return [
      { source: "/.well-known/apple-app-site-association", headers: json },
      { source: "/.well-known/assetlinks.json", headers: json },
    ];
  },
};

export default nextConfig;
