"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { appColors } from "@/lib/app-tokens";
import {
  DEMO_EXPLAINER_SECONDS,
  DEMO_POLICE_WAIT_SECONDS,
  DEMO_REVEAL_MINUTES,
  DEMO_RULE_INTERVAL_MS,
  ROBBER_POLICE_START_SECONDS,
} from "@/lib/demo/scenes";
import { useDemoCopy } from "../demo-copy";

type Team = "police" | "robber";

// 앱 좌표는 폭 300 목업 기준이다(stripe_banner.dart, start_banners.dart, chase_scene.dart).
// 데모 화면 폭 393 에 맞춘 배율
const S = 393 / 300;

const ENTER_MS = 900;
const FILLED_ENTER_MS = 470;
const EXIT_MS = 700;
const STRIPES = 7;

const bandColor = (team: Team) => (team === "police" ? appColors.blue : appColors.green);
const onBandColor = (team: Team) => (team === "police" ? appColors.white : appColors.black);

// 시작 장면 캐릭터 파일 크기와 달리기 주기 (chase_scene.dart _runPeriod, _runDelay)
const CHASE_SIZE = { police: { width: 272, height: 323 }, robber: { width: 248, height: 243 } };
const RUN_TIMING = {
  police: { animationDuration: "460ms", animationDelay: "230ms" },
  robber: { animationDuration: "500ms", animationDelay: "0ms" },
};

