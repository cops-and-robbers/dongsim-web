import Container from "@/components/ui/Container";
import DownloadButtons from "@/components/ui/DownloadButtons";
import ScrollReveal from "@/components/ui/ScrollReveal";
import CopIcon from "@/components/characters/CopIcon";
import RobberIcon from "@/components/characters/RobberIcon";
import LiveCountdown from "./LiveCountdown";

const SHOEPRINT_PATH =
  "M8.23193 1.12012C8.84587 1.12012 9.42985 1.32601 9.98389 1.73779C10.5379 2.14209 11.0321 2.67367 11.4663 3.33252C11.908 3.98389 12.2524 4.69141 12.4995 5.45508C12.7541 6.21875 12.8813 6.95996 12.8813 7.67871C12.8813 8.13542 12.8252 8.71566 12.7129 9.41943C12.6081 10.1157 12.4434 10.8607 12.2188 11.6543C11.9941 12.4404 11.7022 13.1929 11.3428 13.9116H5.13232C4.77295 13.1929 4.48096 12.4404 4.25635 11.6543C4.03174 10.8607 3.86328 10.1157 3.75098 9.41943C3.64616 8.71566 3.59375 8.13542 3.59375 7.67871C3.59375 6.95996 3.71729 6.21875 3.96436 5.45508C4.21891 4.69141 4.56331 3.98389 4.99756 3.33252C5.4318 2.67367 5.92594 2.14209 6.47998 1.73779C7.0415 1.32601 7.62549 1.12012 8.23193 1.12012ZM8.24316 20.5151C7.36719 20.5151 6.6971 20.1221 6.23291 19.3359C5.7762 18.5498 5.54785 17.5391 5.54785 16.3037C5.54785 16.1839 5.5516 16.0454 5.55908 15.8882C5.57406 15.731 5.59277 15.585 5.61523 15.4502H10.8711C10.8936 15.585 10.9085 15.731 10.916 15.8882C10.931 16.0454 10.9385 16.1839 10.9385 16.3037C10.9385 17.1273 10.8337 17.8573 10.624 18.4937C10.4219 19.1226 10.1187 19.6167 9.71436 19.9761C9.31755 20.3355 8.82715 20.5151 8.24316 20.5151ZM21.877 8.49854C22.4535 8.70817 22.9326 9.10124 23.3145 9.67774C23.6963 10.2467 23.9771 10.9131 24.1567 11.6768C24.3439 12.4404 24.4263 13.2266 24.4038 14.0352C24.3814 14.8363 24.2466 15.57 23.9995 16.2363C23.8423 16.6781 23.5915 17.2096 23.2471 17.8311C22.9102 18.445 22.4984 19.0851 22.0117 19.7515C21.5326 20.4103 21.001 21.0205 20.417 21.582L14.5771 19.4595C14.4948 18.6584 14.4798 17.8498 14.5322 17.0337C14.5921 16.2101 14.6895 15.4502 14.8242 14.7539C14.9665 14.0576 15.1162 13.4961 15.2734 13.0693C15.5205 12.3955 15.8911 11.7441 16.3853 11.1152C16.8869 10.4788 17.4522 9.92855 18.0811 9.46436C18.7174 9.00016 19.3651 8.67074 20.0239 8.47608C20.6903 8.28141 21.3079 8.2889 21.877 8.49854ZM15.251 26.7256C14.4274 26.4186 13.9333 25.8159 13.7686 24.9175C13.6113 24.0265 13.7424 23.0008 14.1616 21.8403C14.1991 21.728 14.2515 21.6008 14.3188 21.4585C14.3862 21.3088 14.4536 21.174 14.521 21.0542L19.4624 22.8623C19.4325 22.9971 19.395 23.1393 19.3501 23.2891C19.3127 23.4463 19.2715 23.5811 19.2266 23.6934C18.8073 24.8464 18.2458 25.7148 17.542 26.2988C16.8382 26.8828 16.0745 27.0251 15.251 26.7256Z";

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
