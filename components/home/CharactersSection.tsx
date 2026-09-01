"use client";

import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import CopIcon from "@/components/characters/CopIcon";
import RobberIcon from "@/components/characters/RobberIcon";
import { useTheme, type Team } from "@/components/ThemeProvider";
import { SHOEPRINT_PATH } from "@/components/icons/Footprint";
import type { Messages } from "@/lib/i18n/messages";

const PATTERN_COLORS = {
  blueLight: "#3F63D9",
  green: "#38F55B",
} as const;

function RolePattern({ tone }: { tone: "blue" | "green" }) {
  const { team } = useTheme();
  const isDark = team === "robber";
  const color = isDark ? PATTERN_COLORS.green : PATTERN_COLORS.blueLight;
  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <symbol id={`cs-sp-${tone}`} viewBox="0 0 28 28">
          <path d={SHOEPRINT_PATH} fill={color} />
        </symbol>
        <symbol id="cs-cheese" viewBox="0 0 32 30">
          <path
            d="M5.5 9.2 Q4.2 6.2 7.4 6.4 L26.5 9.2 Q29.5 9.7 27.2 12.2 L13.2 26.4 Q10.8 28.6 9.6 25.2 Z"
            fill="#FFCE3A"
          />
          <path
            d="M5.5 9.2 Q4.2 6.2 7.4 6.4 L26.5 9.2 Q27.4 9.35 27.45 10.1 L6.6 10.6 Z"
            fill="#FFE27A"
          />
          <circle cx="13.5" cy="13.4" r="2.1" fill="#E89B00" />
          <circle cx="18.6" cy="17.2" r="1.5" fill="#E89B00" />
          <circle cx="11.5" cy="19" r="1.7" fill="#E89B00" />
        </symbol>
        <radialGradient id={`cs-fade-${tone}`} cx="50%" cy="60%" r="65%">
          <stop
            offset="0%"
            className="[stop-color:white] dark:[stop-color:#080A0C]"
            stopOpacity="0"
          />
          <stop
            offset="70%"
            className="[stop-color:white] dark:[stop-color:#080A0C]"
            stopOpacity="0"
          />
          <stop
            offset="100%"
            className="[stop-color:white] dark:[stop-color:#080A0C]"
            stopOpacity="0.9"
          />
        </radialGradient>
      </defs>
      {tone === "blue" ? (
        <g>
          <use
            href={`#cs-sp-${tone}`}
            width="30"
            height="30"
            transform="translate(40 230) rotate(-22)"
            className="opacity-20 dark:opacity-[0.22]"
          />
          <use
            href={`#cs-sp-${tone}`}
            width="28"
            height="28"
            transform="translate(82 250) rotate(-18)"
            className="opacity-[0.14] dark:opacity-[0.16]"
          />
          <use
            href={`#cs-sp-${tone}`}
            width="28"
            height="28"
            transform="translate(330 60) rotate(28)"
            className="opacity-20 dark:opacity-[0.22]"
          />
          <use
            href={`#cs-sp-${tone}`}
            width="26"
            height="26"
            transform="translate(362 88) rotate(32)"
            className="opacity-[0.14] dark:opacity-[0.16]"
          />
        </g>
      ) : (
        <g>
          <use
            href="#cs-cheese"
            width="40"
            height="38"
            transform="translate(52 86) rotate(-12)"
            className="opacity-50 dark:opacity-55"
          />
          <use
            href="#cs-cheese"
            width="32"
            height="30"
            transform="translate(300 76) rotate(17)"
            className="opacity-45 dark:opacity-50"
          />
          <use
            href="#cs-cheese"
            width="26"
            height="24"
            transform="translate(74 182) rotate(9)"
            className="opacity-35 dark:opacity-40"
          />
        </g>
      )}
      <rect width="400" height="300" fill={`url(#cs-fade-${tone})`} />
    </svg>
  );
}

type RoleCardProps = {
  name: string;
  tone: "blue" | "green";
  targetTeam: Team;
  summary: string;
  selectedLabel: string;
  pickLabel: string;
  ariaLabel: string;
  children: React.ReactNode;
};

