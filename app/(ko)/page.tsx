import HeroSection from "@/components/home/HeroSection";
import CharactersSection from "@/components/home/CharactersSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import MinigameTeaserSection from "@/components/home/MinigameTeaserSection";
import OnlineGameTeaserSection from "@/components/home/OnlineGameTeaserSection";
import type { Metadata } from "next";
import CtaSection from "@/components/home/CtaSection";
import { getMessages } from "@/lib/i18n/messages";
import { alternateLanguages } from "@/lib/i18n/config";
import EventModal from "@/components/home/EventModal";
import { homePopup, showHomeMinigame } from "@/lib/event/server";
import UpdateAnnouncementModal from "@/components/home/UpdateAnnouncementModal";
import { isUpdateAnnouncementLive } from "@/lib/app-version";
import WebsiteJsonLd from "@/components/seo/WebsiteJsonLd";
import { APP_LINKS, SITE_URL } from "@/lib/constants";

const gameSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "경찰과 도둑이란 어떤 게임인가요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "경찰과 도둑은 한국에서 오랫동안 사랑받아 온 술래잡기 놀이예요. 동심지키미는 이 놀이를 GPS 기반 모바일 앱으로 되살려, 친구들과 공원이나 야외에서 실제로 뛰면서 즐길 수 있게 만들었어요. 줄여서 '경도'라고도 불러요.",
          },
        },
        {
          "@type": "Question",
          name: "경도(경찰과 도둑) 어떻게 플레이하나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "방장이 지도에 플레이 구역과 감옥을 그리고 게임을 시작해요. 도둑 위치는 방장이 정한 주기마다 발자국으로 공개되고, 경찰은 도둑을 터치한 뒤 QR을 찍어 체포해요. 같은 팀끼리는 채팅과 핑으로 작전을 나눠요.",
          },
        },
        {
          "@type": "Question",
          name: "경찰과 도둑 앱의 핵심 기능은 무엇인가요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "도둑 위치를 주기마다 보여 주는 발자국, 원이나 핀으로 그리는 플레이 구역, 게임 중에 좁아지는 구역, 터치 뒤 QR로 확인하는 체포, 팀 채팅, 팀별 MVP와 이동 경로 기록을 모두 무료로 쓸 수 있어요. iOS와 Android 모두 지원하고, 최대 150명까지 함께 하는 위치 기반 멀티플레이어 게임이에요.",
          },
        },
        {
          "@type": "Question",
          name: "몇 명이 함께 할 수 있나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "최소 2명부터 최대 150명까지 함께 할 수 있고, 경찰 팀과 도둑 팀에 한 명씩은 있어야 시작돼요.",
          },
        },
        {
          "@type": "Question",
          name: "경찰과 도둑(경도) 앱은 어디서 다운로드하나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "App Store와 Google Play에서 '경찰과 도둑'을 검색해 무료로 받을 수 있어요.",
          },
        },
      ],
    },
    {
      "@type": "HowTo",
      name: "경찰과 도둑(경도) 플레이 방법",
      description:
        "스마트폰으로 친구들과 공원에서 GPS 기반 술래잡기 게임 경찰과 도둑을 시작하는 4단계 가이드.",
      totalTime: "PT5M",
      step: [
        {
          "@type": "HowToStep",
          position: 1,
          name: "방 만들기",
          text: "방을 만들면 6자리 초대 코드와 QR이 자동으로 생성돼요.",
        },
        {
          "@type": "HowToStep",
          position: 2,
          name: "구역 그리기",
          text: "지도 위에 원이나 핀으로 플레이 구역과 감옥을 그려요.",
        },
        {
          "@type": "HowToStep",
          position: 3,
          name: "팀 정하기",
          text: "방에 들어오면 팀이 정해지고, 대기실에서 언제든 바꿀 수 있어요.",
        },
        {
          "@type": "HowToStep",
          position: 4,
          name: "이제 뛰면 돼요",
          text: "제한 시간 안에 도둑을 모두 잡으면 경찰 승, 한 명이라도 살아남으면 도둑 승.",
        },
      ],
    },
    {
      "@type": "VideoGame",
      name: "경찰과 도둑",
      alternateName: ["경도", "경도 게임", "Cops and Robbers"],
      description:
        "GPS 기반 오프라인 술래잡기 게임. 친구들과 밖에서 직접 뛰며 놀던 그 놀이를 이제 앱과 함께 즐기세요.",
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
      url: SITE_URL,
      installUrl: APP_LINKS.appStore,
      downloadUrl: [APP_LINKS.appStore, APP_LINKS.googlePlay],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "KRW",
      },
      author: {
        "@type": "Organization",
        name: "동심지키미",
        url: SITE_URL,
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
        "GPS 기반 오프라인 술래잡기 게임. 친구들과 밖에서 직접 뛰며 놀던 그 놀이를 이제 앱과 함께 즐기세요.",
      inLanguage: "ko-KR",
      url: SITE_URL,
      installUrl: APP_LINKS.appStore,
      downloadUrl: [APP_LINKS.appStore, APP_LINKS.googlePlay],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "KRW",
      },
      author: {
        "@type": "Organization",
        name: "동심지키미",
        url: SITE_URL,
      },
    },
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: "경찰과 도둑",
      inLanguage: "ko-KR",
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: ["#game-intro"],
      },
    },
  ],
};

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
    languages: {
      ...alternateLanguages(SITE_URL),
      "x-default": `${SITE_URL}/`,
    },
  },
};

