import Link from "next/link";
import ArrowPillLink from "@/components/ui/ArrowPillLink";
import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import LandscapeFrame from "@/components/online/LandscapeFrame";
import { ChaseScene } from "@/components/online/scenes";
import { MODE_STYLE, ModeArt, type ModeId } from "@/components/online/ModeParts";
import { getMessages } from "@/lib/i18n/messages";

// 경찰과 도둑 온라인 게임 소개. 게임이 한국어만 있어 한국어 홈에만 둔다(docs/online-game.md).
// 열리고 닫히는 상태는 /online 이 게임 서버에서 읽어 보여 주고, 여기는 실제 판의 한 장면과 들어가는 길만 둔다.
//
// 놀이 방식 셋(경도, 구역 축소, 좀비 모드)은 세 줄 목록으로 둔다. 줄마다 /online 의 그 장으로 바로 간다.
// 예전에는 "01 경도"처럼 번호와 이름만 든 작은 칩이라, 무슨 판인지 알려 주지 못하고 태그처럼 보였다.
// /online 의 모드 카드와 같은 그림(ModeArt)과 한 줄 소개를 써서 같은 게임으로 읽히게 하고,
// 줄 오른쪽 화살표로 누를 수 있다는 걸 보인다. 들어가는 버튼은 홈의 다른 보조 동작과 같은 알약 링크다
const COPY = getMessages("ko").online;

export default function OnlineGameTeaserSection() {
  return (
    <section className="bg-white py-24 transition-colors duration-500 sm:py-32 dark:bg-app-black">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-14">
          <div>
            <ScrollReveal animation="fadeInLeft">
              <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                경찰과 도둑 온라인 게임
              </h2>
              <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
                밖에 나가지 않고 온라인으로 즐겨 보세요.
              </p>
            </ScrollReveal>

            <ul className="mt-8 flex flex-col gap-2.5">
              {COPY.modes.items.map((m, i) => {
                const id = m.id as ModeId;
                return (
                  <li key={m.id}>
                    <ScrollReveal animation="fadeInLeft" delayMs={80 + i * 60}>
                      <Link
                        href={`/online#${m.id}`}
                        className="group flex items-center gap-4 rounded-2xl bg-slate-50 p-2.5 pr-4 ring-1 ring-transparent transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:ring-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.07] dark:hover:shadow-none dark:hover:ring-white/15"
                      >
                        <div className="relative aspect-4/3 w-20 shrink-0 overflow-hidden rounded-xl">
                          <ModeArt id={id} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 dark:text-white">{m.name}</p>
                          <p className="mt-0.5 text-pretty text-sm leading-snug text-slate-600 dark:text-slate-400">{m.line}</p>
                        </div>
                        <svg
                          viewBox="0 0 16 16"
                          className={`size-4 shrink-0 opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100 ${MODE_STYLE[id].accent}`}
                          aria-hidden="true"
                        >
                          <path
                            d="M6 3.5 10.5 8 6 12.5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                          />
                        </svg>
                      </Link>
                    </ScrollReveal>
                  </li>
                );
              })}
            </ul>

            <ArrowPillLink href="/online" label="어떤 게임인지 보기" className="mt-8 inline-flex" />
          </div>

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
