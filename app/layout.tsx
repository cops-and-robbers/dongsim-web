import type { Metadata, Viewport } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import "./a11y.css";
import "./i18n.css";

const pretendard = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  display: "swap",
  variable: "--font-pretendard",
  weight: "45 920",
});
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ThemeProvider from "@/components/ThemeProvider";
import LocaleProvider from "@/components/i18n/LocaleProvider";
import SkipLink from "@/components/i18n/SkipLink";
import { SITE_URL } from "@/lib/constants";

const GTM_ID = "GTM-WG4J7BXL";

const SITE_NAME = "경찰과 도둑";
const SITE_DESCRIPTION =
  "경찰과 도둑(경도) - GPS 기반 오프라인 술래잡기 게임. 친구들과 밖에서 직접 뛰며 놀던 그 놀이를 이제 앱과 함께 즐기세요.";

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
      "경찰과 도둑(경도) - GPS와 실시간 지도로 더 짜릿해진 오프라인 술래잡기. 친구들과 밖에서 뛰어노세요.",
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
  // 파비콘(rel=icon)은 metadata로 선언하지 않는다: Next가 관리하면 라우트 이동마다
  // 기본값으로 되돌려 테마 스왑이 풀린다. 대신 페인트 전 인라인 스크립트로 처음 깔고
  // ThemeProvider가 토글 시 교체해, 우리가 링크를 온전히 소유한다. apple만 정적으로 둔다.
  icons: {
    apple: "/apple-icon.png",
  },
  verification: {
    google: "EM3kJB3fS-BFeyM4ZUps2_vema1a9ZDCeGbLfnhOkNk",
    other: {
      "naver-site-verification": "90903d1a4454a1e48eb6e2d8e0b4c2e71cd535e0",
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
  logo: `${SITE_URL}/brand/app-icon.png`,
  email: "copsnro66ers@gmail.com",
  sameAs: [
    "https://www.instagram.com/cops._.robbers",
    "https://github.com/cops-and-robbers",
    "https://www.youtube.com/channel/UCUmCD4Lg4jc95ShNBPxSdDA",
    "https://www.tiktok.com/@cops._.robbers",
  ],
};

// WebSite 스키마는 언어마다 이름·설명이 달라야 해서 각 언어 홈(WebsiteJsonLd)에서 렌더한다.
// Organization은 언어와 무관한 팀 정보라 여기 둔다.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`h-full antialiased ${pretendard.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#ffffff" />
        {/* 페인트 전 톤 결정: 저장된 선택 → 기기 다크 → 경찰(읽기 실패 시 경찰) */}
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=location.pathname;var lg=(p==='/ja'||p.indexOf('/ja/')===0)?'ja':(p==='/en'||p.indexOf('/en/')===0)?'en':'ko';document.documentElement.lang=lg;var s=localStorage.getItem('team');var d=s==='robber'||(s!=='police'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');var m=document.querySelector('meta[name="theme-color"]');if(m)m.content='#080a0c';}var l=document.createElement('link');l.rel='icon';l.type='image/svg+xml';l.href=d?'/favicon-dark.svg':'/favicon-light.svg';document.head.appendChild(l);}catch(e){}})();`,
          }}
        />
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
        <ThemeProvider>
          <LocaleProvider>
            <SkipLink />
            <Header />
            <main id="main-content" className="flex-1">
              {children}
            </main>
            <Footer />
          </LocaleProvider>
        </ThemeProvider>
        {/* Vercel 방문 분석 + 실사용자 Core Web Vitals(RUM) 수집 */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
