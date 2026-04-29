import type { Metadata } from "next";
import GameHeroSection from "@/components/game/GameHeroSection";
import FeatureBlock from "@/components/game/FeatureBlock";
import CtaSection from "@/components/home/CtaSection";
import { GAME_FEATURES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "게임 소개",
  description:
    "경찰과 도둑(경도) — GPS와 실시간 지도가 진행을 관리하는 위치 기반 술래잡기. 지도에 구역 그리기, 발자국 추적, QR 체포, 팀 채팅까지 4가지 핵심 기능을 소개합니다.",
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

export default function GamePage() {
  return (
    <>
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
      <CtaSection />
    </>
  );
}