function RoleCard({
  name,
  tone,
  targetTeam,
  summary,
  selectedLabel,
  pickLabel,
  ariaLabel,
  children,
}: RoleCardProps) {
  const { team, setTeam } = useTheme();
  const isSelected = team === targetTeam;
  const isPolice = tone === "blue";

  const accentText = isPolice
    ? "text-brand-blue"
    : "text-emerald-700 dark:text-brand-green";
  // 팀 색으로 채워진 무대 - 위가 또렷하고 아래로 갈수록 카드 배경에 섞인다
  const bgTint = isPolice
    ? "from-brand-blue-lighter/45 via-brand-blue-bg to-white dark:from-app-black-900 dark:via-app-black dark:to-app-black"
    : "from-emerald-100/70 via-emerald-50 to-white dark:from-app-black-900 dark:via-app-black dark:to-app-black";
  // 선택된 카드만 팀 색이 옅게 도는 얇은 테두리
  const selectedRing = isPolice
    ? "ring-1 ring-brand-blue/50 dark:ring-brand-blue/45"
    : "ring-1 ring-emerald-500/50 dark:ring-brand-green/40";
  const idleRing = "ring-1 ring-slate-200 dark:ring-white/10";

  return (
    <button
      type="button"
      onClick={() => setTeam(targetTeam)}
      aria-pressed={isSelected}
      aria-label={ariaLabel}
      className={`group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-3xl bg-white text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-app-black dark:hover:shadow-2xl ${
        isSelected ? selectedRing : idleRing
      }`}
    >
      <div
        className={`relative flex aspect-4/3 items-end justify-center overflow-hidden bg-linear-to-b ${bgTint}`}
      >
        <RolePattern tone={tone} />
        <div
          className={`relative z-10 h-[60%] pb-2 transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.03] ${
            !isPolice ? "dark:drop-shadow-[0_0_24px_rgba(56,245,91,0.25)]" : ""
          }`}
        >
          {children}
        </div>

        <span
          className={`absolute right-3 top-3 z-20 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase transition-opacity ${
            isSelected
              ? "bg-slate-900 text-white opacity-100 dark:bg-white dark:text-app-black"
              : "bg-white/80 text-slate-600 opacity-0 group-hover:opacity-100 dark:bg-white/10 dark:text-slate-300"
          }`}
        >
          {isSelected ? selectedLabel : pickLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6 md:p-8">
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            {name}
          </h3>
          <span
            className={`text-xs font-semibold uppercase tracking-[0.14em] ${accentText}`}
          >
            {isPolice ? "POLICE" : "ROBBER"}
          </span>
        </div>
        <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {summary}
        </p>
      </div>
    </button>
  );
}

export default function CharactersSection({
  copy,
}: {
  copy: Messages["home"]["characters"];
}) {
  return (
    <section className="bg-slate-50 py-24 transition-colors duration-500 sm:py-32 dark:bg-app-black-900">
      <Container>
        <ScrollReveal animation="fadeInUp">
          <div className="max-w-2xl">
            <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl dark:text-white">
              {copy.title}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
              {copy.sub}
            </p>
          </div>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <ScrollReveal animation="fadeInLeft">
            <RoleCard
              name={copy.cop.name}
              tone="blue"
              targetTeam="police"
              summary={copy.cop.summary}
              selectedLabel={copy.selected}
              pickLabel={copy.pick}
              ariaLabel={copy.pickAria.replace("{name}", copy.cop.name)}
            >
              <CopIcon className="h-full w-auto" />
            </RoleCard>
          </ScrollReveal>

          <ScrollReveal animation="fadeInRight" delayMs={100}>
            <RoleCard
              name={copy.robber.name}
              tone="green"
              targetTeam="robber"
              summary={copy.robber.summary}
              selectedLabel={copy.selected}
              pickLabel={copy.pick}
              ariaLabel={copy.pickAria.replace("{name}", copy.robber.name)}
            >
              <RobberIcon className="h-full w-auto" />
            </RoleCard>
          </ScrollReveal>
        </div>
      </Container>
    </section>
  );
}
