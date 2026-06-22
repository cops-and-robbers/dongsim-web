/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COUNTDOWN_SECONDS, SHOT_COUNT } from "./config";
import { slotRatio, type FrameDef } from "./frames";
import { useCamera } from "./useCamera";

/** 비디오 현재 프레임을 슬롯 비율로 cover-crop + 셀카 미러해 dataURL로 반환. */
function captureFrame(video: HTMLVideoElement, ratio: number): string {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  let sw = vw;
  let sh = vw / ratio;
  if (sh > vh) {
    sh = vh;
    sw = vh * ratio;
  }
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;
  const W = 1575;
  const H = Math.round(W / ratio);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.translate(W, 0);
  ctx.scale(-1, 1); // 프리뷰와 동일하게 미러로 저장
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, W, H);
  return canvas.toDataURL("image/jpeg", 0.9);
}

export default function CaptureScreen({
  frame,
  onDone,
}: {
  frame: FrameDef;
  onDone: (shots: string[]) => void;
}) {
  const { videoRef, ready, error } = useCamera();
  const ratio = slotRatio(frame);
  const [shots, setShots] = useState<string[]>([]);
  const [count, setCount] = useState(COUNTDOWN_SECONDS);
  const [flash, setFlash] = useState(false);

  // onDone을 ref로 잡아 인터벌 클로저의 stale 참조 방지.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  const doCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const img = captureFrame(video, ratio);
    if (!img) return;
    setFlash(true);
    window.setTimeout(() => setFlash(false), 280);
    // 업데이터는 순수하게 — 한 장만 추가(Strict Mode가 두 번 호출해도 1장).
    setShots((prev) => (prev.length >= SHOT_COUNT ? prev : [...prev, img]));
  }, [ratio, videoRef]);

  const taken = shots.length;
  const tappable = ready && !error;

  // 다 찍으면 상위로 전달.
  useEffect(() => {
    if (shots.length >= SHOT_COUNT) onDoneRef.current(shots);
  }, [shots]);

  // 카운트다운: 컷 시작마다 리셋 후 1초마다 순수하게 감소(업데이터에 부작용 없음).
  useEffect(() => {
    if (!tappable || shots.length >= SHOT_COUNT) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCount(COUNTDOWN_SECONDS);
    const id = window.setInterval(() => setCount((c) => c - 1), 1000);
    return () => window.clearInterval(id);
  }, [tappable, shots.length]);

  // count가 0이 되는 순간 한 번만 촬영(부작용을 업데이터 밖에서 → 중복 방지).
  useEffect(() => {
    if (count === 0) doCapture();
  }, [count, doCapture]);

  return (
    <div
      onClick={tappable ? doCapture : undefined}
      className={`flex flex-1 select-none flex-col items-center px-4 py-6 ${
        tappable ? "cursor-pointer" : ""
      }`}
    >
      <div className="flex items-center gap-2.5 pt-2">
        {Array.from({ length: SHOT_COUNT }).map((_, i) => (
          <span
            key={i}
            className={`h-3 w-3 rounded-full transition ${
              i < taken
                ? "bg-brand-blue"
                : i === taken
                  ? "scale-125 bg-brand-blue/50"
                  : "bg-slate-300 dark:bg-app-black-800"
            }`}
          />
        ))}
      </div>

      <div className="flex w-full flex-1 items-center justify-center py-4">
        <div className="relative w-full max-w-3xl">
          {/* 찍힐 때마다 양옆 아래에서 경찰·도둑이 톡 솟음(taken 바뀔 때 재생) */}
          {tappable && taken > 0 && (
            <>
              <img
                key={`cop-${taken}`}
                src="/photobooth/cop.png"
                alt=""
                className="pb-pop pointer-events-none absolute -bottom-2 left-2 z-30 h-24 w-auto origin-bottom drop-shadow-xl sm:left-6 sm:h-32"
              />
              <img
                key={`thief-${taken}`}
                src="/photobooth/thief.png"
                alt=""
                className="pb-pop pointer-events-none absolute -bottom-2 right-2 z-30 h-24 w-auto origin-bottom drop-shadow-xl sm:right-6 sm:h-32"
              />
            </>
          )}

          <div className="relative aspect-7/5 w-full overflow-hidden rounded-3xl bg-black shadow-2xl">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />

            {flash && <div className="pb-flash absolute inset-0 z-20 bg-white" />}

            {tappable && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span
                  key={count}
                  className="pb-count text-[8rem] font-black text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.55)]"
                >
                  {count > 0 ? count : ""}
                </span>
              </div>
            )}

            {!tappable && (
              <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                <p className="text-base font-medium text-white">
                  {error ?? "카메라를 준비하고 있어요…"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="h-6 text-center text-base font-medium text-slate-500 dark:text-slate-400">
        {tappable ? "화면을 누르면 바로 찍혀요" : ""}
      </p>
    </div>
  );
}
