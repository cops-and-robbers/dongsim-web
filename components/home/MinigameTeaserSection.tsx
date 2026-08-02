import Image from "next/image";
import Link from "next/link";
import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import type { Messages } from "@/lib/i18n/messages";
import { localizedPath, type Locale } from "@/lib/i18n/config";

export default function MinigameTeaserSection({
  copy,
  locale,
}: {
  copy: Messages["home"]["minigame"];
  locale: Locale;
}) {
  return (
    <section className="bg-white py-24 transition-colors duration-500 sm:py-32 dark:bg-app-black">
      <Container>
        <ScrollReveal animation="fadeInUp">
          <div className="group flex flex-col-reverse items-center gap-8 rounded-3xl bg-slate-50 px-8 py-10 ring-1 ring-slate-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:flex-row sm:gap-14 sm:px-12 sm:py-12 dark:bg-app-black-900 dark:ring-white/10 dark:hover:shadow-2xl dark:hover:ring-white/20">
            <div className="flex flex-1 flex-col items-center text-center sm:items-start sm:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-bold text-brand-blue dark:bg-brand-green/15 dark:text-brand-green">
                {copy.badge}
              </span>
              <h2 className="mt-3 text-balance text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                {copy.title}
              </h2>
              <p className="mt-3 text-pretty text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
                {copy.description}
              </p>
              <Link
                href={localizedPath("/play", locale)}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-brand-blue px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-blue/30 transition-transform hover:-translate-y-0.5 active:translate-y-0 sm:w-auto dark:bg-brand-green dark:text-app-black dark:shadow-none"
              >
                {copy.button}
              </Link>
            </div>

            {/* 현상수배지 */}
            <div className="shrink-0 -rotate-2 transition-transform duration-300 ease-out group-hover:rotate-0">
              <div className="flex w-44 flex-col items-center gap-3 rounded-3xl bg-white px-6 py-6 shadow-lg ring-1 ring-slate-200 dark:bg-app-black dark:ring-white/10">
                <span className="rounded-full bg-brand-red px-3 py-1 text-[11px] font-extrabold tracking-[0.2em] text-white">
                  WANTED
                </span>
                <div className="relative h-28 w-28 overflow-hidden rounded-lg bg-brand-blue-bg ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/15">
                  <Image
                    src="/characters/robber.svg"
                    alt=""
                    width={160}
                    height={145}
                    unoptimized
                    aria-hidden="true"
                    className="absolute left-1/2 top-[4%] w-[135%] max-w-none -translate-x-1/2"
                  />
                </div>
                <div className="text-center">
                  <p className="text-base font-extrabold text-slate-900 dark:text-white">
                    {copy.wantedName}
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-brand-red">
                    {copy.bounty}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  );
}
