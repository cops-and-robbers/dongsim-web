"use client";

import { useCallback, useMemo, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { DemoApp } from "./DemoApp";
import { DemoCopyProvider } from "./demo-copy";
import { DEMO_COPY } from "@/lib/demo/copy";
import {
  courseProgress,
  type DemoCourseId,
  type DemoSceneId,
} from "@/lib/demo/scenes";
import type { Locale } from "@/lib/i18n/config";

// 코스 선택 칩의 세 자리. 첫 자리(진영)는 사이트 테마가 정한다 -
// 라이트=경찰, 다크=도둑 (#88). 사이트의 세계관이 데모까지 이어진다.
type DemoSlot = "chase" | "create" | "community";

// 데모 무대 - 왼쪽 소개 글·코스 선택·여정 목록, 오른쪽 폰.
// 코스를 고르면 헤드라인·여정·폰 흐름이 통째로 갈아끼워지고,
// 여정은 데모 진행에 따라 실시간으로 채워진다.
export function DemoStage({ locale = "ko" }: { locale?: Locale }) {
  const copy = DEMO_COPY[locale];
  const { team } = useTheme();
  const chaseId: DemoCourseId = team === "robber" ? "robber" : "police";
  const [slot, setSlot] = useState<DemoSlot>("chase");
  // 모바일 전체 화면 모드 - 폰이 화면을 덮는다. 코스 상태는 그대로 유지된다
  const [fullscreen, setFullscreen] = useState(false);
  const courseId = slot === "chase" ? chaseId : slot;
  const [progress, setProgress] = useState({ step: 0, finished: false });
  const course = useMemo(
    () => copy.courses.find((c) => c.id === courseId) ?? copy.courses[0],
    [copy, courseId],
  );
  const steps = course.steps;

  // 칩 선택뿐 아니라 테마 전환으로도 코스가 바뀐다 - 어느 쪽이든 폰은
  // key로 새로 시작하므로 여정도 처음으로 되돌린다. 렌더 중 보정 패턴이라
  // 화면에 이전 코스의 진행이 한 프레임도 남지 않는다.
  const [prevCourseId, setPrevCourseId] = useState(courseId);
  if (prevCourseId !== courseId) {
    setPrevCourseId(courseId);
    setProgress({ step: 0, finished: false });
  }

  const handleSceneChange = useCallback(
    (sceneId: DemoSceneId) => {
      const next = courseProgress(course, sceneId);
      // 코스 밖 장면(다른 탭 구경)은 직전 진행을 그대로 둔다.
      // 완주 장면은 단계 목록 밖에 있어도(방 만들기의 인게임 진입) 반영한다
      if (next.step === -1 && !next.finished) return;
      setProgress({
        step: next.step === -1 ? course.steps.length - 1 : next.step,
        finished: next.finished,
      });
    },
    [course],
  );

  // 화면에 늘어놓는 칩 세 개 - 첫 자리만 테마를 따라 내용이 바뀐다
  const chips = useMemo(
    () =>
      ([chaseId, "create", "community"] as const).map(
        (id) => copy.courses.find((c) => c.id === id) ?? copy.courses[0],
      ),
    [copy, chaseId],
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
    <div className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-6xl flex-col px-4 pb-8 pt-24 lg:flex-row lg:items-center lg:gap-10 lg:pt-16">
      <div className="shrink-0 text-center lg:w-80 lg:text-left xl:w-96">
        {/* 헤드라인은 코스 데이터에서 온다 - 고른 경험과 문구가 어긋날 수 없다 */}
        <h1 className="text-balance text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl dark:text-white">
          {course.stage.h1[0]}
          <br />
          {course.stage.h1[1]}
        </h1>
        <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
          {course.stage.lead}
        </p>

        {/* 코스 선택 - 고르면 여정과 폰이 그 경험으로 바뀐다 */}
        <div className="mt-5 flex justify-center gap-2 lg:justify-start">
          {chips.map((c) => {
            const selected = c.id === courseId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSlot(c.id === chaseId ? "chase" : (c.id as DemoSlot))}
                className={`rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                  selected
                    ? "border-brand-blue bg-brand-blue text-white dark:border-brand-green dark:bg-brand-green dark:text-slate-900"
                    : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                {c.title}
              </button>
            );
          })}
        </div>
        {/* 테마가 곧 진영이라는 힌트 - 이 줄이 없으면 아무도 모른다 */}
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          {copy.themeHint}
        </p>

        {/* 여정 - 데스크톱은 세로 목록 */}
        <ol className="mt-8 hidden flex-col gap-5 lg:flex">
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
          {/* 코스가 바뀌면(테마 전환 포함) 폰을 처음부터 새로 시작한다 */}
          <DemoApp
            key={courseId}
            course={courseId}
            onSceneChange={handleSceneChange}
            fullscreen={fullscreen}
            onEnterFullscreen={() => setFullscreen(true)}
            onExitFullscreen={() => setFullscreen(false)}
          />
        </DemoCopyProvider>
      </div>
    </div>
  );
}
