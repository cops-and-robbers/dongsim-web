import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://dongsim.vercel.app"),
  title: {
    default: "경찰과 도둑 | 동심지킴이",
    template: "%s | 경찰과 도둑",
  },
  description:
    "GPS 기반 오프라인 술래잡기 게임. 실제로 뛰어다니며 즐기는 경찰과 도둑 놀이를 앱이 자동으로 관리합니다.",
  openGraph: {
    title: "경찰과 도둑 | 동심지킴이",
    description:
      "GPS와 실시간 지도로 더 짜릿해진 오프라인 경찰과 도둑. 친구들과 밖에서 뛰어놀세요.",
    type: "website",
    locale: "ko_KR",
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
        <ThemeProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
