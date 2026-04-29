import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ThemeProvider from "@/components/ThemeProvider";

const SITE_URL = "https://dongsim.vercel.app";
const SITE_NAME = "경찰과 도둑";
const SITE_DESCRIPTION =
  "경찰과 도둑(경도) — GPS 기반 오프라인 술래잡기 게임. 실제로 뛰어다니며 즐기는 경찰과 도둑 놀이를 앱이 자동으로 관리합니다.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | 동심지킴이`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "경찰과 도둑",
    "경도",
    "경도 게임",
    "동심지킴이",
    "GPS 술래잡기",
    "위치 기반 게임",
    "오프라인 게임",
    "공원 게임",
    "야외 게임",
    "친구 게임",
    "추억의 게임",
    "Cops and Robbers",
  ],
  applicationName: SITE_NAME,
  authors: [{ name: "동심지킴이" }],
  creator: "동심지킴이",
  publisher: "동심지킴이",
  category: "game",
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${SITE_NAME} | 동심지킴이`,
    description:
      "경찰과 도둑(경도) — GPS와 실시간 지도로 더 짜릿해진 오프라인 술래잡기. 친구들과 밖에서 뛰어노세요.",
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | 동심지킴이`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  appleWebApp: {
    title: SITE_NAME,
    capable: true,
    statusBarStyle: "default",
  },
  itunes: {
    appId: "6756843948",
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  verification: {
    google: "GPbIm3ZTSF5v1WoLOqTqYOypdgnf1m-kt5TWt2tgUfE",
    other: {
      "naver-site-verification": "6f930a0d25d522a92d5de563f945492f2fa6c461",
    },
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "동심지킴이",
  alternateName: "팀 동심지킴이",
  url: SITE_URL,
  logo: `${SITE_URL}/brand/logo-v5.png`,
  email: "copsnro66ers@gmail.com",
  sameAs: [
    "https://www.instagram.com/cops._.robbers",
    "https://github.com/cops-and-robbers",
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: ["경도", "동심지킴이", "Cops and Robbers"],
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: "ko-KR",
  publisher: {
    "@type": "Organization",
    name: "동심지킴이",
    url: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-white text-slate-900 transition-colors duration-500 dark:bg-app-black dark:text-slate-100">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <ThemeProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
