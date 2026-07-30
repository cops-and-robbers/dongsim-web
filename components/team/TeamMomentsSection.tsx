import Image from "next/image";
import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";

// 현장 사진 밴드 - 실제 QA 진행 모습으로 "직접 만들고 검증한다"는 것을 보여준다.
const MOMENTS = [
  { src: "/team/qa-1.jpg", label: "1차 QA", date: "2026.03" },
  { src: "/team/qa-2.jpg", label: "2차 QA", date: "2026.04" },
];

export default function TeamMomentsSection() {
  return (
    <section className="bg-white py-24 transition-colors duration-500 sm:py-32 dark:bg-app-black">
      <Container>
        <ScrollReveal animation="fadeInUp">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            현장에서
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            직접 뛰며 만들고 검증합니다
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
            사용자와 함께 여러 차례 QA를 진행하며 경험을 다듬어 왔습니다.
          </p>
        </ScrollReveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {MOMENTS.map((m, i) => (
            <ScrollReveal key={m.src} animation="fadeInUp" delayMs={i * 100}>
              <figure>
                <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-app-black-900">
                  <Image
                    src={m.src}
                    alt={`${m.label} 진행 현장`}
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {m.label}
                  </span>{" "}
                  · {m.date}
                </figcaption>
              </figure>
            </ScrollReveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
