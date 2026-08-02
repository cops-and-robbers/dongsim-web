import HeroSection from "./HeroSection";
import CharactersSection from "./CharactersSection";
import HowItWorksSection from "./HowItWorksSection";
import FeaturesSection from "./FeaturesSection";
import MinigameTeaserSection from "./MinigameTeaserSection";
import CtaSection from "./CtaSection";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

// 홈 본문 섹션 묶음. 미니게임(/play)은 한국어 전용이라 ko에서만 렌더한다.
export default function HomeSections({ locale }: { locale: Locale }) {
  const copy = getMessages(locale).home;
  return (
    <>
      <HeroSection copy={copy.hero} locale={locale} />
      <CharactersSection copy={copy.characters} />
      <HowItWorksSection copy={copy.how} />
      <FeaturesSection copy={copy.features} />
      <MinigameTeaserSection copy={copy.minigame} locale={locale} />
      <CtaSection copy={copy.finalCta} />
    </>
  );
}
