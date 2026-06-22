/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import FramePreview from "./FramePreview";
import { pickCount, type FrameDef } from "./frames";

export default function SelectScreen({
  shots,
  frame,
  onDone,
  onRetake,
}: {
  shots: string[];
  frame: FrameDef;
  onDone: (selected: number[]) => void;
  onRetake: () => void;
}) {
  const need = pickCount(frame);
  const [selected, setSelected] = useState<number[]>([]);
  const done = selected.length === need;

  const toggle = (i: number) =>
    setSelected((prev) =>
      prev.includes(i)
        ? prev.filter((x) => x !== i)
        : prev.length >= need
          ? prev
          : [...prev, i]
    );

  // 슬롯 순서대로 채워질 사진(아직 안 고른 칸은 null) — 미리보기에 그대로 반영.
  const slotSrcs = Array.from({ length: need }, (_, i) =>
    selected[i] !== undefined ? shots[selected[i]] : null
  );

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-5">
      <div className="flex items-center gap-3 pt-1">
        <img
          src="/photobooth/cop-search.svg"
          alt=""
          className="h-14 w-auto drop-shadow-md sm:h-16"
        />
        <div className="text-left">
          <h2 className="text-2xl font-extrabold text-brand-ink sm:text-3xl dark:text-white">
            마음에 드는 {need}컷을 골라요
          </h2>
        </div>
      </div>

      <div className="mt-5 flex w-full max-w-4xl flex-1 items-center justify-center gap-6">
        <FramePreview
          frame={frame}
          slots={slotSrcs}
          className="h-[50vh] shrink-0 rounded-xl shadow-lg ring-1 ring-black/5 sm:h-[56vh]"
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {shots.map((src, i) => {
            const order = selected.indexOf(i);
            const active = order !== -1;
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                className={`relative aspect-7/5 w-36 overflow-hidden rounded-2xl border-4 transition sm:w-44 ${
                  active
                    ? "scale-[0.97] border-brand-blue shadow-lg"
                    : "border-transparent hover:border-brand-blue/40"
                }`}
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
                {active && (
                  <span className="pb-badge absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-sm font-bold text-white shadow">
                    {order + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex w-full max-w-md items-center justify-between gap-3">
        <button
          onClick={onRetake}
          className="rounded-full border border-slate-300 px-8 py-4 text-lg font-bold text-slate-600 transition active:scale-95 dark:border-app-black-800 dark:text-slate-300"
        >
          다시 찍기
        </button>
        <button
          onClick={() => onDone(selected)}
          disabled={!done}
          className="rounded-full bg-brand-blue px-10 py-4 text-lg font-bold text-white shadow-lg shadow-brand-blue/30 transition active:scale-95 disabled:opacity-40"
        >
          {done
            ? "이걸로 할래요"
            : selected.length === 0
              ? `${need}컷을 골라주세요`
              : `${selected.length}/${need} 골랐어요`}
        </button>
      </div>
    </div>
  );
}
