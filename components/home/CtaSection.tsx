import Container from "@/components/ui/Container";
import DownloadButtons from "@/components/ui/DownloadButtons";
import ScrollReveal from "@/components/ui/ScrollReveal";

export default function CtaSection() {
  return (
    <section className="bg-white py-24 transition-colors duration-500 sm:py-32 dark:bg-app-black">
      <Container>
        <ScrollReveal animation="fadeInUp">
          <div className="relative overflow-hidden rounded-4xl bg-brand-blue px-8 py-20 shadow-xl shadow-brand-blue/30 sm:px-16 sm:py-24 dark:bg-app-black-900 dark:shadow-none dark:ring-1 dark:ring-white/10">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(159,177,236,0.35),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(56,245,91,0.06),transparent_65%)]"
              aria-hidden="true"
            />

            <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
              <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
                이제 공원에서 만나요
              </h2>
              <p className="max-w-lg text-pretty text-base leading-relaxed text-white/85 sm:text-lg dark:text-slate-300">
                친구에게 초대 코드나 QR만 보내면 준비 끝이에요.
                <br />
                가까운 공원으로 나가볼까요?
              </p>
              <div className="mt-4 flex justify-center">
                <DownloadButtons variant="onDark" />
              </div>
            </div>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  );
}
