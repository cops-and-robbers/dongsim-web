import Link from "next/link";
import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import Chevron from "@/components/icons/Chevron";
import { GAME_FAQ } from "@/lib/constants";

export default function GameFaqSection() {
  return (
    <section className="bg-slate-50 py-24 transition-colors duration-500 sm:py-32 dark:bg-app-black-900">
      <Container>
        <ScrollReveal animation="fadeInUp">
          <div className="max-w-2xl">
            <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl dark:text-white">
              자주 묻는 질문
            </h2>
          </div>
        </ScrollReveal>

        <ScrollReveal animation="fadeInUp" delayMs={80}>
          <ul className="mt-12 border-t border-slate-200 dark:border-white/10">
            {GAME_FAQ.map((item) => (
              <li
                key={item.question}
                className="border-b border-slate-200 dark:border-white/10"
              >
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left [&::-webkit-details-marker]:hidden">
                    <span className="text-base font-semibold text-slate-900 sm:text-lg dark:text-white">
                      {item.question}
                    </span>
                    <Chevron className="size-5 text-slate-400 transition-transform duration-300 group-open:rotate-180 dark:text-slate-500" />
                  </summary>
                  <div className="pb-6 pr-8 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
                    <p>{item.answer}</p>
                    {item.link && (
                      <Link
                        href={item.link.href}
                        className="mt-3 inline-block font-medium text-brand-blue underline-offset-4 hover:underline dark:text-brand-green"
                      >
                        {item.link.label}
                      </Link>
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </ScrollReveal>
      </Container>
    </section>
  );
}
