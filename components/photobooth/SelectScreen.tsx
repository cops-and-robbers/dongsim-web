/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import FramePreview from "./FramePreview";
import { Copy, useKiosk } from "./KioskContext";
import { pickCount, type FrameDef } from "./frames";

export default function SelectScreen({
  shots,
  frame,
  onFrameChange,
  onDone,
  onRetake,
}: {
  shots: string[];
  frame: FrameDef;
  onFrameChange: (frame: FrameDef) => void;
  onDone: (selected: number[]) => void;
  onRetake: () => void;
}) {
  const { frames, chars } = useKiosk();
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

  // 슬롯 순서대로 채워질 사진(아직 안 고른 칸은 null) - 미리보기에 그대로 반영.
  const slotSrcs = Array.from({ length: need }, (_, i) =>
    selected[i] !== undefined ? shots[selected[i]] : null
  );

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-5">
      {/* 두 진영을 같이(예전엔 경찰만 있었다). 행사가 고른 캐릭터 짝 */}
      <div className="flex items-center gap-3 pt-1">
        <img src={chars.cop} alt="" className="h-14 w-auto drop-shadow-md sm:h-16" />
        <div className="text-left">
          <h2 className="text-2xl font-extrabold text-brand-ink sm:text-3xl dark:text-white">
            <Copy k="select.title" cuts={need} />
          </h2>
        </div>
        <img src={chars.thief} alt="" className="h-14 w-auto drop-shadow-md sm:h-16" />
      </div>

      <div className="mt-5 flex w-full max-w-4xl flex-1 items-center justify-center gap-6">
        <div className="flex shrink-0 flex-col items-center gap-3">
          <FramePreview
            frame={frame}
            slots={slotSrcs}
            className="h-[46vh] rounded-xl shadow-lg ring-1 ring-black/5 sm:h-[52vh]"
          />
          {/* 행사가 프레임을 2개 이상 고르면 손님이 고른다. 색 점만으로는 비슷한 프레임을 못 가려 작은 그림으로 */}
          {frames.length > 1 && (
            <div data-spot="frames" className="flex items-end gap-3">
              {frames.map((f) => {
                const on = f.id === frame.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => onFrameChange(f)}
                    aria-label={`${f.label} 프레임`}
                    aria-pressed={on}
                    className="flex flex-col items-center gap-1 transition active:scale-95"
                  >
                    <img
                      src={f.src}
                      alt=""
                      className={`h-16 w-auto rounded-md ring-2 ring-offset-2 ring-offset-white dark:ring-offset-app-black ${on ? "ring-brand-blue" : "ring-slate-200 dark:ring-app-black-800"}`}
                    />
                    <span className={`text-xs font-semibold ${on ? "text-brand-blue" : "text-slate-500"}`}>{f.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {shots.map((src, i) => {
            const order = selected.indexOf(i);
            const active = order !== -1;
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                style={{ aspectRatio: frame.slots[0].w / frame.slots[0].h }}
                className={`relative w-36 overflow-hidden rounded-2xl border-4 transition sm:w-44 ${
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
          <Copy k="select.retake" />
        </button>
        <button
          onClick={() => onDone(selected)}
          disabled={!done}
          className="rounded-full bg-brand-blue px-10 py-4 text-lg font-bold text-white shadow-lg shadow-brand-blue/30 transition active:scale-95 disabled:opacity-40"
        >
          {done
            ? <Copy k="select.done" />
            : selected.length === 0
              ? `${need}컷을 골라주세요`
              : `${selected.length}/${need} 골랐어요`}
        </button>
      </div>
    </div>
  );
}
