import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { PhoneFrame } from "./PhoneMockup";
import { LazyStartSequenceMockup } from "./mockups/LazySceneMockups";
import type { Messages } from "@/lib/i18n/messages";

// 게임 소개 첫 화면. 제목 옆 폰에서 앱의 게임 시작 순간(역할 배너 → 대기 장면 → 출동 카운팅 → 지도)이
// 한 번 재생된다. 진영은 사이트 테마를 따른다(라이트 경찰, 다크 도둑).
// 폰 틀이 먼저 자리를 잡고 장면은 따로 받아 오므로 제목이 늦게 뜨지 않는다.
export default function GameHeroSection({
  copy,
}: {
  copy: Messages["game"]["hero"];
}) {
  return (
    <section className="overflow-x-clip border-b border-slate-200 bg-white transition-colors duration-500 dark:border-white/10 dark:bg-app-black">
      <Container className="py-20 sm:py-28">
        <div className="grid items-center gap-12 md:grid-cols-[minmax(0,1fr)_auto] md:gap-16">
          <ScrollReveal animation="fadeInUp">
            <div className="max-w-3xl">
              <h1 className="text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl dark:text-white">
                {copy.title1}
                <br />
                {copy.title2}
              </h1>
              <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 sm:mt-8 sm:text-lg md:text-xl dark:text-slate-300">
                {copy.lead}
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal animation="fadeInRight" delayMs={120}>
            <div className="mx-auto w-[min(72vw,260px)] md:w-[280px] lg:w-[300px]">
              <PhoneFrame>
                <LazyStartSequenceMockup />
              </PhoneFrame>
            </div>
          </ScrollReveal>
        </div>
      </Container>
    </section>
  );
}
