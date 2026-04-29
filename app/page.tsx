import HeroSection from "@/components/home/HeroSection";
import CharactersSection from "@/components/home/CharactersSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import CtaSection from "@/components/home/CtaSection";
import { APP_LINKS } from "@/lib/constants";

const mobileApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  name: "경찰과 도둑",
  alternateName: ["경도", "Cops and Robbers"],
  applicationCategory: "GameApplication",
  applicationSubCategory: "LocationBasedGame",
  operatingSystem: "iOS, Android",
  description:
    "GPS 기반 오프라인 술래잡기 게임. 친구들과 공원에서 직접 뛰며 즐기는 경찰과 도둑 놀이를 앱이 실시간으로 관리합니다.",
  inLanguage: "ko-KR",
  url: "https://dongsim.vercel.app",
  installUrl: APP_LINKS.appStore,
  downloadUrl: [APP_LINKS.appStore, APP_LINKS.googlePlay],
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "KRW",
  },
  author: {
    "@type": "Organization",
    name: "동심지킴이",
    url: "https://dongsim.vercel.app",
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(mobileApplicationSchema),
        }}
      />
      <header className="sr-only">
        <h2>
          경찰과 도둑(경도) — 동심지킴이의 GPS 기반 오프라인 술래잡기 게임
        </h2>
        <p>
          흔히 &lsquo;경도&rsquo;로 줄여 부르는 경찰과 도둑을 스마트폰으로 다시
          즐기세요. 동심지킴이가 만든 위치 기반 친구 게임으로, 공원에서 직접
          뛰며 구역 그리기, 발자국 추적, QR 체포, 팀 채팅까지 앱 하나로
          진행합니다.
        </p>
      </header>
      <HeroSection />
      <CharactersSection />
      <HowItWorksSection />
      <FeaturesSection />
      <CtaSection />
    </>
  );
}
