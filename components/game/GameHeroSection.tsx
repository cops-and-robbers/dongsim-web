import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";

export default function GameHeroSection() {
  return (
    <section className="border-b border-slate-200 bg-white transition-colors duration-500 dark:border-white/10 dark:bg-app-black">
      <Container className="py-24 sm:py-32">
        <ScrollReveal animation="fadeInUp">
          <div className="max-w-3xl">
            <h1 className="text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl dark:text-white">
              경찰과 도둑,
              <br />
              이렇게 플레이해요
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 sm:mt-8 sm:text-lg md:text-xl dark:text-slate-300">
              구역 그리고, 발자국 쫓고, QR로 잡고, 팀끼리 대화까지. 앱 하나에 다
              들어 있어요.
            </p>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  );
}
