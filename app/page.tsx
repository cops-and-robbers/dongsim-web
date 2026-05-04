import HeroSection from "@/components/home/HeroSection";
import CharactersSection from "@/components/home/CharactersSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import CtaSection from "@/components/home/CtaSection";
import { APP_LINKS } from "@/lib/constants";

const gameSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "VideoGame",
      name: "경찰과 도둑",
      alternateName: ["경도", "경도 게임", "Cops and Robbers"],
      description:
        "GPS 기반 오프라인 술래잡기 게임. 친구들과 공원에서 직접 뛰며 즐기는 경찰과 도둑(경도) 놀이를 앱이 실시간으로 관리합니다.",
      genre: ["Action", "Multiplayer", "Location-based", "Outdoor"],
      playMode: "MultiPlayer",
      numberOfPlayers: {
        "@type": "QuantitativeValue",
        minValue: 2,
        maxValue: 50,
      },
      gamePlatform: ["iOS", "Android"],
      applicationCategory: "GameApplication",
      operatingSystem: "iOS, Android",
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
    },
    {
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
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(gameSchema),
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

        <h3>경찰과 도둑이란 어떤 게임인가요?</h3>
        <p>
          경찰과 도둑은 한국에서 오랫동안 사랑받아 온 추억의 술래잡기 놀이예요.
          동심지킴이는 이 추억의 게임을 GPS 기반 모바일 앱으로 되살려, 친구들과
          공원이나 야외에서 실제로 뛰면서 즐길 수 있도록 만들었습니다. 별명으로
          &lsquo;경도&rsquo;라고도 부릅니다.
        </p>

        <h3>경도(경찰과 도둑) 어떻게 플레이하나요?</h3>
        <p>
          방장이 지도에서 플레이 구역과 감옥 위치를 그리면 게임이 시작됩니다.
          도둑은 방장이 정한 주기마다 발자국으로 위치가 공개되고, 경찰은 도둑의
          QR 코드를 스캔해 체포합니다. 같은 팀끼리 채팅으로 전략을 공유할 수
          있습니다.
        </p>

        <h3>경찰과 도둑 앱의 핵심 기능</h3>
        <p>
          실시간 GPS 위치 추적, 자유로운 플레이 구역 설정, 주기별 발자국 공개
          시스템, QR 스캔 체포 시스템, 팀 분리 채팅 기능이 모두 무료로
          제공됩니다. iOS와 Android 모두 지원하며, 최대 50명까지 함께 플레이할
          수 있는 위치 기반 멀티플레이어 게임입니다.
        </p>

        <h3>몇 명이 함께 할 수 있나요?</h3>
        <p>
          최소 2명부터 최대 50명까지 함께 플레이할 수 있어요. 친구들끼리 모여
          경찰 팀과 도둑 팀으로 나뉘어 진행합니다.
        </p>

        <h3>경찰과 도둑(경도) 앱은 어디서 다운로드하나요?</h3>
        <p>
          App Store와 Google Play 양쪽에서 &lsquo;경찰과 도둑&rsquo;으로 검색해
          무료로 다운로드할 수 있습니다.
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
