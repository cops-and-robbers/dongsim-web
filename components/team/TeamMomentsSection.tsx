import Image from "next/image";
import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import type { Messages } from "@/lib/i18n/messages";

// 현장 사진 밴드 - 실제 QA 진행 모습. 사진은 언어 무관, 캡션만 로케일 사전에서 받는다.
const PHOTOS = ["/team/qa-1.jpg", "/team/qa-2.jpg"];

export default function TeamMomentsSection({
  copy,
}: {
  copy: Messages["team"]["moments"];
}) {
  return (
    <section className="bg-white py-24 transition-colors duration-500 sm:py-32 dark:bg-app-black">
      <Container>
        <ScrollReveal animation="fadeInUp">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {copy.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            {copy.heading}
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
            {copy.sub}
          </p>
        </ScrollReveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {copy.captions.map((caption, i) => (
            <ScrollReveal key={i} animation="fadeInUp" delayMs={i * 100}>
              <figure>
                <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-app-black-900">
                  <Image
                    src={PHOTOS[i]}
                    alt={caption.label}
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {caption.label}
                  </span>{" "}
                  · {caption.date}
                </figcaption>
              </figure>
            </ScrollReveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
