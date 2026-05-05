import Container from "@/components/ui/Container";
import DownloadButtons from "@/components/ui/DownloadButtons";
import ScrollReveal from "@/components/ui/ScrollReveal";
import CopIcon from "@/components/characters/CopIcon";
import RobberIcon from "@/components/characters/RobberIcon";
import { SHOEPRINT_PATH } from "@/components/icons/Footprint";
import LiveCountdown from "./LiveCountdown";

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
          <g
            className="hero-anim-step"
            transform="translate(200 115) rotate(128)"
            style={{ animationDelay: "450ms" }}
          >
            <use href="#hero-sp" width="22" height="22" opacity="0.2" />
          </g>
          <g
            className="hero-anim-step"
            transform="translate(228 160) rotate(125)"
            style={{ animationDelay: "550ms" }}
          >
            <use href="#hero-sp" width="24" height="24" opacity="0.35" />
          </g>
          <g
            className="hero-anim-step"
            transform="translate(252 205) rotate(120)"
            style={{ animationDelay: "650ms" }}
          >
            <use href="#hero-sp" width="26" height="26" opacity="0.5" />
          </g>
          <g
            className="hero-anim-step"
            transform="translate(282 250) rotate(115)"
            style={{ animationDelay: "750ms" }}
          >
            <use href="#hero-sp" width="28" height="28" opacity="0.65" />
          </g>
          <g
            className="hero-anim-step"
            transform="translate(314 292) rotate(112)"
            style={{ animationDelay: "850ms" }}
          >
            <use href="#hero-sp" width="30" height="30" opacity="0.82" />
          </g>
          <g
            className="hero-anim-step"
            transform="translate(346 330) rotate(108)"
            style={{ animationDelay: "950ms" }}
          >
            <use href="#hero-sp" width="32" height="32" opacity="0.95" />
          </g>
        </g>
      </svg>

      <div className="absolute inset-x-6 bottom-6 flex items-end justify-between">
        <div
          className="hero-anim-char w-[42%]"
          style={{ animationDelay: "1050ms" }}
        >
          <CopIcon className="h-auto w-full" />
        </div>
        <div
          className="hero-anim-char w-[44%]"
          style={{ animationDelay: "1150ms" }}
        >
          <RobberIcon className="h-auto w-full" />
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

              <div className="mt-10">
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
