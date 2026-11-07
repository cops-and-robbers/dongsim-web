import HeroSection from "./HeroSection";
import CharactersSection from "./CharactersSection";
import HowItWorksSection from "./HowItWorksSection";
import FeaturesSection from "./FeaturesSection";
import MinigameTeaserSection from "./MinigameTeaserSection";
import CtaSection from "./CtaSection";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { showHomeMinigame } from "@/lib/event/server";

// 홈 본문 섹션 묶음. 미니게임 칸은 어드민 "행사"에서 정한 기간에만 보인다(#219).
export default async function HomeSections({ locale }: { locale: Locale }) {
  const copy = getMessages(locale).home;
  const minigame = await showHomeMinigame();
  return (
    <>
      <HeroSection copy={copy.hero} locale={locale} />
      <CharactersSection copy={copy.characters} />
      <HowItWorksSection copy={copy.how} />
      <FeaturesSection copy={copy.features} />
      {minigame && <MinigameTeaserSection copy={copy.minigame} locale={locale} />}
      <CtaSection copy={copy.finalCta} locale={locale} />
    </>
  );
}
