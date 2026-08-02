import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { SHOEPRINT_PATH } from "@/components/icons/Footprint";
import type { Messages } from "@/lib/i18n/messages";

function ZoneVisual() {
  return (
    <svg
      viewBox="0 0 200 140"
      className="h-full w-full"
      aria-hidden="true"
    >
      <g
        strokeWidth="1"
        fill="none"
        className="stroke-slate-200 dark:stroke-white/10"
      >
        <path d="M 0 45 L 200 35" />
        <path d="M 0 105 L 200 95" />
        <path d="M 60 0 L 70 140" />
        <path d="M 140 0 L 130 140" />
      </g>
      <circle
        cx="100"
        cy="70"
        r="55"
        fill="#3F63D9"
        fillOpacity="0.05"
        stroke="#3F63D9"
        strokeWidth="1.8"
        strokeDasharray="6 6"
      />
      <circle cx="100" cy="70" r="3" fill="#3F63D9" />
      <g
        transform="translate(140 48)"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        className="transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-110"
      >
        <rect
          x="-12"
          y="-10"
          width="24"
          height="20"
          rx="3"
          className="fill-slate-900 dark:fill-white"
        />
        <text
          x="0"
          y="3"
          textAnchor="middle"
          fontSize="7"
          fontWeight="700"
          className="fill-[#F5EF38] dark:fill-app-black"
        >
          JAIL
        </text>
      </g>
    </svg>
  );
}

function ShoeprintVisual() {
  return (
    <svg
      viewBox="0 0 200 140"
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <symbol id="fs-shoeprint" viewBox="0 0 28 28">
          <path d={SHOEPRINT_PATH} fill="currentColor" />
        </symbol>
      </defs>
      <g className="text-slate-800 dark:text-brand-green">
        <use
          href="#fs-shoeprint"
          width="20"
          height="20"
          transform="translate(40 90) rotate(-20)"
          opacity="0.3"
        />
        <use
          href="#fs-shoeprint"
          width="20"
          height="20"
          transform="translate(72 78) rotate(-15)"
          opacity="0.5"
        />
        <use
          href="#fs-shoeprint"
          width="20"
          height="20"
          transform="translate(105 66) rotate(-10)"
          opacity="0.7"
        />
        <use
          href="#fs-shoeprint"
          width="20"
          height="20"
          transform="translate(138 54) rotate(-5)"
          opacity="0.9"
        />
      </g>
      <g transform="translate(175 50)">
        <circle
          r="10"
          fill="#3F63D9"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          className="opacity-0 group-hover:animate-ping group-hover:opacity-40"
        />
        <circle r="6" fill="#3F63D9" opacity="0.2" />
        <circle r="3" fill="#3F63D9" stroke="white" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

function ChatVisual() {
  return (
    <svg
      viewBox="0 0 200 140"
      className="h-full w-full"
      aria-hidden="true"
    >
      <g>
        <rect
          x="20"
          y="30"
          width="100"
          height="20"
          rx="10"
          className="fill-slate-100 dark:fill-white/10"
        />
        <rect
          x="28"
          y="37"
          width="60"
          height="6"
          rx="3"
          className="fill-slate-400 dark:fill-white/40"
        />
      </g>
      <g className="transition-transform duration-300 ease-out group-hover:-translate-y-1">
        <rect
          x="80"
          y="60"
          width="100"
          height="20"
          rx="10"
          className="fill-[#3F63D9] dark:fill-brand-green"
        />
        <rect
          x="88"
          y="67"
          width="70"
          height="6"
          rx="3"
          fill="white"
          opacity="0.85"
          className="dark:fill-app-black dark:opacity-70"
        />
      </g>
      <g>
        <rect
          x="20"
          y="90"
          width="80"
          height="20"
          rx="10"
          className="fill-slate-100 dark:fill-white/10"
        />
        <rect
          x="28"
          y="97"
          width="40"
          height="6"
          rx="3"
          className="fill-slate-400 dark:fill-white/40"
        />
      </g>
    </svg>
  );
}

// 비주얼은 언어 무관 - 사전의 items 순서(발자국·구역·채팅)와 맞춘다.
const VISUALS = [
  <ShoeprintVisual key="shoeprint" />,
  <ZoneVisual key="zone" />,
  <ChatVisual key="chat" />,
];

export default function FeaturesSection({
  copy,
}: {
  copy: Messages["home"]["features"];
}) {
  return (
    <section className="bg-slate-50 py-24 transition-colors duration-500 sm:py-32 dark:bg-app-black-900">
      <Container>
        <ScrollReveal animation="fadeInUp">
          <div className="max-w-2xl">
            <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl dark:text-white">
              {copy.title1}
              <br />
              {copy.title2}
            </h2>
            <p className="mt-5 text-pretty text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
              {copy.sub}
            </p>
          </div>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {copy.items.map((item, i) => (
            <ScrollReveal key={item.title} animation="fadeInUp" delayMs={i * 80}>
              <article className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-app-black dark:ring-white/10 dark:hover:shadow-2xl dark:hover:ring-white/20">
                <div className="aspect-7/5 w-full overflow-hidden bg-white dark:bg-app-black">
                  <div className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.03]">
                    {VISUALS[i]}
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-3 border-t border-slate-100 p-7 dark:border-white/10">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {item.description}
                  </p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
