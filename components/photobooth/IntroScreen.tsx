/* eslint-disable @next/next/no-img-element */
"use client";

export default function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="mb-10 flex items-end justify-center gap-3">
        <img src="/photobooth/cop.png" alt="" className="h-32 w-auto drop-shadow-md sm:h-44" />
        <img src="/photobooth/thief.png" alt="" className="h-28 w-auto drop-shadow-md sm:h-40" />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight text-brand-ink sm:text-5xl dark:text-white">
        경찰과 도둑 포토부스
      </h1>
      <p className="mt-4 max-w-md text-lg leading-relaxed text-slate-500 sm:text-xl dark:text-slate-400">
        경찰과 도둑이 담긴 예쁜 네 컷 사진,
        <br />
        지금 찍어서 QR로 바로 받아가세요.
      </p>
      <button
        onClick={onStart}
        className="mt-12 rounded-full bg-brand-blue px-16 py-5 text-2xl font-bold text-white shadow-xl shadow-brand-blue/30 transition active:scale-95"
      >
        촬영 시작
      </button>
    </div>
  );
}
