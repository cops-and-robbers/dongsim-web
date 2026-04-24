"use client";

import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import CopIntroIcon from "@/components/characters/CopIntroIcon";
import RobberIntroIcon from "@/components/characters/RobberIntroIcon";
import { useTheme, type Team } from "@/components/ThemeProvider";

const PATTERN_COLORS = {
  blueLight: "#3F63D9",
  green: "#38F55B",
} as const;

const SHOEPRINT_PATH =
  "M8.23193 1.12012C8.84587 1.12012 9.42985 1.32601 9.98389 1.73779C10.5379 2.14209 11.0321 2.67367 11.4663 3.33252C11.908 3.98389 12.2524 4.69141 12.4995 5.45508C12.7541 6.21875 12.8813 6.95996 12.8813 7.67871C12.8813 8.13542 12.8252 8.71566 12.7129 9.41943C12.6081 10.1157 12.4434 10.8607 12.2188 11.6543C11.9941 12.4404 11.7022 13.1929 11.3428 13.9116H5.13232C4.77295 13.1929 4.48096 12.4404 4.25635 11.6543C4.03174 10.8607 3.86328 10.1157 3.75098 9.41943C3.64616 8.71566 3.59375 8.13542 3.59375 7.67871C3.59375 6.95996 3.71729 6.21875 3.96436 5.45508C4.21891 4.69141 4.56331 3.98389 4.99756 3.33252C5.4318 2.67367 5.92594 2.14209 6.47998 1.73779C7.0415 1.32601 7.62549 1.12012 8.23193 1.12012ZM8.24316 20.5151C7.36719 20.5151 6.6971 20.1221 6.23291 19.3359C5.7762 18.5498 5.54785 17.5391 5.54785 16.3037C5.54785 16.1839 5.5516 16.0454 5.55908 15.8882C5.57406 15.731 5.59277 15.585 5.61523 15.4502H10.8711C10.8936 15.585 10.9085 15.731 10.916 15.8882C10.931 16.0454 10.9385 16.1839 10.9385 16.3037C10.9385 17.1273 10.8337 17.8573 10.624 18.4937C10.4219 19.1226 10.1187 19.6167 9.71436 19.9761C9.31755 20.3355 8.82715 20.5151 8.24316 20.5151ZM21.877 8.49854C22.4535 8.70817 22.9326 9.10124 23.3145 9.67774C23.6963 10.2467 23.9771 10.9131 24.1567 11.6768C24.3439 12.4404 24.4263 13.2266 24.4038 14.0352C24.3814 14.8363 24.2466 15.57 23.9995 16.2363C23.8423 16.6781 23.5915 17.2096 23.2471 17.8311C22.9102 18.445 22.4984 19.0851 22.0117 19.7515C21.5326 20.4103 21.001 21.0205 20.417 21.582L14.5771 19.4595C14.4948 18.6584 14.4798 17.8498 14.5322 17.0337C14.5921 16.2101 14.6895 15.4502 14.8242 14.7539C14.9665 14.0576 15.1162 13.4961 15.2734 13.0693C15.5205 12.3955 15.8911 11.7441 16.3853 11.1152C16.8869 10.4788 17.4522 9.92855 18.0811 9.46436C18.7174 9.00016 19.3651 8.67074 20.0239 8.47608C20.6903 8.28141 21.3079 8.2889 21.877 8.49854ZM15.251 26.7256C14.4274 26.4186 13.9333 25.8159 13.7686 24.9175C13.6113 24.0265 13.7424 23.0008 14.1616 21.8403C14.1991 21.728 14.2515 21.6008 14.3188 21.4585C14.3862 21.3088 14.4536 21.174 14.521 21.0542L19.4624 22.8623C19.4325 22.9971 19.395 23.1393 19.3501 23.2891C19.3127 23.4463 19.2715 23.5811 19.2266 23.6934C18.8073 24.8464 18.2458 25.7148 17.542 26.2988C16.8382 26.8828 16.0745 27.0251 15.251 26.7256Z";

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
        <pattern
          id={`cs-grid-${tone}`}
          width="28"
          height="28"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 28 0 L 0 0 0 28"
            fill="none"
            stroke={color}
            strokeWidth="0.5"
            className="opacity-25 dark:opacity-15"
          />
        </pattern>
        <symbol id={`cs-sp-${tone}`} viewBox="0 0 28 28">
          <path d={SHOEPRINT_PATH} fill={color} />
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
      <rect width="400" height="300" fill={`url(#cs-grid-${tone})`} />
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
        <g stroke={color} fill="none">
          <circle
            cx="200"
            cy="185"
            r="140"
            strokeDasharray="3 7"
            strokeWidth="1.2"
            className="opacity-45 dark:opacity-55"
          />
          <circle
            cx="200"
            cy="185"
            r="95"
            strokeDasharray="3 7"
            strokeWidth="1.2"
            className="opacity-30 dark:opacity-35"
          />
          <circle
            cx="200"
            cy="185"
            r="55"
            strokeDasharray="3 7"
            strokeWidth="1.2"
            className="opacity-20 dark:opacity-20"
          />
          <circle
            cx="200"
            cy="185"
            r="2.5"
            fill={color}
            className="opacity-70 dark:opacity-90"
          />
        </g>
      )}
      <rect width="400" height="300" fill={`url(#cs-fade-${tone})`} />
    </svg>
  );
}

