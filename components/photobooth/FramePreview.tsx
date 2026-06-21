/* eslint-disable @next/next/no-img-element */
"use client";

import { type FrameDef } from "./frames";

// 선택 중인 사진들이 실제 프레임 슬롯에 채워지는 모습을 실시간으로 보여준다.
// 합성(canvas)과 동일한 좌표를 %로 환산해 DOM으로 가볍게 미리보기.
export default function FramePreview({
  frame,
  slots,
  className = "",
}: {
  frame: FrameDef;
  /** 슬롯 순서(위→아래)대로의 사진 src. 아직 안 고른 칸은 null. */
  slots: (string | null)[];
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio: `${frame.width} / ${frame.height}` }}
    >
      {frame.slots.map((slot, i) => {
        const src = slots[i] ?? null;
        return (
          <div
            key={i}
            className="absolute overflow-hidden bg-slate-200 dark:bg-app-black-800"
            style={{
              left: `${(slot.x / frame.width) * 100}%`,
              top: `${(slot.y / frame.height) * 100}%`,
              width: `${(slot.w / frame.width) * 100}%`,
              height: `${(slot.h / frame.height) * 100}%`,
            }}
          >
            {src ? (
              <img src={src} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-400/70">
                {i + 1}
              </span>
            )}
          </div>
        );
      })}

      {/* 프레임(투명창 + 스티커)을 위에 덮어 실제 결과와 같은 모습으로 */}
      <img
        src={frame.src}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
    </div>
  );
}