// 행사 팝업과 미니게임 칸은 어드민 "행사"에서 정한 기간에만 보인다(#219). 1분마다 다시 그려 기간을 따라간다
export const revalidate = 60;

export default async function HomePage() {
  const copy = getMessages("ko").home;
  const [updateLive, popup, minigame] = await Promise.all([isUpdateAnnouncementLive(), homePopup(), showHomeMinigame()]);
  return (
    <>
      <WebsiteJsonLd locale="ko" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(gameSchema),
        }}
      />
      <EventModal popup={popup} />
      <UpdateAnnouncementModal enabled={updateLive} />
      <HeroSection copy={copy.hero} locale="ko" />
      <section
        id="game-intro"
        className="sr-only"
        aria-label="경찰과 도둑(경도) 게임 소개"
      >
        <h2>
          경찰과 도둑(경도) - 동심지키미의 GPS 기반 오프라인 술래잡기 게임
        </h2>
        <p>
          흔히 &lsquo;경도&rsquo;로 줄여 부르는 경찰과 도둑을 스마트폰으로 다시 즐겨 보세요. 동심지키미가 만든 위치 기반 친구 게임으로, 공원에서 직접 뛰고 판단은 앱이 도와줘요.
        </p>

        <h3>경찰과 도둑이란 어떤 게임인가요?</h3>
        <p>
          경찰과 도둑은 한국에서 오랫동안 사랑받아 온 술래잡기 놀이예요. 동심지키미는 이 놀이를 GPS 기반 모바일 앱으로 되살려, 친구들과 공원이나 야외에서 실제로 뛰면서 즐길 수 있게 만들었어요. 줄여서 &lsquo;경도&rsquo;라고도 불러요.
        </p>

        <h3>경도(경찰과 도둑) 어떻게 플레이하나요?</h3>
        <p>
          방장이 지도에 플레이 구역과 감옥을 그리고 게임을 시작해요. 도둑 위치는 방장이 정한 주기마다 발자국으로 공개되고, 경찰은 도둑을 터치한 뒤 QR을 찍어 체포해요. 같은 팀끼리는 채팅과 핑으로 작전을 나눠요.
        </p>

        <h3>경찰과 도둑 앱의 핵심 기능</h3>
        <p>
          도둑 위치를 주기마다 보여 주는 발자국, 원이나 핀으로 그리는 플레이 구역, 게임 중에 좁아지는 구역, 터치 뒤 QR로 확인하는 체포, 팀 채팅, 팀별 MVP와 이동 경로 기록을 모두 무료로 쓸 수 있어요. iOS와 Android 모두 지원하고, 최대 150명까지 함께 하는 위치 기반 멀티플레이어 게임이에요.
        </p>

        <h3>몇 명이 함께 할 수 있나요?</h3>
        <p>
          최소 2명부터 최대 150명까지 함께 할 수 있고, 경찰 팀과 도둑 팀에 한 명씩은 있어야 시작돼요.
        </p>

        <h3>경찰과 도둑(경도) 앱은 어디서 다운로드하나요?</h3>
        <p>
          App Store와 Google Play에서 &lsquo;경찰과 도둑&rsquo;을 검색해 무료로 받을 수 있어요.
        </p>
      </section>
      <CharactersSection copy={copy.characters} />
      <HowItWorksSection copy={copy.how} />
      <FeaturesSection copy={copy.features} />
      <OnlineGameTeaserSection />
      {minigame && <MinigameTeaserSection copy={copy.minigame} locale="ko" />}
      <CtaSection copy={copy.finalCta} locale="ko" />
    </>
  );
}