type RoleCardProps = {
  name: "경찰" | "도둑";
  tone: "blue" | "green";
  targetTeam: Team;
  summary: string;
  children: React.ReactNode;
};

function RoleCard({
  name,
  tone,
  targetTeam,
  summary,
  children,
}: RoleCardProps) {
  const { team, setTeam } = useTheme();
  const isSelected = team === targetTeam;
  const isPolice = tone === "blue";

  const accentText = isPolice
    ? "text-brand-blue"
    : "text-emerald-700 dark:text-brand-green";
  const accentBar = isPolice ? "bg-brand-blue" : "bg-brand-green";
  const bgTint = isPolice
    ? "from-brand-blue-bg via-white to-white dark:from-app-black-900 dark:via-app-black dark:to-app-black"
    : "from-emerald-50 via-white to-white dark:from-app-black-900 dark:via-app-black dark:to-app-black";
  const selectedRing = isPolice
    ? "ring-2 ring-brand-blue dark:ring-brand-blue"
    : "ring-2 ring-emerald-500 dark:ring-brand-green";
  const idleRing = "ring-1 ring-slate-200 dark:ring-white/10";

  return (
    <button
      type="button"
      onClick={() => setTeam(targetTeam)}
      aria-pressed={isSelected}
      aria-label={`${name} 팀 선택`}
      className={`group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-3xl bg-white text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-app-black dark:hover:shadow-2xl ${
        isSelected ? selectedRing : idleRing
      }`}
    >
      <div className={`h-1 w-full ${accentBar}`} aria-hidden="true" />

      <div
        className={`relative flex aspect-4/3 items-end justify-center overflow-hidden bg-linear-to-b ${bgTint}`}
      >
        <RolePattern tone={tone} />
        <div
          className={`relative z-10 h-[82%] pb-2 transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.03] ${
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
          {isSelected ? "선택됨" : "팀 선택"}
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

export default function CharactersSection() {
  return (
    <section className="bg-slate-50 py-24 transition-colors duration-500 sm:py-32 dark:bg-app-black-900">
      <Container>
        <ScrollReveal animation="fadeInUp">
          <div className="max-w-2xl">
            <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl dark:text-white">
              두 팀 서로 다른 전략
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
              카드를 눌러 팀을 선택해 보세요.
            </p>
          </div>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <ScrollReveal animation="fadeInLeft">
            <RoleCard
              name="경찰"
              tone="blue"
              targetTeam="police"
              summary="공개되는 발자국을 쫓아 도둑을 모두 잡으세요."
            >
              <CopIntroIcon className="h-full w-auto" />
            </RoleCard>
          </ScrollReveal>

          <ScrollReveal animation="fadeInRight" delayMs={100}>
            <RoleCard
              name="도둑"
              tone="green"
              targetTeam="robber"
              summary="잡히지 말고 제한 시간까지 살아남으세요."
            >
              <RobberIntroIcon className="h-full w-auto" />
            </RoleCard>
          </ScrollReveal>
        </div>
      </Container>
    </section>
  );
}
