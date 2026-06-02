"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Shell from "./Shell";
import { CIVILIAN_SRC, ROBBER_SRC } from "./types";
import { getTopScores } from "./leaderboard";

export default function IntroScreen({ onStart }: { onStart: () => void }) {
  const [best, setBest] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    getTopScores(1).then((s) => {
      if (alive) setBest(s[0]?.score ?? 0);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Shell>
      <div className="relative z-10 mx-auto flex max-w-md flex-col items-center text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-bold text-brand-blue dark:bg-brand-green/15 dark:text-brand-green">
          미니게임
        </span>
        <h1 className="mt-4 text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl dark:text-white">
          도둑을 잡아라!
        </h1>
        <p className="mt-4 text-pretty text-base leading-relaxed text-slate-600 dark:text-slate-300">
          30초 동안 빼꼼 나오는{" "}
          <b className="text-emerald-600 dark:text-brand-green">도둑</b>만 콕!{" "}
          <b className="text-red-500 dark:text-red-400">경찰</b>을 건드리면 감점이에요.
        </p>

        <div className="mt-6 flex items-center justify-center gap-6">
          <Legend src={ROBBER_SRC} label="탭하면 체포" tone="good" />
          <Legend src={CIVILIAN_SRC} label="건드리면 감점" tone="bad" />
        </div>

        {best !== null && best > 0 && (
          <p className="mt-6 font-mono text-sm font-semibold text-slate-400 dark:text-slate-500">
            현재 최고 점수{" "}
            <span className="text-brand-blue dark:text-brand-green">{best}</span>
          </p>
        )}

        <button
          type="button"
          onClick={onStart}
          className="mt-8 w-full rounded-2xl bg-brand-blue px-8 py-4 text-lg font-bold text-white shadow-lg shadow-brand-blue/30 transition-transform hover:-translate-y-0.5 active:translate-y-0 dark:bg-brand-green dark:text-app-black dark:shadow-none"
        >
          시작하기
        </button>
      </div>
    </Shell>
  );
}

function Legend({
  src,
  label,
  tone,
}: {
  src: string;
  label: string;
  tone: "good" | "bad";
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl ring-1 ${
          tone === "good"
            ? "bg-emerald-50 ring-emerald-200 dark:bg-brand-green/10 dark:ring-brand-green/20"
            : "bg-red-50 ring-red-200 dark:bg-red-500/10 dark:ring-red-500/20"
        }`}
      >
        <Image src={src} alt="" width={80} height={80} unoptimized className="h-12 w-12" />
      </span>
      <span
        className={`text-xs font-bold ${
          tone === "good"
            ? "text-emerald-600 dark:text-brand-green"
            : "text-red-500 dark:text-red-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
