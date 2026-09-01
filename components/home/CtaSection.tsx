import Link from "next/link";
import Container from "@/components/ui/Container";
import DownloadButtons from "@/components/ui/DownloadButtons";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";

// 마지막 CTA - 다운로드가 주인공이고, 아직 망설이는 방문자를 위해
// 데모로 가는 링크를 한 줄 아래에 둔다 (#77).
// [demoLink] 는 /demo 자신처럼 데모가 바로 위에 있는 페이지에서 끈다.
export default function CtaSection({
  copy,
  locale,
  demoLink = true,
}: {
  copy: Messages["home"]["finalCta"];
  locale: Locale;
  demoLink?: boolean;
}) {
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
                {copy.title}
              </h2>
              <p className="max-w-lg text-pretty text-base leading-relaxed text-white/85 sm:text-lg dark:text-slate-300">
                {copy.lead1}
                <br />
                {copy.lead2}
              </p>
              <div className="mt-4 flex flex-col items-center gap-5">
                <DownloadButtons variant="onDark" placement="home_cta" />
                {demoLink && (
                  <Link
                    href={localizedPath("/demo", locale)}
                    className="group inline-flex items-center gap-1.5 text-sm font-semibold text-white/75 transition-colors hover:text-white dark:text-slate-400 dark:hover:text-brand-green"
                  >
                    {copy.demoCta}
                    <svg
                      viewBox="0 0 16 16"
                      className="size-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 8h9M8.5 4.5 12 8l-3.5 3.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  );
}
