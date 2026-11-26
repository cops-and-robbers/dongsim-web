"use client";

import { useState, useSyncExternalStore } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { useTheme } from "@/components/ThemeProvider";
import { DemoCopyProvider } from "@/components/demo/demo-copy";
import {
  DemoGameStart,
  DISPATCH_DONE_AFTER_MS,
  ROLE_BANNER_MS,
} from "@/components/demo/scenes/DemoGameStart";
import { DemoMvpStage, MVP_STAGE_SETTLED_MS } from "@/components/demo/scenes/DemoMvpStage";
import { AppScreen } from "./AppScreen";
import { InGameScreen } from "./LocationMockup";
import { ResultCard } from "./ResultMockup";
import { useInView, useScenePlayback } from "./ScenePlayer";
import { MOCKUP_TEXT } from "./text";

// 게임 소개에서 움직이는 장면 두 개. 체험하기와 같은 장면 부품(앱 4.0.1 시작 장면, MVP 무대)을 쓴다.
// 진영은 사이트 테마를 따른다 - 라이트는 경찰, 다크는 도둑이라 두 진영이 같은 무게로 나온다.

type Team = "police" | "robber";

/** 움직임 줄이기 설정 - 켜져 있으면 장면을 재생하지 않고 마지막 모습만 보여 준다 */
const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCE_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => false,
  );
}

/** 역할 배너가 끝난 뒤 출동까지(ms). 대기 장면을 잠깐 보여 주고 출동 카운팅(6초)으로 넘어간다 */
const SEQUENCE_WAIT_MS = 8500;
const SEQUENCE_LENGTH_MS = ROLE_BANNER_MS + SEQUENCE_WAIT_MS + DISPATCH_DONE_AFTER_MS + 400;

/** 한 번 재생할 시작 흐름. 마운트할 때 출동 시각을 정하므로 다시 보기는 key 로 새로 만든다 */
function StartRun({ team }: { team: Team }) {
  const [releaseAt] = useState(() => Date.now() + ROLE_BANNER_MS + SEQUENCE_WAIT_MS);
  return <DemoGameStart team={team} releaseAt={releaseAt} onStarted={noop} />;
}
const noop = () => {};

/** ① 게임이 시작되는 순간 - 역할 배너 → 대기 장면 → 출동 카운팅 → 지도 */
export function StartSequenceMockup() {
  const locale = useLocale();
  const { team } = useTheme();
  const { ref, inView } = useInView<HTMLDivElement>();
  const reduce = useReducedMotion();
  const play = useScenePlayback(inView && !reduce, SEQUENCE_LENGTH_MS);
  const text = MOCKUP_TEXT[locale];
  const dark = team === "robber";

  return (
    <DemoCopyProvider locale={locale}>
      <AppScreen
        playing={inView}
        scrollRef={ref}
        className={dark ? "bg-[#1E232A]" : "bg-white"}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <InGameScreen dark={dark} timer={text.location.timer} countdown={text.location.countdown} />
        </div>
        {play.started && !play.finished && <StartRun key={`${play.run}-${team}`} team={team} />}
      </AppScreen>
    </DemoCopyProvider>
  );
}

/** MVP 무대가 끝난 뒤 결과 카드로 넘어가는 시각과 걸리는 시간 */
const MVP_TO_RESULT_MS = MVP_STAGE_SETTLED_MS + 600;
const CROSSFADE_MS = 450;

/** ② 게임이 끝나는 순간 - 팀 MVP 공개 무대 → 결과 카드(이동 거리와 경로) */
export function MvpMockup() {
  const locale = useLocale();
  const { team } = useTheme();
  const { ref, inView } = useInView<HTMLDivElement>();
  const reduce = useReducedMotion();
  const play = useScenePlayback(inView && !reduce, MVP_TO_RESULT_MS + CROSSFADE_MS);
  const text = MOCKUP_TEXT[locale];
  const dark = team === "robber";
  // 아직 보이지 않았으면 조명이 켜지기 전(어두운 무대)에서 기다린다. 움직임 줄이기면 다 켜진 무대에 머문다
  const ms = reduce ? MVP_STAGE_SETTLED_MS : play.started ? play.ms : 0;
  const resultOpacity = reduce
    ? 0
    : Math.min(1, Math.max(0, (ms - MVP_TO_RESULT_MS) / CROSSFADE_MS));

  return (
    <DemoCopyProvider locale={locale}>
      <AppScreen playing={inView} scrollRef={ref} className={dark ? "bg-black" : "bg-white"}>
        <div className="relative min-h-0 flex-1">
          <DemoMvpStage key={play.run} team={team} nickname={text.mvpNames[team]} ms={ms} />
          {resultOpacity > 0 && (
            <div className="absolute inset-0 flex flex-col" style={{ opacity: resultOpacity }}>
              <ResultCard team={team} t={text.result} />
            </div>
          )}
        </div>
      </AppScreen>
    </DemoCopyProvider>
  );
}
