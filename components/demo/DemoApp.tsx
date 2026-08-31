"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { PhoneFrame } from "@/components/game/PhoneMockup";
import { AppScreen } from "@/components/game/mockups/AppScreen";
import type { DemoSceneId, DemoTab } from "@/lib/demo/scenes";
import { useDemoCopy } from "./demo-copy";
import { DemoGuide } from "./DemoGuide";
import { DemoTabBar } from "./DemoTabBar";
import { DemoHome } from "./scenes/DemoHome";
import { DemoJoinDialog } from "./scenes/DemoJoinDialog";
import { DemoWaitingRoom } from "./scenes/DemoWaitingRoom";
import { DemoInGame } from "./scenes/DemoInGame";
import { DemoVictory } from "./scenes/DemoVictory";
import { appColors } from "@/lib/app-tokens";

// 상태바에 실제 시각을 띄우기 위한 라이브 시계.
// 서버 렌더 값(9:41)과 어긋나지 않게 마운트 후에만 실제 값으로 바꾼다.
function useLiveClock() {
  const [clock, setClock] = useState<string | undefined>(undefined);
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setClock(`${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`);
    };
    update();
    const t = window.setInterval(update, 15_000);
    return () => window.clearInterval(t);
  }, []);
  return clock;
}

// 만져보는 앱 데모 (#77 1단계). 장면은 데이터(DEMO_SCENES)로 정의하고
// 여기서는 어느 장면인지와 해볼 것의 완료만 들고 있는다.
// 흐름은 앱 그대로다: 홈 → 참여 다이얼로그 → 대기실(팀 이동·준비) → 인게임.
// [onSceneChange] 로 바깥(여정 목록)에 현재 장면을 알린다.
export function DemoApp({
  onSceneChange,
}: {
  onSceneChange?: (sceneId: DemoSceneId) => void;
}) {
  const [tab, setTab] = useState<DemoTab>("home");
  // 홈 탭 안의 게임 흐름. 탭을 떠나도 진행은 남는다
  const [flow, setFlow] = useState<"home" | "waiting" | "ingame" | "victory">(
    "home",
  );
  const [joinOpen, setJoinOpen] = useState(false);
  // 대기실에서 정한 팀 - 인게임 참가자 목록이 이어받는다
  const [myTeam, setMyTeam] = useState<"police" | "robber">("robber");
  const [done, setDone] = useState<Set<string>>(new Set());
  const screenRef = useRef<HTMLDivElement>(null);
  const clock = useLiveClock();
  const copy = useDemoCopy();

  const sceneId: DemoSceneId =
    tab !== "home" ? tab : joinOpen ? "join" : flow;
  const scene = copy.scenes[sceneId];

  useEffect(() => {
    onSceneChange?.(sceneId);
  }, [sceneId, onSceneChange]);

  // 대기실의 "잠시 뒤 시작" 타이머가 리렌더마다 리셋되지 않게 참조를 고정한다
  const startGame = useCallback((team: "police" | "robber") => {
    setMyTeam(team);
    setFlow("ingame");
  }, []);
  const leaveToHome = useCallback(() => setFlow("home"), []);

  const markDone = (taskId: string) =>
    setDone((prev) => {
      if (prev.has(taskId)) return prev;
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });

  // 인게임·결과는 지도가 상태바 뒤까지 깔리고, 나머지는 흰 상태바다
  const statusBar =
    (flow === "ingame" || flow === "victory") && tab === "home"
      ? undefined
      : appColors.white;

  return (
    // 폰 높이를 화면에 맞춘다 - 폭 = 남는 높이 x 9/19 (프레임 비율)
    <div
      className="relative"
      style={{ width: "clamp(220px, calc((100dvh - 13rem) * 9 / 19), 300px)" }}
    >
      <DemoGuide scene={scene} done={done} />
      <PhoneFrame clock={clock}>
        <AppScreen
          playing
          scrollRef={screenRef}
          statusBar={statusBar}
          className="bg-white"
        >
          {tab === "home" && flow === "home" && (
            <>
              <DemoHome
                onJoin={() => {
                  markDone("home-join");
                  setJoinOpen(true);
                }}
              />
              <DemoTabBar active={tab} onSelect={setTab} />
              {joinOpen && (
                <DemoJoinDialog
                  onClose={() => setJoinOpen(false)}
                  onJoin={() => {
                    markDone("join-code");
                    setJoinOpen(false);
                    setFlow("waiting");
                  }}
                />
              )}
            </>
          )}
          {tab === "home" && flow === "waiting" && (
            <DemoWaitingRoom
              onTeamMoved={() => markDone("waiting-team")}
              onReady={() => markDone("waiting-ready")}
              onStart={startGame}
              onLeave={leaveToHome}
            />
          )}
          {tab === "home" && flow === "ingame" && (
            <DemoInGame
              myTeam={myTeam}
              onTask={markDone}
              onVictory={() => setFlow("victory")}
              onLeave={leaveToHome}
            />
          )}
          {tab === "home" && flow === "victory" && (
            <DemoVictory
              onReplay={() => setFlow("ingame")}
              onHome={() => setFlow("home")}
            />
          )}
          {tab !== "home" && (
            <>
              <div
                className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[14px]"
                style={{ backgroundColor: appColors.background }}
              >
                <Image
                  src={
                    tab === "community"
                      ? "/characters/robber.svg"
                      : "/characters/police.svg"
                  }
                  alt=""
                  width={96}
                  height={87}
                />
                <p
                  className="text-[15px] font-semibold"
                  style={{ color: appColors.black600 }}
                >
                  {copy.nextUpdate}
                </p>
              </div>
              <DemoTabBar active={tab} onSelect={setTab} />
            </>
          )}
        </AppScreen>
      </PhoneFrame>
    </div>
  );
}
