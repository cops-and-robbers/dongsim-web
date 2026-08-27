import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";

// 놀이 규칙 섹션 - "경찰과 도둑 하는 법"을 검색해 들어온 사람에게 먼저 답한다.
// 전통 놀이의 규칙을 단계로 설명하고, 각 단계에 앱이 하는 일을 한 줄로 잇는다.
export default function GameRulesSection({
  copy,
}: {
  copy: {
    heading: string;
    sub: string;
    appLabel: string;
    steps: readonly { title: string; play: string; app: string }[];
  };
}) {
  return (
    <section
      id="rules"
      className="bg-white py-24 transition-colors duration-500 sm:py-32 dark:bg-app-black"
    >
      <Container>
        <ScrollReveal animation="fadeInUp">
          <div className="max-w-2xl">
            <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl dark:text-white">
              {copy.heading}
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              {copy.sub}
            </p>
          </div>
        </ScrollReveal>

        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {copy.steps.map((step, i) => (
            <ScrollReveal key={step.title} animation="fadeInUp" delayMs={i * 60}>
              <li className="flex h-full flex-col rounded-2xl bg-slate-50 p-6 transition-colors duration-500 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-blue text-sm font-bold text-white dark:bg-brand-green dark:text-app-black">
                    {i + 1}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-300">
                  {step.play}
                </p>
                <p className="mt-3 border-l-2 border-brand-blue/30 pl-3 text-sm leading-relaxed text-slate-500 dark:border-brand-green/30 dark:text-slate-400">
                  <span className="font-semibold text-brand-blue dark:text-brand-green">
                    {copy.appLabel}
                  </span>{" "}
                  {step.app}
                </p>
              </li>
            </ScrollReveal>
          ))}
        </ol>
      </Container>
    </section>
  );
}
