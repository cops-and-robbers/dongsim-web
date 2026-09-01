"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PhoneFrame } from "@/components/game/PhoneMockup";
import { AppScreen } from "@/components/game/mockups/AppScreen";
import type { DemoCourseId, DemoSceneId, DemoTab } from "@/lib/demo/scenes";
import { useDemoCopy } from "./demo-copy";
import { DemoGuide } from "./DemoGuide";
import { DemoTabBar } from "./DemoTabBar";
import { DemoHome } from "./scenes/DemoHome";
import { DemoJoinDialog } from "./scenes/DemoJoinDialog";
import { DemoWaitingRoom } from "./scenes/DemoWaitingRoom";
import { DemoInGame } from "./scenes/DemoInGame";
import { DemoInGameRobber } from "./scenes/DemoInGameRobber";
import { DemoMyPage } from "./scenes/DemoMyPage";
import { DemoVictory } from "./scenes/DemoVictory";
import { DemoZoneSetup, defaultZone, type ZoneDraft } from "./scenes/DemoZoneSetup";
import { DemoCreateBasic, defaultSettings, type SettingValues } from "./scenes/DemoCreateBasic";
import { DemoCreateConfirm } from "./scenes/DemoCreateConfirm";
import { DemoCommunityList } from "./scenes/DemoCommunityList";
import { DemoCommunityDetail } from "./scenes/DemoCommunityDetail";
import { DemoCommunityChat } from "./scenes/DemoCommunityChat";
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

// 홈 탭 안의 게임 흐름. 방 참여(경찰 코스)와 방 만들기 코스가 갈라진다
type DemoFlow =
  | "home"
  | "waiting"
  | "ingame"
  | "victory"
  | "createZone"
  | "createJail"
  | "createBasic"
  | "createConfirm"
  | "hostWaiting";

// 커뮤니티 탭 안의 흐름. 앱처럼 상세·채팅은 목록 위로 쌓인다 (#86)
type CommunityFlow = "list" | "detail" | "chat";

const COMMUNITY_SCENE: Record<CommunityFlow, DemoSceneId> = {
  list: "community",
  detail: "communityDetail",
  chat: "communityChat",
};

