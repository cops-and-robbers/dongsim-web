import type { Metadata, Viewport } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import "./globals.css";

const pretendard = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  display: "swap",
  variable: "--font-pretendard",
  weight: "45 920",
});
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ThemeProvider from "@/components/ThemeProvider";

const GTM_ID = "GTM-WG4J7BXL";

const SITE_URL = "https://copsnro66ers.site";
const SITE_NAME = "경찰과 도둑";
const SITE_DESCRIPTION =
  "경찰과 도둑(경도) — GPS 기반 오프라인 술래잡기 게임. 실제로 뛰어다니며 즐기는 경찰과 도둑 놀이를 앱이 자동으로 관리합니다.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "경찰과 도둑",
    "경찰과 도둑 앱",
    "경도",
    "경도 앱",
    "경도 게임",
    "동심지키미",
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
  authors: [{ name: "동심지키미" }],
  creator: "동심지키미",
  publisher: "동심지키미",
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
    title: SITE_NAME,
    description:
      "경찰과 도둑(경도) — GPS와 실시간 지도로 더 짜릿해진 오프라인 술래잡기. 친구들과 밖에서 뛰어노세요.",
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
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
    google: "EM3kJB3fS-BFeyM4ZUps2_vema1a9ZDCeGbLfnhOkNk",
    other: {
      "naver-site-verification": "5e0fd8064fc8996b8716790efeafbb9385e3e420",
    },
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "동심지키미",
  alternateName: "팀 동심지키미",
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
  alternateName: ["경도", "동심지키미", "Cops and Robbers"],
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: "ko-KR",
  publisher: {
    "@type": "Organization",
    name: "동심지키미",
    url: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`h-full antialiased ${pretendard.variable}`}>
      <head>
        <meta name="theme-color" content="#ffffff" />
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
      </head>
      <body className="flex min-h-full flex-col bg-white text-slate-900 transition-colors duration-500 dark:bg-app-black dark:text-slate-100">
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
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
