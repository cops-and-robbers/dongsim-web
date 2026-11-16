"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PhoneFrame } from "@/components/game/PhoneMockup";
import { DemoCopyProvider, useDemoCopy } from "@/components/demo/demo-copy";
import { DemoTabBar } from "@/components/demo/DemoTabBar";
import { DemoHome } from "@/components/demo/scenes/DemoHome";
import { DemoMyPage } from "@/components/demo/scenes/DemoMyPage";
import { appColors } from "@/lib/app-tokens";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";

type Copy = Messages["accountDeletion"]["app"];

// 앱의 기준 화면 폭(main.dart designSize). 이 폭으로 그려 줄이면 앱과 비율이 같다.
const DESIGN_WIDTH = 393;
const KEYWORD = "delete";
const APP_VERSION = "4.0.2";
const noop = () => {};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function TapMark({
  className,
  delayMs = 0,
  color = appColors.blueVer2Basic,
}: {
  className: string;
  delayMs?: number;
  color?: string;
}) {
  return (
    <span
      className={`demo-fade-in pointer-events-none absolute z-20 size-0 ${className}`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <span
        className="demo-pulse absolute left-0 top-0 size-[72px] rounded-full border-[3px] motion-reduce:hidden"
        style={{ borderColor: color }}
      />
      <span
        className="absolute size-[52px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
        style={{ borderColor: color }}
      />
    </span>
  );
}

// my_page.dart 의 탈퇴 창. app_dialog.dart, app_text_field.dart, app_button.dart 수치 그대로다.
function DeleteDialog({ copy }: { copy: Copy["dialog"] }) {
  const { app } = useDemoCopy();
  const [typed, setTyped] = useState(() =>
    prefersReducedMotion() ? KEYWORD.length : 0,
  );

  useEffect(() => {
    if (typed >= KEYWORD.length) return;
    const timer = setTimeout(() => setTyped(typed + 1), typed === 0 ? 500 : 150);
    return () => clearTimeout(timer);
  }, [typed]);

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center px-[36px]"
      style={{ backgroundColor: `rgba(0, 0, 0, 0.5)` }}
    >
      <div
        className="w-full rounded-[16px] px-[12px] pb-[16px] pt-[24px]"
        style={{ backgroundColor: appColors.white, letterSpacing: "-0.32px" }}
      >
        <p
          className="px-[4px] text-center text-[20px] font-semibold leading-none"
          style={{ color: appColors.black }}
        >
          {copy.title}
        </p>
        <p
          className="mt-[12px] whitespace-pre-line text-center text-[14px] leading-[1.4]"
          style={{ color: appColors.black600 }}
        >
          {copy.message}
        </p>
        <div className="mt-[12px] px-[6px]">
          <p
            className="rounded-[12px] border bg-white p-[16px] text-[16px] leading-[1.4]"
            style={{
              borderColor: typed ? appColors.black : appColors.black100,
              color: typed ? appColors.black : appColors.black600,
            }}
          >
            {typed ? KEYWORD.slice(0, typed) : KEYWORD}
          </p>
        </div>
        <div className="relative mt-[20px] flex gap-[8px] px-[4px]">
          <span
            className="flex h-[48px] flex-1 items-center justify-center rounded-[12px] text-[18px] font-semibold leading-none"
            style={{ backgroundColor: appColors.black100, color: appColors.black600 }}
          >
            {app.close}
          </span>
          <span
            className="flex h-[48px] flex-1 items-center justify-center rounded-[12px] text-[18px] font-semibold leading-none text-white"
            style={{ backgroundColor: appColors.red }}
          >
            {copy.confirm}
          </span>
          {typed >= KEYWORD.length && (
            <TapMark
              className="left-[75.5%] top-1/2"
              delayMs={200}
              color={appColors.white}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ScaledScreen({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(304 / DESIGN_WIDTH);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) =>
      setScale(entry.contentRect.width / DESIGN_WIDTH),
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frameRef} className="h-full w-full overflow-hidden">
      <div
        className="origin-top-left"
        style={{
          width: DESIGN_WIDTH,
          height: `${100 / scale}%`,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function GuideScreen({ step, copy }: { step: number; copy: Copy }) {
  const rowRef = useRef<HTMLDivElement>(null);

  // 회원 탈퇴는 설정 맨 아래에 있어서, 2단계에서는 실제로 내려가는 모습을 보여 준다.
  useEffect(() => {
    const row = rowRef.current;
    const scroller = row?.parentElement;
    if (!row || !scroller) return;
    const top = scroller.scrollHeight - scroller.clientHeight;
    if (step === 2 || prefersReducedMotion()) {
      scroller.scrollTop = top;
      return;
    }
    scroller.scrollTop = 0;
    const timer = setTimeout(
      () => scroller.scrollTo({ top, behavior: "smooth" }),
      600,
    );
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <div inert aria-hidden="true" className="relative flex h-full flex-col">
      {step === 0 ? (
        <DemoHome
          active="none"
          profileIcon={1}
          onCreate={noop}
          onJoin={noop}
        />
      ) : (
        <DemoMyPage
          profileIcon={1}
          onSelectIcon={noop}
          onTask={noop}
          appVersion={APP_VERSION}
          deleteAccountRef={rowRef}
          deleteAccountMark={
            step === 1 && (
              <>
                <span
                  className="demo-fade-in absolute inset-x-[12px] inset-y-[4px] rounded-[12px] border-2"
                  style={{
                    borderColor: appColors.blueVer2Basic,
                    animationDelay: "1400ms",
                  }}
                />
                <TapMark className="right-[52px] top-1/2" delayMs={1400} />
              </>
            )
          }
        />
      )}
      <div className="relative">
        <DemoTabBar active={step === 0 ? "home" : "my"} onSelect={noop} />
        {step === 0 && <TapMark className="left-[83.3%] top-[25px]" />}
      </div>
      {step === 2 && <DeleteDialog copy={copy.dialog} />}
    </div>
  );
}

export default function AccountDeletionAppGuide({
  copy,
  locale,
}: {
  copy: Copy;
  locale: Locale;
}) {
  const [step, setStep] = useState(0);

  return (
    <div className="mt-10 grid gap-10 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr] lg:gap-x-20 lg:gap-y-0">
      <div>
        <ol className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-0">
          {copy.steps.map((item, index) => {
            const active = index === step;
            return (
              <li key={item.label}>
                <button
                  type="button"
                  aria-current={active ? "step" : undefined}
                  onClick={() => setStep(index)}
                  className={`h-full w-full rounded-2xl px-2 py-3 text-center transition-colors lg:flex lg:gap-5 lg:rounded-none lg:border-t lg:border-slate-300/70 lg:px-0 lg:py-7 lg:text-left lg:dark:border-white/10 ${
                    active
                      ? "bg-white shadow-sm lg:bg-transparent lg:shadow-none dark:bg-white/10 lg:dark:bg-transparent"
                      : ""
                  }`}
                >
                  <span
                    className={`mx-auto flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors lg:mx-0 lg:mt-0.5 ${
                      active
                        ? "bg-brand-blue text-white dark:bg-brand-green dark:text-app-black"
                        : "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="block min-w-0">
                    <span
                      className={`mt-2 block text-[13px] font-bold lg:hidden ${
                        active
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {item.label}
                    </span>
                    <span
                      className={`hidden text-xl font-bold transition-colors lg:block ${
                        active
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {item.title}
                    </span>
                    <span
                      className={`mt-1.5 hidden leading-relaxed transition-colors lg:block ${
                        active
                          ? "text-slate-600 dark:text-slate-300"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {item.body}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p
          aria-live="polite"
          className="mt-5 text-center leading-relaxed text-slate-600 lg:hidden dark:text-slate-300"
        >
          {copy.steps[step].body}
        </p>
      </div>

      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <DemoCopyProvider locale={locale}>
          <div className="mx-auto w-full max-w-80">
            <PhoneFrame unbounded>
              <ScaledScreen>
                <GuideScreen key={step === 0 ? "home" : "my"} step={step} copy={copy} />
              </ScaledScreen>
            </PhoneFrame>
          </div>
        </DemoCopyProvider>
      </div>

      <p className="text-center text-sm leading-relaxed text-slate-500 lg:border-t lg:border-slate-300/70 lg:pt-6 lg:text-left lg:dark:border-white/10 dark:text-slate-400">
        {copy.note}
      </p>
    </div>
  );
}
