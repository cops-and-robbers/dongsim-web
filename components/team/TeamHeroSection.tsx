import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";

export default function TeamHeroSection() {
  return (
    <section className="border-b border-slate-200 bg-white transition-colors duration-500 dark:border-white/10 dark:bg-app-black">
      <Container className="py-24 sm:py-32">
        <ScrollReveal animation="fadeInUp">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-blue dark:text-brand-green">
              동심지킴이
            </p>
            <h1 className="mt-4 text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl dark:text-white">
              추억의 게임에서
              <br />
              가치를 발견합니다
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 sm:mt-8 sm:text-lg md:text-xl dark:text-slate-300">
              친구들과 뛰놀던 그 추억을 계속 이어갑니다. 더 재미있고, 더 편한
              방법으로.
            </p>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  );
}
