"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { appColors } from "@/lib/app-tokens";
import { DEMO_MY_NAME } from "@/lib/demo/scenes";
import { useDemoCopy } from "../demo-copy";
import { DemoMvpStage, MVP_POP_AT_MS, MVP_STAGE_SETTLED_MS } from "./DemoMvpStage";

type Team = "police" | "robber";
type Phase = "over" | "tease" | "loser" | "winner";
type Step = { phase: Phase; at: number };

// 시간(ms) - game_over_intro_modal.dart 그대로
const OVER_MS = 1400; // minIntro: 「게임 종료!」 사유 문구를 읽을 시간
const TEASE_MS = 1300; // teaseHold: 흔들림 시작부터 첫 MVP 화면까지
const SHAKE_MS = 500;
const TEASE_TEXT_AT_MS = 250;
const TEXT_SWITCH_MS = 200;
const ENTER_MS = 250; // DialogAnimation: easeOutBack 확대 + 페이드
const SWITCH_MS = 350; // 화면 사이 AnimatedSwitcher: 페이드 + 0.92 → 1 확대
// 조명이 훑고(2.05초) 캐릭터가 나온 뒤 1초가 지나야 탭을 받는다 (entranceDuration)
const TAP_READY_MS = SWITCH_MS + MVP_POP_AT_MS + 1000;
const BAR_FADE_MS = 200;
// 무대가 이만큼 지나면 더 움직이지 않으니 프레임을 멈춘다
const STAGE_SETTLE_MS = Math.max(TAP_READY_MS + BAR_FADE_MS, SWITCH_MS + MVP_STAGE_SETTLED_MS);
// 움직임 줄이기면 모든 연출을 끝난 상태로 그린다
const SETTLED = 1e9;

// 진 팀 MVP. 대기실과 참가자 목록의 그 사람들이다
const LOSER_MVP: Record<Team, string> = { police: "잽싼그림자7215", robber: "든든한보안관3402" };

// 하단 안내 바 배경 - 앱 AppColors.black300Alpha15 · whiteAlpha15 (투명도 색은 토큰에 없다)
const BAR_ON_LIGHT = "#B1BCC826";
const BAR_ON_DARK = "#FFFFFF26";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const isStage = (p: Phase) => p === "loser" || p === "winner";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReduce(cb: () => void) {
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReduce,
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => false,
  );
}

// [until](performance.now 기준 시각) 전까지 프레임마다 시각을 돌려주고, 지나면 멈춘다
function useFrameClock(until: number) {
  const [now, setNow] = useState(0);
  const active = now < until;
  useEffect(() => {
    if (!active) return;
    let id = requestAnimationFrame(function tick(t) {
      setNow(t);
      id = requestAnimationFrame(tick);
    });
    // 화면 갱신이 멈춘 환경(가려진 창, 절전)에서도 넘어가게 느린 타이머를 같이 둔다
    const fallback = window.setInterval(() => setNow(performance.now()), 250);
    return () => {
      cancelAnimationFrame(id);
      window.clearInterval(fallback);
    };
  }, [active]);
  return now;
}

