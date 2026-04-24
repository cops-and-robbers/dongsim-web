import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";

export default function MissionVisionSection() {
  const principles = [
    {
      before: "시장 조사부터 시작하지 않아요",
      after: "우리부터 해보고 재미있어야 만들어요",
    },
    {
      before: "회의실에서 아이디어를 찾지 않아요",
      after: "놀다가 불편했던 순간에서 시작해요",
    },
  ];

  return (
    <section className="bg-slate-50 py-24 transition-colors duration-500 sm:py-32 dark:bg-app-black-900">
      <Container>
        <ScrollReveal animation="fadeInUp">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            만드는 방식
          </p>
          <h2 className="mt-3 max-w-2xl text-balance text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl dark:text-white">
            우리는 이렇게 달라요
          </h2>
        </ScrollReveal>

        <dl className="mt-14 space-y-10 md:space-y-14">
          {principles.map((p, i) => (
            <ScrollReveal key={p.after} animation="fadeInUp" delayMs={i * 150}>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.4fr)] md:items-center md:gap-10">
                <dt className="text-base text-slate-400 line-through decoration-slate-300 decoration-1 md:text-lg dark:text-slate-500 dark:decoration-white/20">
                  {p.before}
                </dt>
                <div
                  aria-hidden="true"
                  className="flex text-slate-300 md:justify-start dark:text-white/20"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5 rotate-90 md:rotate-0"
                  >
                    <path
                      d="M5 12h14m-6-6 6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <dd className="text-xl font-bold leading-snug text-slate-900 md:text-2xl lg:text-[1.65rem] dark:text-white">
                  {p.after}
                </dd>
              </div>
            </ScrollReveal>
          ))}
        </dl>
      </Container>
    </section>
  );
}
