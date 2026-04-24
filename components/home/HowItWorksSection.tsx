"use client";

import { useEffect, useRef, useState } from "react";
import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { HOW_STEPS } from "@/lib/constants";

export default function HowItWorksSection() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let rafId: number | null = null;

    const compute = () => {
      rafId = null;
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 섹션이 하단 70%에 닿으면 진행 시작, 상단 30%에 닿으면 완료
      const startLine = vh * 0.7;
      const endLine = vh * 0.3;
      const totalDistance = rect.height + (startLine - endLine);
      const traveled = startLine - rect.top;
      const p = Math.max(0, Math.min(1, traveled / totalDistance));
      setProgress(p);
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section className="bg-white py-24 transition-colors duration-500 sm:py-32 dark:bg-app-black">
      <Container>
        <ScrollReveal animation="fadeInUp">
          <div className="max-w-2xl">
            <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl dark:text-white">
              앱을 열고,
              <br />
              공원으로 나가면 끝
            </h2>
            <p className="mt-5 text-pretty text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
              친구한테 코드 보내고, 지도에 구역만 그리면 바로 시작이에요.
            </p>
          </div>
        </ScrollReveal>

        <div ref={trackRef} className="relative mt-16">
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-5 hidden h-px bg-linear-to-r from-transparent via-slate-200 to-transparent md:block dark:via-white/10"
          />
          <div
            aria-hidden="true"
            className="absolute left-0 top-5 hidden h-px bg-brand-blue md:block dark:bg-brand-green"
            style={{ width: `${progress * 100}%` }}
          />

          <ol className="relative grid gap-10 md:grid-cols-4 md:gap-6">
            {HOW_STEPS.map((step, i) => {
              const threshold = (i + 0.5) / HOW_STEPS.length;
              const isActive = progress >= threshold;
              return (
                <li key={step.title}>
                  <div className="flex flex-col">
                    <div className="relative mb-6 flex h-10 items-center">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shadow-sm ring-1 transition-colors duration-500 ${
                          isActive
                            ? "bg-brand-blue text-white ring-brand-blue dark:bg-brand-green dark:text-app-black dark:ring-brand-green"
                            : "bg-white text-slate-900 ring-slate-200 dark:bg-app-black-900 dark:text-white dark:ring-white/10"
                        }`}
                      >
                        {i + 1}
                      </span>
                    </div>
                    <h3
                      className={`text-lg font-bold transition-colors duration-500 ${
                        isActive
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {step.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </Container>
    </section>
  );
}
