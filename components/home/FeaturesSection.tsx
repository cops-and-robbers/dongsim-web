import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";

const SHOEPRINT_PATH =
  "M8.23193 1.12012C8.84587 1.12012 9.42985 1.32601 9.98389 1.73779C10.5379 2.14209 11.0321 2.67367 11.4663 3.33252C11.908 3.98389 12.2524 4.69141 12.4995 5.45508C12.7541 6.21875 12.8813 6.95996 12.8813 7.67871C12.8813 8.13542 12.8252 8.71566 12.7129 9.41943C12.6081 10.1157 12.4434 10.8607 12.2188 11.6543C11.9941 12.4404 11.7022 13.1929 11.3428 13.9116H5.13232C4.77295 13.1929 4.48096 12.4404 4.25635 11.6543C4.03174 10.8607 3.86328 10.1157 3.75098 9.41943C3.64616 8.71566 3.59375 8.13542 3.59375 7.67871C3.59375 6.95996 3.71729 6.21875 3.96436 5.45508C4.21891 4.69141 4.56331 3.98389 4.99756 3.33252C5.4318 2.67367 5.92594 2.14209 6.47998 1.73779C7.0415 1.32601 7.62549 1.12012 8.23193 1.12012ZM8.24316 20.5151C7.36719 20.5151 6.6971 20.1221 6.23291 19.3359C5.7762 18.5498 5.54785 17.5391 5.54785 16.3037C5.54785 16.1839 5.5516 16.0454 5.55908 15.8882C5.57406 15.731 5.59277 15.585 5.61523 15.4502H10.8711C10.8936 15.585 10.9085 15.731 10.916 15.8882C10.931 16.0454 10.9385 16.1839 10.9385 16.3037C10.9385 17.1273 10.8337 17.8573 10.624 18.4937C10.4219 19.1226 10.1187 19.6167 9.71436 19.9761C9.31755 20.3355 8.82715 20.5151 8.24316 20.5151ZM21.877 8.49854C22.4535 8.70817 22.9326 9.10124 23.3145 9.67774C23.6963 10.2467 23.9771 10.9131 24.1567 11.6768C24.3439 12.4404 24.4263 13.2266 24.4038 14.0352C24.3814 14.8363 24.2466 15.57 23.9995 16.2363C23.8423 16.6781 23.5915 17.2096 23.2471 17.8311C22.9102 18.445 22.4984 19.0851 22.0117 19.7515C21.5326 20.4103 21.001 21.0205 20.417 21.582L14.5771 19.4595C14.4948 18.6584 14.4798 17.8498 14.5322 17.0337C14.5921 16.2101 14.6895 15.4502 14.8242 14.7539C14.9665 14.0576 15.1162 13.4961 15.2734 13.0693C15.5205 12.3955 15.8911 11.7441 16.3853 11.1152C16.8869 10.4788 17.4522 9.92855 18.0811 9.46436C18.7174 9.00016 19.3651 8.67074 20.0239 8.47608C20.6903 8.28141 21.3079 8.2889 21.877 8.49854ZM15.251 26.7256C14.4274 26.4186 13.9333 25.8159 13.7686 24.9175C13.6113 24.0265 13.7424 23.0008 14.1616 21.8403C14.1991 21.728 14.2515 21.6008 14.3188 21.4585C14.3862 21.3088 14.4536 21.174 14.521 21.0542L19.4624 22.8623C19.4325 22.9971 19.395 23.1393 19.3501 23.2891C19.3127 23.4463 19.2715 23.5811 19.2266 23.6934C18.8073 24.8464 18.2458 25.7148 17.542 26.2988C16.8382 26.8828 16.0745 27.0251 15.251 26.7256Z";

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

const ITEMS = [
  {
    title: "주기적으로 남는 발자국",
    description:
      "설정한 주기마다 도둑 위치가 발자국으로 찍혀요. 경찰이 따라갈 유일한 단서예요.",
    visual: <ShoeprintVisual />,
  },
  {
    title: "구역과 감옥, 손끝으로",
    description:
      "지도를 드래그해서 플레이 구역과 감옥을 그려요. 구역 밖으로 나가면 바로 경고가 떠요.",
    visual: <ZoneVisual />,
  },
  {
    title: "팀원에게만 닿는 대화",
    description:
      "경찰은 경찰끼리, 도둑은 도둑끼리. 전략이 상대팀으로 새어나가지 않아요.",
    visual: <ChatVisual />,
  },
];

export default function FeaturesSection() {
  return (
    <section className="bg-slate-50 py-24 transition-colors duration-500 sm:py-32 dark:bg-app-black-900">
      <Container>
        <ScrollReveal animation="fadeInUp">
          <div className="max-w-2xl">
            <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl dark:text-white">
              복잡한 건 앱에 맡기고
              <br />
              즐기기만 하세요
            </h2>
            <p className="mt-5 text-pretty text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
              위치 공유, 구역 체크, 팀 채팅까지 앱이 책임집니다. 이제 게임만
              즐기세요.
            </p>
          </div>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {ITEMS.map((item, i) => (
            <ScrollReveal key={item.title} animation="fadeInUp" delayMs={i * 80}>
              <article className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-app-black dark:ring-white/10 dark:hover:shadow-2xl dark:hover:ring-white/20">
                <div className="aspect-7/5 w-full overflow-hidden bg-white dark:bg-app-black">
                  <div className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.03]">
                    {item.visual}
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
