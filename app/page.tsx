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
  alternateName: "Cops and Robbers",
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
      <HeroSection />
      <CharactersSection />
      <HowItWorksSection />
      <FeaturesSection />
      <CtaSection />
    </>
  );
}
