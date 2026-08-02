"use client";

import Image from "next/image";
import Shell from "./Shell";
import {
  CHEESE_BACK_SRC,
  CHEESE_TOP_SRC,
  CIVILIAN_SRC,
  GAME_MS,
  HOLE_POS,
  ROBBER_SRC,
  type Game,
  type Pop,
} from "./types";
import type { PlayText } from "@/lib/i18n/play";

// 보드 대비 % 단위 시각 상수
const MOUSE_W = 17;
const MOUSE_YOFF = 4; // 구멍 중심보다 아래로 - 하반신이 치즈에 가려지게
const TAP_W = 22;

export default function PlayScreen({
  game,
  shaking,
  onTap,
  t,
}: {
  game: Game;
  shaking: boolean;
  onTap: (i: number) => void;
  t: PlayText;
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
              {t.play.score}
            </p>
            <p className="font-mono text-3xl font-extrabold leading-tight tabular-nums text-slate-900 dark:text-white">
              {game.score}
            </p>
            <p
              className={`h-4 font-mono text-xs font-extrabold tabular-nums transition-opacity ${
                game.combo >= 2 ? "opacity-100" : "opacity-0"
              } ${fever ? "text-amber-500" : "text-amber-600 dark:text-amber-400"}`}
            >
              ×{game.combo}
              {t.play.comboSuffix}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t.play.timeLeft}
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
              urgent ? "bg-brand-red" : "bg-amber-400"
            }`}
            style={{ width: `${timePct}%` }}
          />
        </div>

        {/* 보드 - 치즈 3레이어(뒤 구멍속·쥐·앞 치즈) */}
        <div
          className={`relative mx-auto aspect-square w-full max-w-[min(30rem,calc(100dvh-17rem))] ${
            shaking ? "animate-[booth-shake_0.36s_ease-in-out]" : ""
          }`}
        >
          {/* 뒤: 구멍 속(주황) */}
          <Image
            src={CHEESE_BACK_SRC}
            alt=""
            fill
            sizes="(max-width: 640px) 90vw, 30rem"
            unoptimized
            aria-hidden="true"
            className="pointer-events-none select-none object-contain"
          />

          {/* 쥐 - 각 구멍에서 빼꼼 */}
          {game.holes.map((occ, i) =>
            occ ? (
              <div
                key={i}
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${HOLE_POS[i].x}%`,
                  top: `${HOLE_POS[i].y + MOUSE_YOFF}%`,
                  width: `${MOUSE_W}%`,
                }}
              >
                <Image
                  key={occ.id}
                  src={occ.type === "robber" ? ROBBER_SRC : CIVILIAN_SRC}
                  alt=""
                  width={occ.type === "robber" ? 160 : 180}
                  height={occ.type === "robber" ? 145 : 200}
                  unoptimized
                  aria-hidden="true"
                  className={`h-auto w-full ${
                    occ.caught
                      ? "animate-[booth-caught_0.28s_ease-in_forwards]"
                      : "animate-[booth-pop_0.24s_ease-out]"
                  }`}
                />
              </div>
            ) : null,
          )}

          {/* 앞: 치즈(구멍 투명) - 쥐 하반신을 가림. 탭은 통과 */}
          <Image
            src={CHEESE_TOP_SRC}
            alt=""
            fill
            sizes="(max-width: 640px) 90vw, 30rem"
            unoptimized
            aria-hidden="true"
            className="pointer-events-none z-20 select-none object-contain"
          />

          {/* 탭 영역 + 점수 팝업 */}
          {game.holes.map((_, i) => (
            <HoleButton
              key={i}
              i={i}
              pop={game.pops.find((p) => p.hole === i)}
              onTap={() => onTap(i)}
              holeAria={t.play.holeAria}
            />
          ))}
        </div>

        <WantedPoster t={t.play} />
      </div>
    </Shell>
  );
}

function WantedPoster({ t }: { t: PlayText["play"] }) {
  return (
    <div className="mx-auto flex w-full max-w-xs items-center gap-3.5 rounded-2xl border-2 border-dashed border-slate-300 bg-white/70 px-4 py-2.5 dark:border-white/15 dark:bg-app-black/40">
      <div className="grid h-16 w-14 shrink-0 place-items-center overflow-hidden rounded-md bg-slate-100 ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10">
        <Image
          src={ROBBER_SRC}
          alt={t.wantedAlt}
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
          {t.wanted}
        </p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {t.wantedSub}
        </p>
      </div>
    </div>
  );
}

function HoleButton({
  i,
  pop,
  onTap,
  holeAria,
}: {
  i: number;
  pop: Pop | undefined;
  onTap: () => void;
  holeAria: string;
}) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        onTap();
      }}
      aria-label={holeAria}
      className="absolute z-30 aspect-square -translate-x-1/2 -translate-y-1/2 touch-none select-none rounded-full"
      style={{
        left: `${HOLE_POS[i].x}%`,
        top: `${HOLE_POS[i].y}%`,
        width: `${TAP_W}%`,
      }}
    >
      {pop && (
        <span
          key={pop.id}
          className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 animate-[booth-float_0.6s_ease-out_forwards] font-mono text-lg font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] ${
            pop.good ? "text-white" : "text-brand-red"
          }`}
        >
          {pop.text}
        </span>
      )}
    </button>
  );
}
