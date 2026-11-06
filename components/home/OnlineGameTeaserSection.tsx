import Link from "next/link";
import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import LandscapeFrame from "@/components/online/LandscapeFrame";
import { ChaseScene } from "@/components/online/scenes";

// 경찰과 도둑 온라인 게임 소개. 게임이 한국어만 있어 한국어 홈에만 둔다(docs/online-game.md).
// 열리고 닫히는 상태는 /online 이 게임 서버에서 읽어 보여 주고, 여기는 실제 판의 한 장면과 들어가는 길만 둔다
export default function OnlineGameTeaserSection() {
  return (
    <section className="bg-white py-24 transition-colors duration-500 sm:py-32 dark:bg-app-black">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-14">
          <ScrollReveal animation="fadeInLeft">
            <p className="text-sm font-bold tracking-wider text-brand-blue dark:text-brand-green">만들고 있어요</p>
            <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight text-brand-ink sm:text-4xl dark:text-white">
              경찰과 도둑 온라인 게임
            </h2>
            <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
              친구에게 링크를 보내 폰이나 컴퓨터에서 같이 하는 게임이에요. 숨고, 쫓고, 감옥에서 동료를 꺼내요.
            </p>
            <Link
              href="/online"
              className="mt-6 inline-flex items-center gap-1 text-base font-bold text-brand-blue underline-offset-4 hover:underline dark:text-brand-green"
            >
              어떤 게임인지 보기 <span aria-hidden>→</span>
            </Link>
          </ScrollReveal>
          <ScrollReveal animation="fadeInRight" delayMs={100}>
            <Link href="/online" aria-label="경찰과 도둑 온라인 게임 보기" className="block transition-transform duration-300 hover:-translate-y-1">
              <LandscapeFrame>
                <ChaseScene />
              </LandscapeFrame>
            </Link>
          </ScrollReveal>
        </div>
      </Container>
    </section>
  );
}
