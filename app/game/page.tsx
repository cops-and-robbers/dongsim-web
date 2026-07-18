import type { Metadata } from "next";
import GameHeroSection from "@/components/game/GameHeroSection";
import FeatureBlock from "@/components/game/FeatureBlock";
import GameFaqSection from "@/components/game/GameFaqSection";
import CtaSection from "@/components/home/CtaSection";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import { GAME_FEATURES, GAME_FAQ } from "@/lib/constants";

export const metadata: Metadata = {
  title: "게임 소개",
  description:
    "경찰과 도둑(경도) - GPS와 실시간 지도가 진행을 관리하는 위치 기반 술래잡기. 지도에 구역 그리기, 발자국 추적, QR 체포, 팀 채팅까지 4가지 핵심 기능을 소개합니다.",
  keywords: [
    "경찰과 도둑 게임",
    "경도 게임 방법",
    "경찰과 도둑 플레이",
    "GPS 술래잡기",
    "위치 기반 멀티플레이어",
    "발자국 추적 게임",
    "QR 체포",
    "구역 그리기",
    "팀 채팅 게임",
    "야외 모바일 게임",
    "공원 게임 앱",
    "친구와 할 게임",
  ],
  alternates: { canonical: "/game" },
  openGraph: {
    title: "게임 소개 | 경찰과 도둑",
    description:
      "구역 그리기, 발자국 추적, QR 체포, 팀 채팅. 술래잡기에 필요한 모든 게 앱 하나에 담겨 있어요.",
    url: "/game",
    type: "article",
    locale: "ko_KR",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: GAME_FAQ.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function GamePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "홈", path: "/" },
          { name: "게임 소개", path: "/game" },
        ]}
      />
      <GameHeroSection />
      <div className="bg-white transition-colors duration-500 dark:bg-app-black">
        {GAME_FEATURES.map((feature, i) => (
          <div
            key={feature.badge}
            className={`transition-colors duration-500 ${
              i % 2 === 0
                ? "bg-white dark:bg-app-black"
                : "bg-slate-50 dark:bg-app-black-900"
            }`}
          >
            <FeatureBlock
              feature={feature}
              index={i}
              total={GAME_FEATURES.length}
            />
          </div>
        ))}
      </div>
      <GameFaqSection />
      <CtaSection />
    </>
  );
}