// 만져보는 앱 데모 (#77). 장면은 데이터(copy.scenes)로 정의하고
// 여기서는 어느 장면인지와 해볼 것의 완료만 들고 있는다.
// [course] 가 홈에서 열리는 길을 정하고, [onSceneChange] 로 여정에 알린다.
export function DemoApp({
  course = "police",
  onSceneChange,
}: {
  course?: DemoCourseId;
  onSceneChange?: (sceneId: DemoSceneId) => void;
}) {
  const [tab, setTab] = useState<DemoTab>("home");
  const [flow, setFlow] = useState<DemoFlow>("home");
  const [communityFlow, setCommunityFlow] = useState<CommunityFlow>("list");
  const [joinOpen, setJoinOpen] = useState(false);
  // 대기실에서 정한 팀. 인게임과 결과는 코스가 아니라 이 팀을 따라간다 -
  // 어느 코스에서든 도둑팀으로 시작하면 도둑 시점이 나온다 (#88)
  const [myTeam, setMyTeam] = useState<"police" | "robber">("robber");
  // 마이페이지에서 고른 프로필 - 홈 프로필 카드와 같은 값이다
  const [profileIcon, setProfileIcon] = useState<1 | 2>(1);
  const [done, setDone] = useState<Set<string>>(new Set());
  // 방 만들기 초안 - 구역·감옥·기본 정보가 화면 사이를 오간다
  const [zone, setZone] = useState<ZoneDraft>(() => defaultZone(500));
  const [jail, setJail] = useState<ZoneDraft>(() => defaultZone(100));
  const [settings, setSettings] = useState<SettingValues>(() => defaultSettings());
  const screenRef = useRef<HTMLDivElement>(null);
  const clock = useLiveClock();
  const copy = useDemoCopy();

  const sceneId: DemoSceneId =
    tab === "community"
      ? COMMUNITY_SCENE[communityFlow]
      : tab === "my"
        ? "my"
        : joinOpen
          ? "join"
          : flow === "home"
            ? course === "create"
              ? "homeCreate"
              : course === "community"
                ? "homeCommunity"
                : "home"
            : flow === "waiting" && course === "robber"
              ? "waitingRobber"
              : (flow === "ingame" || flow === "victory") && myTeam === "robber"
                ? flow === "ingame"
                  ? "ingameRobber"
                  : "victoryRobber"
                : flow;
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

  // 커뮤니티 코스의 첫 해볼 일이 탭 누르기라 탭 이동도 여기서 채점한다
  const selectTab = (next: DemoTab) => {
    if (next === "community") markDone("community-tab");
    setTab(next);
  };

  // 결과 화면은 지도가 상태바 뒤까지 깔리고, 인게임은 앱바 색이 상태바까지
  // 이어진다(앱의 SafeArea 배경과 동일) - 색 없이 두면 노치가 타이머를 가린다.
  // 나머지 화면은 흰 상태바다.
  const inGameView = (flow === "ingame" || flow === "victory") && tab === "home";
  const statusBar =
    flow === "victory" && tab === "home"
      ? undefined
      : inGameView && myTeam === "robber"
        ? appColors.black900
        : appColors.white;
  // 도둑 시점은 상태바 뒤가 어두워 시계를 밝은 톤으로 뒤집는다
  const darkStatus = inGameView && myTeam === "robber";

  return (
    // 폰 높이를 화면에 맞춘다 - 폭 = 남는 높이 x 9/19 (프레임 비율)
    <div
      className="relative"
      style={{ width: "clamp(220px, calc((100dvh - 13rem) * 9 / 19), 300px)" }}
    >
      <DemoGuide scene={scene} done={done} />
      <PhoneFrame clock={clock} darkStatus={darkStatus}>
        <AppScreen
          playing
          scrollRef={screenRef}
          statusBar={statusBar}
          className="bg-white"
        >
          {tab === "home" && flow === "home" && (
            <>
              <DemoHome
                active={
                  course === "create" ? "create" : course === "community" ? "none" : "join"
                }
                profileIcon={profileIcon}
                onCreate={() => {
                  markDone("create-start");
                  setFlow("createZone");
                }}
                onJoin={() => {
                  markDone("home-join");
                  setJoinOpen(true);
                }}
              />
              <DemoTabBar active={tab} onSelect={selectTab} />
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
              onReady={() =>
                markDone(course === "robber" ? "waiting-robber-ready" : "waiting-ready")
              }
              onStart={startGame}
              onLeave={leaveToHome}
            />
          )}
          {tab === "home" && flow === "createZone" && (
            <DemoZoneSetup
              variant="playground"
              initial={zone}
              onBack={leaveToHome}
              onDone={(next) => {
                setZone(next);
                markDone("create-zone");
                setFlow("createJail");
              }}
            />
          )}
          {tab === "home" && flow === "createJail" && (
            <DemoZoneSetup
              variant="jail"
              playground={zone}
              initial={jail}
              onBack={() => setFlow("createZone")}
              onDone={(next) => {
                setJail(next);
                markDone("create-jail");
                setFlow("createBasic");
              }}
            />
          )}
          {tab === "home" && flow === "createBasic" && (
            <DemoCreateBasic
              initial={settings}
              onBack={() => setFlow("createJail")}
              onDone={(next) => {
                setSettings(next);
                markDone("create-basic");
                setFlow("createConfirm");
              }}
            />
          )}
          {tab === "home" && flow === "createConfirm" && (
            <DemoCreateConfirm
              zone={zone}
              jail={jail}
              settings={settings}
              onBack={() => setFlow("createBasic")}
              onEditZone={() => setFlow("createZone")}
              onEditSettings={() => setFlow("createBasic")}
              onCreate={() => {
                markDone("create-confirm");
                setFlow("hostWaiting");
              }}
            />
          )}
          {tab === "home" && flow === "hostWaiting" && (
            <DemoWaitingRoom
              host
              onTeamMoved={() => {}}
              onReady={() => {}}
              onStart={(team) => {
                markDone("host-start");
                startGame(team);
              }}
              onLeave={leaveToHome}
            />
          )}
          {tab === "home" &&
            flow === "ingame" &&
            (myTeam === "robber" ? (
              <DemoInGameRobber
                onTask={markDone}
                onSurvive={() => setFlow("victory")}
                onLeave={leaveToHome}
              />
            ) : (
              <DemoInGame
                myTeam={myTeam}
                onTask={markDone}
                onVictory={() => setFlow("victory")}
                onLeave={leaveToHome}
              />
            ))}
          {tab === "home" && flow === "victory" && (
            <DemoVictory
              team={myTeam}
              onReplay={() => setFlow("ingame")}
              onHome={() => setFlow("home")}
            />
          )}
          {tab === "community" && communityFlow === "list" && (
            <>
              <DemoCommunityList
                onOpenPost={() => {
                  markDone("community-open");
                  setCommunityFlow("detail");
                }}
              />
              <DemoTabBar active={tab} onSelect={selectTab} />
            </>
          )}
          {tab === "community" && communityFlow === "detail" && (
            <DemoCommunityDetail
              onBack={() => setCommunityFlow("list")}
              onJoinChat={() => setCommunityFlow("chat")}
              onTask={markDone}
            />
          )}
          {tab === "community" && communityFlow === "chat" && (
            <DemoCommunityChat
              onBack={() => setCommunityFlow("detail")}
              onJoinRoom={() => {
                // 초대 코드가 곧 경찰 코스의 그 방이다 - 대기실로 합류한다
                setTab("home");
                setFlow("waiting");
              }}
              onTask={markDone}
            />
          )}
          {tab === "my" && (
            <>
              <DemoMyPage
                profileIcon={profileIcon}
                onSelectIcon={setProfileIcon}
                onTask={markDone}
              />
              <DemoTabBar active={tab} onSelect={selectTab} />
            </>
          )}
        </AppScreen>
      </PhoneFrame>
    </div>
  );
}
