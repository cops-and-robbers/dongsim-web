/* eslint-disable @next/next/no-img-element */
import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { COMPANY_INFO } from "@/lib/constants";

// 회사 소개 - 공식체(~입니다). 왼쪽 인트로 + 오른쪽 회사 정보 카드.
// 카드는 항목을 행으로 계속 붙일 수 있게 COMPANY_INFO 기반으로 구성한다.
export default function TeamHeroSection() {
  // 회사 정보 카드 위 캐릭터 - 모달과 동일한 등장 애니메이션(scaleIn, 같은 속도·이징).
  const pop = {
    animation: "scaleIn 0.25s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both",
    transformOrigin: "bottom" as const,
  };
  return (
    <section className="border-b border-slate-200 bg-white transition-colors duration-500 dark:border-white/10 dark:bg-app-black">
      <Container className="py-24 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-16">
          <ScrollReveal animation="fadeInUp">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-blue dark:text-brand-green">
                동심지키미
              </p>
              <h1 className="mt-4 text-balance text-4xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-5xl md:text-6xl dark:text-white">
                게임으로 사람과 사람을
                <br />
                연결합니다
              </h1>
              <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
                <p>
                  동심지키미는 누구나 함께 웃고 뛰어놀며 새로운 추억을 만들 수
                  있는 경험을 기획·개발하는 팀입니다. 우리는 게임을 통해 사람과
                  사람을 연결하는 것을 목표로 합니다.
                </p>
                <p>
                  대표 서비스 ‘경찰과 도둑’은 실시간 위치 데이터를 기반으로
                  사용자 간 추적과 회피를 구현하여, 단순한 게임을 넘어 몰입감 있는
                  오프라인 경험을 제공합니다.
                </p>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fadeInUp" delayMs={120}>
            {/* 모바일은 카드가 문단 바로 밑이라, 빼꼼 캐릭터가 앉을 공간을 위에 확보. */}
            <div className="relative mx-auto mt-28 w-full max-w-80 lg:mx-0 lg:mt-0">
              {/* 카드 뒤에서 머리가 빼꼼 - 라이트=냥파(경찰), 다크=도둥이(도둑). */}
              <div className="pointer-events-none absolute inset-x-0 bottom-full z-0 flex translate-y-1.25 justify-center">
                <img
                  src="/characters/police-win-body.svg"
                  alt=""
                  style={pop}
                  className="h-auto w-[56%] drop-shadow-sm dark:hidden"
                />
                <img
                  src="/characters/robber-win-body.svg"
                  alt=""
                  style={pop}
                  className="hidden h-auto w-1/2 drop-shadow-sm dark:block"
                />
              </div>

              <div className="relative z-10 w-full rounded-3xl border border-slate-200 bg-white p-7 shadow-sm dark:border-white/10 dark:bg-app-black-900">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-blue dark:text-brand-green">
                  회사 정보
                </p>
                <dl className="mt-4">
                  {COMPANY_INFO.map((row, i) => (
                    <div
                      key={row.label}
                      className={`flex items-center justify-between gap-6 py-3.5 ${
                        i > 0
                          ? "border-t border-slate-100 dark:border-white/10"
                          : ""
                      }`}
                    >
                      <dt className="shrink-0 text-sm font-medium text-slate-400 dark:text-slate-500">
                        {row.label}
                      </dt>
                      <dd className="min-w-0 truncate text-right text-sm font-semibold text-slate-900 dark:text-white">
                        {row.href ? (
                          <a
                            href={row.href}
                            className="text-brand-blue transition hover:opacity-80 dark:text-brand-green"
                          >
                            {row.value}
                          </a>
                        ) : (
                          row.value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* 카드 위 모서리를 잡은 양손 (z-20, 카드 앞). 경찰·도둑 손 위치가 달라 테마별로 분리. */}
              <div className="pointer-events-none absolute left-[20%] top-0 z-20 -translate-y-1/2 dark:hidden">
                <img
                  src="/characters/police-win-arm-left.svg"
                  alt=""
                  style={pop}
                  className="h-auto w-9"
                />
              </div>
              <div className="pointer-events-none absolute right-[20%] top-0 z-20 -translate-y-1/2 dark:hidden">
                <img
                  src="/characters/police-win-arm-right.svg"
                  alt=""
                  style={pop}
                  className="h-auto w-9"
                />
              </div>
              <div className="pointer-events-none absolute left-[31%] top-0 z-20 hidden -translate-y-1/2 dark:block">
                <img
                  src="/characters/robber-win-arm-left.svg"
                  alt=""
                  style={pop}
                  className="h-auto w-5"
                />
              </div>
              <div className="pointer-events-none absolute right-[31%] top-0 z-20 hidden -translate-y-1/2 dark:block">
                <img
                  src="/characters/robber-win-arm-right.svg"
                  alt=""
                  style={pop}
                  className="h-auto w-5"
                />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </Container>
    </section>
  );
}