// 사선 줄무늬 띠 (stripe_banner.dart). 폭 390, -4.6도 기울어진 띠에 양 끝이 사선인 줄 7개가
// 왼쪽에서 빨려 나와 펼쳐지고 내용이 들어온다. 머문 뒤 내용이 먼저 빠지고 줄이 오른쪽으로 빠진다.
// 들어오는 중 탭은 기억만 했다가 다 들어온 뒤 나간다(도중에 끊으면 줄이 튄다).
function StripeBanner({
  team,
  bandHeight,
  holdMs,
  dimBehind = false,
  tapToSkip = false,
  filledStart = false,
  onLeaving,
  onDone,
  children,
}: {
  team: Team;
  bandHeight: number;
  holdMs: number;
  dimBehind?: boolean;
  tapToSkip?: boolean;
  filledStart?: boolean;
  onLeaving?: () => void;
  onDone: () => void;
  children: ReactNode;
}) {
  const [stage, setStage] = useState<"enter" | "hold" | "leave">("enter");
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    if (stage !== "enter") return;
    const t = window.setTimeout(() => setStage("hold"), filledStart ? FILLED_ENTER_MS : ENTER_MS);
    return () => window.clearTimeout(t);
  }, [stage, filledStart]);

  useEffect(() => {
    if (stage !== "hold") return;
    const t = window.setTimeout(() => setStage("leave"), skip ? 0 : holdMs);
    return () => window.clearTimeout(t);
  }, [stage, skip, holdMs]);

  useEffect(() => {
    if (stage !== "leave") return;
    onLeaving?.();
    const t = window.setTimeout(onDone, EXIT_MS);
    return () => window.clearTimeout(t);
  }, [stage, onLeaving, onDone]);

  const leaving = stage === "leave";
  const stripeClass = leaving ? "demo-stripe-out" : filledStart ? "demo-stripe-filled" : "demo-stripe-in";
  return (
    <div
      className={`absolute inset-0 z-40 overflow-hidden ${tapToSkip ? "" : "pointer-events-none"}`}
      onClick={tapToSkip ? () => setSkip(true) : undefined}
    >
      {dimBehind && <div className={`absolute inset-0 bg-black/50 ${leaving ? "demo-dim-out" : "demo-dim-in"}`} />}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: 390 * S,
          height: bandHeight * S,
          transform: "translate(-50%, -50%) rotate(-4.6deg)",
        }}
      >
        <div className="flex h-full flex-col">
          {Array.from({ length: STRIPES }, (_, i) => (
            <span
              key={i}
              className={`min-h-0 flex-1 ${stripeClass}`}
              style={{
                backgroundColor: bandColor(team),
                clipPath: "polygon(3% 0, 100% 0, 97% 100%, 0 100%)",
                animationDelay: leaving ? `${120 + i * 40}ms` : filledStart ? "0ms" : `${i * 50}ms`,
              }}
            />
          ))}
        </div>
        <div
          className={`absolute inset-0 ${leaving ? "demo-band-content-out" : "demo-band-content-in"}`}
          style={leaving ? undefined : { animationDelay: filledStart ? "150ms" : "560ms" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// ① 역할 배너 (start_banners.dart: 띠 154, 머묾 2.35초, 뒤를 어둡게 덮고 탭으로 넘긴다)
function RoleBanner({
  team,
  onLeaving,
  onDone,
}: {
  team: Team;
  onLeaving: () => void;
  onDone: () => void;
}) {
  const { app } = useDemoCopy();
  return (
    <StripeBanner team={team} bandHeight={154} holdMs={2350} dimBehind tapToSkip onLeaving={onLeaving} onDone={onDone}>
      <div className="flex h-full items-center" style={{ paddingLeft: 52 * S, color: onBandColor(team) }}>
        <Image
          src={`/demo/start_role_${team}.svg`}
          alt=""
          width={139}
          height={154}
          style={{ width: 88 * S, height: "auto" }}
        />
        <div className="min-w-0" style={{ marginLeft: 10 * S }}>
          <p className="text-[14px] leading-none">{app.startRoleLabel}</p>
          <p className="text-[28px] font-semibold leading-none" style={{ marginTop: 6 * S }}>
            {team === "police" ? app.roleCop : app.roleRobber}
          </p>
          <p className="text-[14px] leading-[1.4]" style={{ marginTop: 6 * S, width: 160 * S }}>
            {team === "police" ? app.startMissionPolice : app.startMissionRobber}
          </p>
        </div>
      </div>
    </StripeBanner>
  );
}

// ④ 출동 배너 (start_banners.dart: 띠 168, 머묾 1.7초, 지도를 바로 쓰게 터치를 막지 않는다).
// 쥐와 고양이가 왼쪽 밖에서 달려 들어온다. 고양이가 0.16초 늦다.
// [filledStart] 는 대기 장면이 끝나고 이어질 때다 - 줄이 빨려 들지 않고 그 자리에 나타난다
export function DispatchBanner({
  team,
  filledStart = false,
  onDone,
}: {
  team: Team;
  filledStart?: boolean;
  onDone: () => void;
}) {
  const { app } = useDemoCopy();
  return (
    <StripeBanner team={team} bandHeight={168} holdMs={1700} filledStart={filledStart} onDone={onDone}>
      <div className="relative h-full overflow-hidden" style={{ color: onBandColor(team) }}>
        <div className="absolute text-center" style={{ top: 14 * S, left: 45 * S, width: 300 * S }}>
          <p className="text-[14px]">{team === "police" ? app.dispatchPoliceLead : app.dispatchRobberLead}</p>
          <p className="mt-[6px] text-[28px] font-semibold leading-none">
            {team === "police" ? app.dispatchPoliceMain : app.dispatchRobberMain}
          </p>
        </div>
        <span className="demo-runner-in absolute" style={{ left: 205 * S, bottom: 18 * S, width: 65 * S }}>
          <Image
            src="/demo/start_chase_robber.svg"
            alt=""
            {...CHASE_SIZE.robber}
            className="demo-run h-auto w-full"
            style={RUN_TIMING.robber}
          />
        </span>
        <span
          className="demo-runner-in absolute"
          style={{ left: 95 * S, bottom: 14 * S, width: 69 * S, animationDelay: "160ms" }}
        >
          <Image
            src="/demo/start_chase_police.svg"
            alt=""
            {...CHASE_SIZE.police}
            className="demo-run h-auto w-full"
            style={RUN_TIMING.police}
          />
        </span>
      </div>
    </StripeBanner>
  );
}

// 멀어지는 캐릭터의 원근 (domain/recede.dart). 같은 속도로 멀어지면 크기와 지평선까지의 거리가
// 1/거리로 줄어 처음엔 빨리, 멀수록 천천히 작아진다. 경찰 시점은 쥐, 도둑 시점은 고양이다
const HORIZON_Y = 400;
const RECEDE = {
  robber: { startWidth: 96, endWidth: 30, startFeetY: 464.7, startCenterX: 168, vanishX: 295, aspect: 243 / 248 },
  police: { startWidth: 92, endWidth: 30, startFeetY: 485.6, startCenterX: 70, vanishX: 77, aspect: 323 / 272 },
};

function recede(progress: number, team: Team) {
  const spec = RECEDE[team];
  const f = 1 / (1 + (spec.startWidth / spec.endWidth - 1) * progress);
  const width = spec.startWidth * f;
  const feetY = HORIZON_Y + (spec.startFeetY - HORIZON_Y) * f;
  const centerX = spec.vanishX + (spec.startCenterX - spec.vanishX) * f;
  return { width, left: centerX - width / 2, top: feetY - width * spec.aspect };
}

const mmss = (sec: number) =>
  `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

// ② 경찰 대기 / ③ 도둑 설명 (chase_scene.dart). 앱바까지 덮는 장면이다.
// 앞 캐릭터는 내 팀, 멀어지는 쪽은 상대 팀이고 경찰은 낮, 도둑은 밤 배경이다.
// 앱은 경찰 대기가 방 설정 시간(최소 1분)만큼 지도를 막지만, 데모에서 그대로 두면 체험이
// 멈춘다. 그래서 몇 초로 줄이고(lib/demo/scenes.ts) 경찰도 눌러서 넘길 수 있게 했다.
function ChaseScene({ team, onDone }: { team: Team; onDone: () => void }) {
  const { app } = useDemoCopy();
  const police = team === "police";
  const total = police ? DEMO_POLICE_WAIT_SECONDS : DEMO_EXPLAINER_SECONDS;
  const accent = bandColor(team);
  const rules = police
    ? [app.startRuleQrArrest, app.startRulePing, app.startRuleRobberReveal(DEMO_REVEAL_MINUTES), app.startRuleZoneLock]
    : [app.startRuleQrCaught, app.startRuleMyReveal(DEMO_REVEAL_MINUTES), app.startRulePing, app.startRuleJailbreak];
  const [elapsed, setElapsed] = useState(0);
  const [ruleIndex, setRuleIndex] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    const t = window.setInterval(() => setRuleIndex((n) => (n + 1) % rules.length), DEMO_RULE_INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [rules.length]);
  useEffect(() => {
    if (elapsed >= total) onDone();
  }, [elapsed, total, onDone]);

  const left = Math.max(0, total - elapsed);
  // 도둑 설명이 끝나도 경찰 출동까지는 남아 있어, 지도의 카운트다운으로 그대로 이어지는 값을 보여 준다
  const countdown = police ? left : left + ROBBER_POLICE_START_SECONDS;
  const farTeam: Team = police ? "robber" : "police";
  const far = recede(Math.min(1, elapsed / total), farTeam);

  return (
    <button
      type="button"
      onClick={onDone}
      className="absolute inset-0 z-30 block overflow-hidden text-left"
      style={{ backgroundColor: police ? appColors.black100 : appColors.black900 }}
    >
      <Image
        src={`/demo/start_wait_town_${police ? "day" : "night"}.webp`}
        alt=""
        width={786}
        height={1708}
        className="absolute inset-x-0 top-0 w-full"
        style={{ height: "auto" }}
      />
      <span
        className="absolute transition-all duration-1000 ease-linear"
        style={{ left: far.left * S, top: far.top * S, width: far.width * S }}
      >
        <Image
          src={`/demo/start_chase_${farTeam}.svg`}
          alt=""
          {...CHASE_SIZE[farTeam]}
          className="demo-run h-auto w-full"
          style={RUN_TIMING[farTeam]}
        />
      </span>
      {/* 경찰은 출동 전까지 숨을 고르며 기다리고 도둑은 달린다 */}
      <span className="absolute" style={{ left: (police ? 20 : 134) * S, top: (police ? 400 : 392) * S, width: 96 * S }}>
        <Image
          src={`/demo/start_chase_${team}.svg`}
          alt=""
          {...CHASE_SIZE[team]}
          className={`${police ? "demo-breathe" : "demo-run"} h-auto w-full`}
          style={police ? undefined : RUN_TIMING[team]}
        />
      </span>

      <span className="absolute inset-x-0 flex flex-col items-center" style={{ top: 116 * S }}>
        <span className="flex items-center text-[12px]" style={{ height: 18 * S, color: police ? appColors.black600 : appColors.black400 }}>
          {app.startWaitCountdownLabel}
        </span>
        <span
          className="flex items-center text-[56px] font-semibold tabular-nums leading-none"
          style={{ height: 72 * S, color: accent }}
        >
          {mmss(countdown)}
        </span>
      </span>
      <span
        className="absolute inset-x-0 text-center text-[18px] font-semibold"
        style={{ top: 212 * S, color: police ? appColors.black : appColors.white }}
      >
        {police ? app.startWaitPoliceTitle : app.startWaitRobberTitle}
      </span>

      {/* 규칙 (앞 캐릭터 발 아래, 폭 205). 앱은 5초마다 바뀌지만 장면이 짧아 줄였다 */}
      <span key={ruleIndex} className="demo-footprint absolute block" style={{ left: 20 * S, top: 525 * S, width: 205 * S }}>
        <span className="block text-[12px] font-semibold" style={{ color: accent }}>
          {app.startRulesCounter(ruleIndex + 1, rules.length)}
        </span>
        <span
          className="block text-[14px] leading-[1.4]"
          style={{ marginTop: 4 * S, color: police ? appColors.black800 : appColors.black100 }}
        >
          {rules[ruleIndex]}
        </span>
      </span>
      <span className="absolute text-[12px]" style={{ left: 20 * S, bottom: 24 * S, color: appColors.black400 }}>
        {app.startTapToMap}
      </span>
      {/* 도둑 설명은 저절로 닫혀서 남은 시간 막대를 둔다 (높이 3) */}
      {!police && (
        <span className="absolute inset-x-0 bottom-0 h-[3px]">
          <span
            className="block h-full transition-[width] duration-1000 ease-linear"
            style={{ width: `${(left / total) * 100}%`, backgroundColor: accent }}
          />
        </span>
      )}
    </button>
  );
}

// 게임 시작 흐름 (game_page.dart). 역할 배너가 빠지면서 뒤에 장면이 드러나고, 장면이 끝나면
// [onStarted] 로 알린다. 경찰은 그 위로 출동 배너가 이어지고, 도둑의 출동 배너는
// 지도의 카운트다운이 끝날 때 뜬다(DemoInGameRobber).
export function DemoGameStart({ team, onStarted }: { team: Team; onStarted: () => void }) {
  const [roleOn, setRoleOn] = useState(true);
  const [sceneOn, setSceneOn] = useState(false);
  const [dispatchOn, setDispatchOn] = useState(false);

  const showScene = useCallback(() => setSceneOn(true), []);
  const hideRole = useCallback(() => setRoleOn(false), []);
  const hideDispatch = useCallback(() => setDispatchOn(false), []);
  const finishScene = useCallback(() => {
    setSceneOn(false);
    setDispatchOn(team === "police");
    onStarted();
  }, [team, onStarted]);

  return (
    <>
      {sceneOn && <ChaseScene team={team} onDone={finishScene} />}
      {roleOn && <RoleBanner team={team} onLeaving={showScene} onDone={hideRole} />}
      {dispatchOn && <DispatchBanner team={team} filledStart onDone={hideDispatch} />}
    </>
  );
}
