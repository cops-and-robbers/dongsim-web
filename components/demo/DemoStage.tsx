"use client";

import { useCallback, useState } from "react";
import { DemoApp } from "./DemoApp";
import { DemoCopyProvider } from "./demo-copy";
import { DEMO_COPY } from "@/lib/demo/copy";
import { courseProgress, type DemoSceneId } from "@/lib/demo/scenes";
import type { Locale } from "@/lib/i18n/config";

// 데모 무대 - 왼쪽 소개 글·여정 목록, 오른쪽 폰. 여정은 코스 데이터에서
// 나오고 데모 진행에 따라 실시간으로 채워진다. 코스가 늘어나면
// 이 상태를 선택 UI에 물리기만 하면 된다.
export function DemoStage({ locale = "ko" }: { locale?: Locale }) {
  const copy = DEMO_COPY[locale];
  const steps = copy.courseSteps;
  const [progress, setProgress] = useState({ step: 0, finished: false });

  const handleSceneChange = useCallback(
    (sceneId: DemoSceneId) => {
      const next = courseProgress(steps, sceneId);
      // 코스 밖 장면(커뮤니티·마이 탭)은 직전 진행을 그대로 둔다
      if (next.step !== -1) setProgress(next);
    },
    [steps],
  );

  const stepState = (i: number) => {
    if (progress.finished || i < progress.step) return "done" as const;
    if (i === progress.step) return "current" as const;
    return "todo" as const;
  };

  const check = (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );

  const circleClass = (state: "done" | "current" | "todo") =>
    state === "done"
      ? "bg-brand-blue text-white dark:bg-brand-green dark:text-slate-900"
      : state === "current"
        ? "bg-white text-brand-blue ring-2 ring-brand-blue dark:bg-slate-900 dark:text-brand-green dark:ring-brand-green"
        : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400";

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-6xl flex-col px-4 pb-8 pt-24 lg:flex-row lg:items-center lg:gap-10 lg:pt-16">
      <div className="shrink-0 text-center lg:w-80 lg:text-left xl:w-96">
        <h1 className="text-balance text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl dark:text-white">
          {copy.stage.h1[0]}
          <br />
          {copy.stage.h1[1]}
        </h1>
        <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
          {copy.stage.lead}
        </p>

        {/* 여정 - 데스크톱은 세로 목록 */}
        <ol className="mt-10 hidden flex-col gap-5 lg:flex">
          {steps.map((item, i) => {
            const state = stepState(i);
            return (
              <li key={item.short} className="flex items-center gap-3.5">
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-300 ${circleClass(state)}`}
                >
                  {state === "done" ? check : i + 1}
                </span>
                <span
                  className={`text-[15px] transition-colors duration-300 ${
                    state === "current"
                      ? "font-semibold text-slate-900 dark:text-white"
                      : state === "done"
                        ? "font-medium text-slate-600 dark:text-slate-300"
                        : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {item.label}
                </span>
              </li>
            );
          })}
        </ol>

        {/* 여정 - 그 아래 화면은 가로 스텝으로 줄인다 */}
        <ol className="mt-6 flex items-start justify-center lg:hidden">
          {steps.map((item, i) => {
            const state = stepState(i);
            return (
              <li key={item.short} className="flex items-start">
                {i > 0 && (
                  <span
                    className={`mt-[11px] h-0.5 w-4 rounded-full transition-colors duration-300 sm:w-8 ${
                      state === "todo"
                        ? "bg-slate-200 dark:bg-slate-700"
                        : "bg-brand-blue dark:bg-brand-green"
                    }`}
                  />
                )}
                <div className="flex w-14 flex-col items-center gap-1 sm:w-16">
                  <span
                    className={`flex size-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors duration-300 ${circleClass(state)}`}
                  >
                    {state === "done" ? check : i + 1}
                  </span>
                  <span
                    className={`text-[10px] transition-colors duration-300 sm:text-[11px] ${
                      state === "current"
                        ? "font-semibold text-slate-900 dark:text-white"
                        : state === "done"
                          ? "text-slate-600 dark:text-slate-300"
                          : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {item.short}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* 데스크톱은 폰 오른쪽에 말풍선 자리(pr)를 비워 둔다.
          모바일 말풍선은 흐름 안에 있어서 따로 비울 필요가 없다 */}
      <div className="flex min-h-0 flex-1 items-center justify-center pt-6 lg:pt-0 lg:pr-64 xl:pr-72">
        <DemoCopyProvider locale={locale}>
          <DemoApp onSceneChange={handleSceneChange} />
        </DemoCopyProvider>
      </div>
    </div>
  );
}
