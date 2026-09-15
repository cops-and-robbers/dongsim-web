/* eslint-disable @next/next/no-img-element */
"use client";

// 서대페 부스 <경찰과 도둑학개론> 컨셉 (#131) - 냥파 교수와 출튀범 도둥이.
// 컨셉 카피는 이 화면에만 입힌다. 뒷 화면까지 세계관 대사를 채우면 과해진다.
export default function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="mb-10 flex items-end justify-center gap-6">
        <img
          src="/photobooth/cop-professor.svg"
          alt=""
          className="h-40 w-auto sm:h-48"
        />
        <img
          src="/photobooth/thief-runaway.svg"
          alt=""
          className="h-36 w-auto sm:h-44"
        />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight text-brand-ink sm:text-5xl dark:text-white">
        경찰과 도둑학개론
      </h1>
      <p className="mt-4 max-w-md text-lg leading-relaxed text-slate-500 sm:text-xl dark:text-slate-400">
        냥파 교수님과 도둥이가 함께하는 네 컷,
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
