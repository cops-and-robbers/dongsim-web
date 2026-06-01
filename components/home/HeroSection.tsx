import Image from "next/image";
import Container from "@/components/ui/Container";
import DownloadButtons from "@/components/ui/DownloadButtons";
import ScrollReveal from "@/components/ui/ScrollReveal";
import CopChaseIcon from "@/components/characters/CopChaseIcon";
import RobberFleeIcon from "@/components/characters/RobberFleeIcon";
import { SHOEPRINT_PATH } from "@/components/icons/Footprint";
import LiveCountdown from "./LiveCountdown";

// 생쥐 발자국 트레일 — 작은 발바닥이 좌·우 교차로 촘촘히 찍히며 도둑을 향해 이어진다.
const HERO_TRACKS = [
  { x: 189, y: 114, s: 11, r: 116, o: 0.18, d: 380 },
  { x: 219, y: 132, s: 12, r: 126, o: 0.27, d: 450 },
  { x: 226, y: 166, s: 13, r: 116, o: 0.36, d: 520 },
  { x: 256, y: 184, s: 14, r: 126, o: 0.45, d: 590 },
  { x: 262, y: 218, s: 15, r: 116, o: 0.54, d: 660 },
  { x: 292, y: 237, s: 16, r: 126, o: 0.63, d: 730 },
  { x: 299, y: 271, s: 17, r: 116, o: 0.72, d: 800 },
  { x: 329, y: 289, s: 18, r: 126, o: 0.81, d: 870 },
  { x: 336, y: 323, s: 19, r: 116, o: 0.9, d: 940 },
  { x: 366, y: 341, s: 20, r: 126, o: 0.97, d: 1010 },
];

function GameScene() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-120">
      <svg
        viewBox="0 0 480 480"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="hero-grid"
            width="32"
            height="32"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 32 0 L 0 0 0 32"
              fill="none"
              strokeWidth="1"
              className="stroke-slate-200 dark:stroke-white/10"
            />
          </pattern>
          <symbol id="hero-sp" viewBox="0 0 28 28">
            <path d={SHOEPRINT_PATH} fill="currentColor" />
          </symbol>
          <radialGradient id="grid-fade" cx="50%" cy="55%" r="55%">
            <stop
              offset="0%"
              className="[stop-color:white] dark:[stop-color:#080A0C]"
              stopOpacity="1"
            />
            <stop
              offset="65%"
              className="[stop-color:white] dark:[stop-color:#080A0C]"
              stopOpacity="0.85"
            />
            <stop
              offset="100%"
              className="[stop-color:white] dark:[stop-color:#080A0C]"
              stopOpacity="0"
            />
          </radialGradient>
          <mask id="grid-mask">
            <rect width="480" height="480" fill="url(#grid-fade)" />
          </mask>
        </defs>

        <rect
          width="480"
          height="480"
          fill="url(#hero-grid)"
          mask="url(#grid-mask)"
          className="hero-anim-grid"
        />

        <circle
          cx="240"
          cy="260"
          r="170"
          fill="#3F63D9"
          fillOpacity="0.05"
          stroke="#3F63D9"
          strokeWidth="2"
          strokeDasharray="8 8"
          className="hero-anim-zone dark:stroke-[#38F55B]"
        />

        <g className="text-slate-800 dark:text-brand-green">
          {HERO_TRACKS.map((p, i) => (
            <g
              key={i}
              className="hero-anim-step"
              transform={`translate(${p.x} ${p.y}) rotate(${p.r})`}
              style={{ animationDelay: `${p.d}ms` }}
            >
              <use href="#hero-sp" width={p.s} height={p.s} opacity={p.o} />
            </g>
          ))}
        </g>
      </svg>

      <div className="absolute inset-x-6 bottom-6 flex items-end justify-between">
        <div
          className="hero-anim-char w-[42%]"
          style={{ animationDelay: "1050ms" }}
        >
          <CopChaseIcon className="h-auto w-full" />
        </div>
        <div
          className="hero-anim-char w-[44%]"
          style={{ animationDelay: "1150ms" }}
        >
          <RobberFleeIcon className="h-auto w-full" />
        </div>
      </div>

      <LiveCountdown />
    </div>
  );
}

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white transition-colors duration-500 dark:bg-app-black">
      <Container className="pt-12 pb-16 md:pt-16 md:pb-20 lg:pt-20 lg:pb-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <ScrollReveal animation="fadeInUp">
            <div>
              <h1 className="text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl dark:text-white">
                경찰과 도둑이
                <br />
                돌아왔어요
              </h1>

              <div className="mt-8 lg:hidden">
                <GameScene />
              </div>

              <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-slate-600 sm:mt-8 sm:text-lg md:text-xl dark:text-slate-300">
                스마트폰 하나면 준비 끝이에요.
                <span className="hidden lg:inline">
                  {" "}
                  진행은 앱이 알아서 해요.
                </span>
              </p>

              <div className="mt-10 flex flex-col gap-5">
                <div className="inline-flex w-fit items-center gap-3.5 rounded-2xl bg-slate-50/80 p-2 pr-5 ring-1 ring-slate-200/70 backdrop-blur dark:bg-white/6 dark:ring-white/10">
                  <Image
                    src="/brand/app-icon.svg"
                    alt="경찰과 도둑 앱 아이콘"
                    width={52}
                    height={52}
                    unoptimized
                    className="h-13 w-13 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                  />
                  <div className="leading-tight">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      경찰과 도둑
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-[11px] font-bold text-brand-blue dark:bg-brand-green/15 dark:text-brand-green">
                        무료
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        iOS · Android
                      </span>
                    </div>
                  </div>
                </div>
                <DownloadButtons />
              </div>

              <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">
                최대 50명까지 함께 플레이
              </p>
            </div>
          </ScrollReveal>

          <div className="hidden lg:block">
            <GameScene />
          </div>
        </div>
      </Container>
    </section>
  );
}
