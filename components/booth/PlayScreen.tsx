"use client";

import Image from "next/image";
import Shell from "./Shell";
import { CIVILIAN_SRC, GAME_MS, ROBBER_SRC, type Game, type Occ, type Pop } from "./types";

export default function PlayScreen({
  game,
  shaking,
  onTap,
}: {
  game: Game;
  shaking: boolean;
  onTap: (i: number) => void;
}) {
  const timePct = (game.timeLeft / GAME_MS) * 100;
  const urgent = game.timeLeft <= 6000;
  const fever = game.combo >= 5;

  return (
    <Shell variant="fit">
      <div className="relative z-10 mx-auto flex h-full w-full max-w-lg flex-col justify-center gap-3">
        {/* HUD */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              점수
            </p>
            <p className="font-mono text-3xl font-extrabold leading-tight tabular-nums text-slate-900 dark:text-white">
              {game.score}
            </p>
            <p
              className={`h-4 font-mono text-xs font-extrabold tabular-nums transition-opacity ${
                game.combo >= 2 ? "opacity-100" : "opacity-0"
              } ${fever ? "text-brand-green" : "text-brand-blue dark:text-brand-green"}`}
            >
              ×{game.combo} 콤보
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              남은 시간
            </p>
            <p
              className={`font-mono text-3xl font-extrabold leading-tight tabular-nums ${
                urgent ? "text-brand-red" : "text-slate-900 dark:text-white"
              }`}
            >
              {Math.ceil(game.timeLeft / 1000)}
            </p>
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
          <div
            className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
              urgent ? "bg-brand-red" : "bg-brand-blue dark:bg-brand-green"
            }`}
            style={{ width: `${timePct}%` }}
          />
        </div>

        {/* 보드 — 가용 높이에 맞춰 축소(한 화면에 들어오게) */}
        <div
          className={`mx-auto grid aspect-square w-full max-w-[min(30rem,calc(100dvh-17rem))] grid-cols-3 gap-2.5 rounded-3xl bg-brand-blue-bg p-3 ring-1 ring-brand-blue/10 transition-shadow sm:gap-3 sm:p-4 dark:bg-app-black-900 dark:ring-white/10 ${
            fever ? "shadow-[0_0_0_3px_rgba(56,245,91,0.4)]" : ""
          } ${shaking ? "animate-[booth-shake_0.36s_ease-in-out]" : ""}`}
        >
          {game.holes.map((occ, i) => (
            <Hole
              key={i}
              occ={occ}
              pop={game.pops.find((p) => p.hole === i)}
              onTap={() => onTap(i)}
            />
          ))}
        </div>

        <WantedPoster />
      </div>
    </Shell>
  );
}

function WantedPoster() {
  return (
    <div className="mx-auto flex w-full max-w-xs items-center gap-3.5 rounded-2xl border-2 border-dashed border-slate-300 bg-white/70 px-4 py-2.5 dark:border-white/15 dark:bg-app-black/40">
      <div className="grid h-16 w-14 shrink-0 place-items-center overflow-hidden rounded-md bg-slate-100 ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10">
        <Image
          src={ROBBER_SRC}
          alt="지명수배 도둑"
          width={120}
          height={120}
          unoptimized
          className="h-12 w-12"
        />
      </div>
      <div className="text-left leading-tight">
        <p className="font-mono text-[10px] font-extrabold tracking-[0.35em] text-brand-red">
          WANTED
        </p>
        <p className="text-lg font-extrabold text-slate-900 dark:text-white">
          지명수배
        </p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          도둑을 전원 검거하라
        </p>
      </div>
    </div>
  );
}

function Hole({
  occ,
  pop,
  onTap,
}: {
  occ: Occ | null;
  pop: Pop | undefined;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        onTap();
      }}
      aria-label="쥐구멍"
      className="relative aspect-square touch-none select-none overflow-hidden rounded-2xl bg-[#eaf0fd] ring-1 ring-inset ring-white/70 dark:bg-app-black/40 dark:ring-white/10"
    >
      {/* 굴 입구(어두운 구멍) */}
      <span className="pointer-events-none absolute bottom-[8%] left-1/2 h-[46%] w-[80%] -translate-x-1/2 rounded-[50%] bg-[#27345a] dark:bg-black/70" />

      {/* 캐릭터 — 구멍에서 빼꼼 */}
      {occ && (
        <Image
          key={occ.id}
          src={occ.type === "robber" ? ROBBER_SRC : CIVILIAN_SRC}
          alt=""
          width={120}
          height={120}
          unoptimized
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-[20%] left-1/2 z-10 w-[58%] -translate-x-1/2 ${
            occ.caught
              ? "animate-[booth-caught_0.28s_ease-in_forwards]"
              : "animate-[booth-pop_0.24s_ease-out]"
          }`}
        />
      )}

      {/* 굴 앞턱 — 캐릭터 하반신을 가려 '나오는' 느낌 */}
      <span className="pointer-events-none absolute bottom-[1%] left-1/2 z-20 h-[34%] w-[88%] -translate-x-1/2 rounded-[50%] bg-[#e1e9fb] shadow-[inset_0_2px_0_rgba(255,255,255,0.8)] dark:bg-app-black-900 dark:shadow-[inset_0_2px_0_rgba(255,255,255,0.08)]" />

      {pop && (
        <span
          key={pop.id}
          className={`pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 animate-[booth-float_0.6s_ease-out_forwards] font-mono text-lg font-extrabold ${
            pop.good ? "text-brand-blue dark:text-brand-green" : "text-brand-red"
          }`}
        >
          {pop.text}
        </span>
      )}
    </button>
  );
}