// 게임 종료 인트로 (game_over_intro_modal.dart). 「게임 종료!」 카드를 잠깐 보여 주고,
// 카드를 흔들어 「MVP는 누굴까?!」로 바꾼 뒤 진 팀 MVP, 이긴 팀 MVP 순으로 무대에 올린다.
// 각 무대는 연출이 끝난 뒤에만 탭으로 넘어가고, 그때 하단 안내 바가 나타난다.
// [team] 은 내 팀이고 데모에서는 항상 이긴 쪽이라 이긴 팀 MVP 는 나다.
export function DemoGameOver({ team, onDone }: { team: Team; onDone: () => void }) {
  const { app } = useDemoCopy();
  const reduced = useReducedMotion();
  const dark = team === "robber";
  const loserTeam: Team = team === "police" ? "robber" : "police";

  const [step, setStep] = useState<Step>(() => ({ phase: "over", at: performance.now() }));
  // 화면이 바뀌는 동안 걷히는 앞 화면
  const [prev, setPrev] = useState<Step | null>(null);
  const [introAt] = useState(step.at);
  const [teaseAt, setTeaseAt] = useState<number | null>(null);

  // 카드 단계의 시간표 - 앱처럼 탭과 상관없이 흘러간다
  useEffect(() => {
    if (step.phase !== "over" && step.phase !== "tease") return;
    const next: Phase = step.phase === "over" ? "tease" : "loser";
    const t = window.setTimeout(
      () => {
        const at = performance.now();
        if (next === "tease") setTeaseAt(at);
        setPrev(step);
        setStep({ phase: next, at });
      },
      step.phase === "over" ? OVER_MS : TEASE_MS,
    );
    return () => window.clearTimeout(t);
  }, [step]);

  const now = useFrameClock(reduced ? -Infinity : isStage(step.phase) ? step.at + STAGE_SETTLE_MS : Infinity);
  const since = (at: number) => (reduced ? SETTLED : Math.max(0, now - at));

  const ms = since(step.at);
  const stage = isStage(step.phase);
  const tapReady = stage && ms >= TAP_READY_MS;
  // 화면 전환 진행 0~1 - 카드가 흔들려 글자만 바뀌는 tease 는 같은 화면이다
  const switching = prev !== null && stage;
  const switchT = switching ? clamp01(ms / SWITCH_MS) : 1;

  const onTap = () => {
    if (!tapReady) return;
    if (step.phase !== "loser") return onDone();
    setPrev(step);
    setStep({ phase: "winner", at: performance.now() });
  };

  // ---------- 「게임 종료!」 카드 (AppPopup 카드와 같은 모양) ----------
  const renderCard = (layerOpacity: number, layerScale: number) => {
    const enter = clamp01(since(introAt) / ENTER_MS);
    const cardMs = teaseAt === null ? -1 : since(teaseAt);
    const shakeT = clamp01(cardMs / SHAKE_MS);
    const dx = cardMs < 0 ? 0 : Math.sin(shakeT * Math.PI * 6) * 14 * (1 - shakeT);
    // 흔들림 250ms 뒤에 글자가 200ms 동안 엇갈려 바뀐다
    const teaseT = cardMs < 0 ? 0 : clamp01((cardMs - TEASE_TEXT_AT_MS) / TEXT_SWITCH_MS);
    return (
      <span
        key="card"
        className="absolute inset-0 flex items-center justify-center px-[36px]"
        style={{
          opacity: layerOpacity * enter,
          transform: `scale(${layerScale * easeOutBack(enter)})`,
        }}
      >
        <span
          className="grid w-full rounded-[24px] px-[16px] py-[42px] text-center"
          style={{ backgroundColor: dark ? appColors.black : appColors.white, transform: `translateX(${dx}px)` }}
        >
          {teaseT < 1 && (
            <span className="col-start-1 row-start-1 flex flex-col items-center justify-center" style={{ opacity: 1 - teaseT }}>
              <span
                className={`text-[20px] leading-none tracking-[-0.32px] ${dark ? "font-moneygraphy" : "font-semibold"}`}
                style={{ color: dark ? appColors.green : appColors.black }}
              >
                {app.gameOverTitle}
              </span>
              <span
                className={`mt-[8px] text-[14px] font-medium tracking-[-0.32px] ${dark ? "leading-none" : "leading-[1.4]"}`}
                style={{ color: dark ? appColors.black400 : appColors.black600 }}
              >
                {dark ? app.gameOverTimeUp : app.gameOverAllArrested}
              </span>
            </span>
          )}
          {teaseT > 0 && (
            <span
              className="col-start-1 row-start-1 flex items-center justify-center text-[28px] font-semibold leading-none tracking-[-0.32px]"
              style={{ color: dark ? appColors.green : appColors.blue, opacity: teaseT }}
            >
              {app.mvpTease}
            </span>
          )}
        </span>
      </span>
    );
  };

  const renderLayer = (s: Step, opacity: number, scale: number) => {
    if (!isStage(s.phase)) return renderCard(opacity, scale);
    return (
      <span key={s.phase} className="absolute inset-0 block" style={{ opacity, transform: `scale(${scale})` }}>
        {/* 무대 연출은 앞 화면이 걷히는 동안(350ms)에 이미 시작한다 */}
        <DemoMvpStage
          team={s.phase === "winner" ? team : loserTeam}
          nickname={s.phase === "winner" ? DEMO_MY_NAME : LOSER_MVP[team]}
          ms={since(s.at)}
        />
      </span>
    );
  };

  const onLightStage = stage && (step.phase === "winner" ? team : loserTeam) === "police";
  // 하단 안내 바 - 탭을 받을 수 있게 되면 나타나고, 넘기면 같은 시간 동안 사라진다
  const barOpacity = tapReady
    ? clamp01((ms - TAP_READY_MS) / BAR_FADE_MS)
    : prev && isStage(prev.phase)
      ? clamp01(1 - ms / BAR_FADE_MS)
      : 0;

  return (
    <button
      type="button"
      onClick={onTap}
      aria-disabled={!tapReady}
      className={`fixed inset-0 z-20 block overflow-hidden text-left ${tapReady ? "cursor-pointer" : "cursor-default"}`}
    >
      <span className="absolute inset-0 block bg-black/50" style={{ opacity: clamp01(since(introAt) / ENTER_MS) }} />
      {/* 앱의 AnimatedSwitcher - 앞 화면은 줄며 걷히고 새 화면이 커지며 들어온다 */}
      {switching && switchT < 1 && prev && renderLayer(prev, 1 - switchT, 1 - 0.08 * switchT)}
      {renderLayer(step, switchT, 0.92 + 0.08 * switchT)}
      {/* 하단 안내 바 (앱 시안 9085:21588 · 9085:21641, 화면 아래에서 37) */}
      <span
        className="absolute inset-x-[16px] flex items-center justify-center rounded-[12px]"
        style={{
          bottom: `${(37 / 852) * 100}%`,
          height: `${(47 / 852) * 100}%`,
          opacity: barOpacity,
          backgroundColor: onLightStage ? BAR_ON_LIGHT : BAR_ON_DARK,
        }}
      >
        <span
          className="text-center text-[14px] font-medium leading-[1.4] tracking-[-0.32px]"
          style={{ color: onLightStage ? appColors.black400 : appColors.black300 }}
        >
          {app.mvpTapContinue}
        </span>
      </span>
    </button>
  );
}
