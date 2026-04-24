import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import {
  PhoneFrame,
  ZoneMockup,
  LocationMockup,
  QrMockup,
  ChatMockup,
} from "./PhoneMockup";
import type { GameFeature } from "@/lib/constants";

const MOCKUPS = {
  zone: <ZoneMockup />,
  location: <LocationMockup />,
  qr: <QrMockup />,
  chat: <ChatMockup />,
};

type Props = {
  feature: GameFeature;
  index: number;
  total: number;
};

export default function FeatureBlock({ feature, index, total }: Props) {
  const isReversed = index % 2 === 1;
  const pad = (n: number) => String(n).padStart(2, "0");

  const textCol = isReversed ? "md:col-start-2" : "md:col-start-1";
  const mockupCol = isReversed ? "md:col-start-1" : "md:col-start-2";
  const textAnim = isReversed ? "fadeInRight" : "fadeInLeft";
  const mockupAnim = isReversed ? "fadeInLeft" : "fadeInRight";

  return (
    <section className="py-16 sm:py-24 md:py-28">
      <Container>
        <div className="grid gap-8 md:grid-cols-2 md:items-center md:gap-14">
          <ScrollReveal
            animation={textAnim}
            className={`order-1 ${textCol} md:row-start-1`}
          >
            <div className="flex flex-col gap-4">
              <p className="font-mono text-xs text-slate-400 tabular-nums dark:text-slate-500">
                {pad(index + 1)}  /  {pad(total)}
              </p>
              <h3 className="text-balance text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl dark:text-white">
                {feature.title}
              </h3>
            </div>
          </ScrollReveal>

          <ScrollReveal
            animation={mockupAnim}
            delayMs={100}
            className={`order-2 ${mockupCol} md:row-span-2 md:row-start-1`}
          >
            <div className="flex justify-center">
              <PhoneFrame>{MOCKUPS[feature.mockup]}</PhoneFrame>
            </div>
          </ScrollReveal>

          <ScrollReveal
            animation={textAnim}
            delayMs={50}
            className={`order-3 ${textCol} md:row-start-2`}
          >
            <div className="flex flex-col gap-6">
              <p className="text-pretty text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
                {feature.description}
              </p>

              <ul className="space-y-3 border-t border-slate-100 pt-6 dark:border-white/10">
                {feature.checks.map((check) => (
                  <li
                    key={check}
                    className="flex gap-3 text-sm text-slate-700 dark:text-slate-300"
                  >
                    <span
                      aria-hidden="true"
                      className="text-slate-400 dark:text-slate-500"
                    >
                      —
                    </span>
                    <span>{check}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </Container>
    </section>
  );
}
