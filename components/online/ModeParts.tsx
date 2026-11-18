/* eslint-disable @next/next/no-img-element */

// /online 의 놀이 방식 카드와 장 머리. 경도는 사이트 색(라이트 파랑, 다크 초록), 구역 축소는 게임의 경계 빨강,
// 좀비 모드는 게임의 좀비 냥파 민트를 쓴다(cops-and-robbers-web-game shell.html). 경찰과 도둑 어느 편 색도 아니라 두 진영이 대등하게 남는다

export type ModeId = "classic" | "shrink" | "zombie";

export const MODE_STYLE: Record<ModeId, { card: string; accent: string; dot: string }> = {
  classic: {
    card: "bg-brand-blue-bg dark:bg-white/[0.05] dark:ring-1 dark:ring-white/10",
    accent: "text-brand-blue dark:text-brand-green",
    dot: "bg-brand-blue text-white dark:bg-brand-green dark:text-app-black",
  },
  shrink: {
    card: "bg-[#FDEEEC] dark:bg-white/[0.05] dark:ring-1 dark:ring-white/10",
    accent: "text-[#D2453A] dark:text-[#FF8F85]",
    dot: "bg-[#E2574C] text-white dark:bg-[#FF8F85] dark:text-app-black",
  },
  zombie: {
    card: "bg-[#E6F4EE] dark:bg-white/[0.05] dark:ring-1 dark:ring-white/10",
    accent: "text-[#1F6B52] dark:text-[#8FD0B8]",
    dot: "bg-[#2F8A6B] text-white dark:bg-[#8FD0B8] dark:text-app-black",
  },
};

/** 카드 그림. 게임과 같은 캐릭터 그림과 구역선 모양으로 그 판을 한눈에 */
export function ModeArt({ id }: { id: ModeId }) {
  if (id === "classic") {
    return (
      <div className="absolute inset-0 flex items-end justify-center gap-1 bg-[#DDF0CA] pb-[8%]">
        <img src="/online/police-front.svg" alt="" className="h-[62%] w-auto" />
        <img src="/online/robber-front.svg" alt="" className="h-[50%] w-auto" />
      </div>
    );
  }
  if (id === "shrink") {
    // 게임 zone.js: 지금 경계는 붉은 띠와 빨간 점선, 다음 구역은 어두운 테를 두른 흰 선, 지금 구역 밖은 옅은 붉은 막
    const blob = "M22 62 C20 34 48 16 80 17 C114 18 138 30 139 58 C140 86 112 103 78 102 C44 101 24 88 22 62 Z";
    return (
      <svg viewBox="0 0 160 120" className="absolute inset-0 h-full w-full" aria-hidden>
        <rect width={160} height={120} fill="#DDF0CA" />
        <path d={`M0 0H160V120H0Z ${blob}`} fill="rgba(226,87,76,.13)" fillRule="evenodd" />
        <path d={blob} fill="none" stroke="rgba(226,87,76,.2)" strokeWidth={7} />
        <path d={blob} fill="none" stroke="#E2574C" strokeWidth={2.2} strokeDasharray="9 6" />
        <g transform="translate(80 60) scale(0.62) translate(-80 -60)">
          <path d={blob} fill="none" stroke="rgba(29,35,43,.3)" strokeWidth={5} />
          <path d={blob} fill="none" stroke="#fff" strokeWidth={2.6} />
        </g>
        <image href="/online/robber-front.svg" x={66} y={46} width={28} height={26} />
      </svg>
    );
  }
  return (
    // 좀비 모드: 달밤 초록 바탕에 좀비 냥파와 냄비를 쓴 생존자 도둥이(게임 모드 카드와 같은 둘)
    <div className="absolute inset-0 flex items-end justify-center gap-1 bg-[#1F2D28] pb-[8%]">
      <img src="/online/van.svg" alt="" className="absolute right-[8%] top-[12%] h-[26%] w-auto opacity-90" />
      <img src="/online/zombie-cat.svg" alt="" className="h-[52%] w-auto" />
      <img src="/online/survivor-mouse.svg" alt="" className="h-[48%] w-auto" />
    </div>
  );
}

/** 장 머리: 번호와 놀이 방식 이름, 큰 제목, 한 줄 소개 */
export function ChapterHead({ n, id, name, title, lead }: { n: number; id: ModeId; name: string; title: string; lead: string }) {
  const s = MODE_STYLE[id];
  return (
    <div className="max-w-3xl">
      <p className={`flex items-center gap-2.5 text-sm font-bold ${s.accent}`}>
        <span className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 font-mono text-xs tabular-nums ${s.dot}`}>{String(n).padStart(2, "0")}</span>
        {name}
      </p>
      <h2 className="mt-5 text-balance text-4xl font-extrabold leading-[1.12] tracking-tight text-slate-900 sm:text-5xl dark:text-white">{title}</h2>
      <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-slate-600 dark:text-slate-300">{lead}</p>
    </div>
  );
}
