import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import type { Messages } from "@/lib/i18n/messages";

export default function GameHeroSection({
  copy,
}: {
  copy: Messages["game"]["hero"];
}) {
  return (
    <section className="border-b border-slate-200 bg-white transition-colors duration-500 dark:border-white/10 dark:bg-app-black">
      <Container className="py-24 sm:py-32">
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
      </Container>
    </section>
  );
}
