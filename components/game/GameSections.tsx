import GameHeroSection from "@/components/game/GameHeroSection";
import GameRulesSection from "@/components/game/GameRulesSection";
import FeatureBlock from "@/components/game/FeatureBlock";
import GameFaqSection from "@/components/game/GameFaqSection";
import CtaSection from "@/components/home/CtaSection";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import { GAME_FEATURE_MOCKUPS } from "@/lib/constants";
import { getMessages } from "@/lib/i18n/messages";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { CHROME } from "@/lib/i18n/chrome";

const HOME_LABEL: Record<Locale, string> = {
  ko: "홈",
  en: "Home",
  ja: "ホーム",
};

// 게임 소개 본문 묶음 - 히어로 + 기능 블록(목업은 언어 무관) + FAQ + CTA + 구조화 데이터.
export default function GameSections({ locale }: { locale: Locale }) {
  const copy = getMessages(locale).game;
  const gameLabel =
    CHROME[locale].nav.find((item) => item.path === "/game")?.label ?? "";

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: copy.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: HOME_LABEL[locale], path: localizedPath("/", locale) },
          { name: gameLabel, path: localizedPath("/game", locale) },
        ]}
      />
      <GameHeroSection copy={copy.hero} />
      <GameRulesSection copy={copy.rules} />
      <div className="bg-white transition-colors duration-500 dark:bg-app-black">
        {copy.features.map((feature, i) => (
          <div
            key={i}
            className={`transition-colors duration-500 ${
              i % 2 === 0
                ? "bg-white dark:bg-app-black"
                : "bg-slate-50 dark:bg-app-black-900"
            }`}
          >
            <FeatureBlock
              copy={feature}
              mockup={GAME_FEATURE_MOCKUPS[i]}
              index={i}
              total={copy.features.length}
            />
          </div>
        ))}
      </div>
      <GameFaqSection heading={copy.faqHeading} items={copy.faq} />
      <CtaSection copy={getMessages(locale).home.finalCta} />
    </>
  );
}
