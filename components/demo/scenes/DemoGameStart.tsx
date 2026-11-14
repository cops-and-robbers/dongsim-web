"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { appColors } from "@/lib/app-tokens";
import {
  DEMO_POLICE_WAIT_SECONDS,
  DEMO_REVEAL_MINUTES,
  DEMO_ROBBER_RELEASE_SECONDS,
  DEMO_RULE_INTERVAL_MS,
} from "@/lib/demo/scenes";
import { useDemoCopy } from "../demo-copy";
import {
  Accented,
  SPEED_LINES,
  cubic,
  dropPose,
  easeInOut,
  interval,
  popPose,
  speedOutCurve,
  stripeEnterPose,
  stripeExitPose,
} from "@/lib/demo/start-motion";

// 게임 시작 흐름 (앱 4.0.1, FE #674 · #678 · #691).
//   ① 역할 배너(start_banners.dart, stripe_banner.dart) - 흰/검정 사선 띠, 미션 제목, 튀어 오르는 캐릭터
//   ② 경찰 대기 / ③ 도둑 설명(chase_scene.dart) - 역할 띠 자리에서 펼쳐지는 장면(band_transition.dart)
//   ④ 출동 카운팅(dispatch_countdown.dart) - 출동 6초 전에 화면을 덮고 5~1, "출동!" 뒤 원형으로 열린다
// 좌표는 앱 기준 393 폭 시안 값 그대로다(이 레이어는 AppScreen 이 393 폭으로 그린다).
// 띠 모양만 앱처럼 300 폭 목업 기준이라 [BAND_S] 를 곱한다.
// 데모에서 앱과 다르게 둔 것: 경찰 대기 시간을 몇 초로 줄였고, 사이렌 소리는 틀지 않는다
// (웹은 소리 자동 재생이 막히고 갑자기 울리면 놀란다).

type Team = "police" | "robber";

const W = 393;
const BAND_S = W / 300;
const PURE_BLACK = "#000000";

/** 마운트 뒤 흐른 시간(ms). 화면이 그려질 때마다 갱신한다. [running] 이 거짓이면 멈춘다 */
function useClock(running = true) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      setMs(now - start);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    // 화면 갱신이 멈춘 환경(가려진 창, 절전)에서도 장면이 넘어가게 느린 타이머를 같이 둔다
    const fallback = window.setInterval(() => setMs(performance.now() - start), 250);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(fallback);
    };
  }, [running]);
  return ms;
}

/** 지금 시각(ms, Date.now). [stepMs] 마다 갱신한다 */
function useNow(stepMs: number) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const t = window.setInterval(tick, stepMs);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [stepMs]);
  return now;
}

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduce(mq.matches);
    const first = window.setTimeout(update, 0);
    mq.addEventListener("change", update);
    return () => {
      window.clearTimeout(first);
      mq.removeEventListener("change", update);
    };
  }, []);
  return reduce;
}

/** fixed 레이어(=앱 화면)의 실제 세로 길이. 화면 가운데 기준 좌표에 쓴다 */
function useBoxHeight() {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(852);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setHeight(el.clientHeight || 852);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, height };
}

// ---------------------------------------------------------------- ① 역할 배너

const ROLE_ENTER_MS = 900;
const ROLE_HOLD_MS = 2350;
const ROLE_EXIT_MS = 700;
/** 첫 줄이 빠지기 시작할 때 다음 장면을 띠 자리로 비춘다 (StripeBanner.revealNextAfter) */
const REVEAL_NEXT_AFTER_MS = 120;
export const ROLE_BANNER_MS = ROLE_ENTER_MS + ROLE_HOLD_MS + ROLE_EXIT_MS;
const ROLE_REVEAL_AT_MS = ROLE_ENTER_MS + ROLE_HOLD_MS + REVEAL_NEXT_AFTER_MS;

const BAND_HEIGHT = 224.4;
const BAND_ANGLE = -9.5;
const BAND_OFFSET_Y = -48.1;

/** 데모의 출동 시각. 역할 배너가 끝난 뒤 경찰은 대기 장면만큼, 도둑은 설명과 지도에서 기다린다 */
export function demoReleaseAt(team: Team) {
  return (
    Date.now() +
    ROLE_BANNER_MS +
    (team === "police" ? DEMO_POLICE_WAIT_SECONDS : DEMO_ROBBER_RELEASE_SECONDS) * 1000
  );
}

function RoleBanner({ team, reduce }: { team: Team; reduce: boolean }) {
  const { app } = useDemoCopy();
  const ms = useClock();
  const { ref, height } = useBoxHeight();
  const police = team === "police";
  const band = police ? appColors.white : PURE_BLACK;
  const edge = police ? appColors.black100 : appColors.black800;
  const accent = police ? appColors.blue : appColors.green;
  const onBand = police ? appColors.black800 : appColors.white;

  // 움직임 줄이기면 짧게 나타났다 사라지기만 한다
  const enter = reduce ? Math.min(1, ms / 220) : Math.min(1, ms / ROLE_ENTER_MS);
  const exitStart = ROLE_ENTER_MS + ROLE_HOLD_MS;
  const exit = Math.min(1, Math.max(0, (ms - exitStart) / (reduce ? 200 : ROLE_EXIT_MS)));
  const leaving = ms >= exitStart;

  const backdrop = reduce
    ? enter * (1 - exit)
    : interval(enter, 0, 500 / 900) * (1 - interval(exit, 200 / 700, 620 / 700));
  const contentIn = interval(enter, 560 / 900, 1, cubic(0.22, 1, 0.36, 1));
  const contentOut = interval(exit, 0, 200 / 700, cubic(0.64, 0, 0.78, 0));
  const contentOpacity = reduce ? enter * (1 - exit) : contentIn * (1 - contentOut);
  const contentShift = reduce ? 0 : (-16 * (1 - contentIn) + 16 * contentOut) * BAND_S;

  const bandWidth = 390 * BAND_S;
  const stripe = (i: number, color: string, offsetY = 0) => {
    const pose = reduce
      ? { x: 0, sx: 1, sy: 1 }
      : leaving
        ? stripeExitPose(interval(exit, (120 + i * 40) / 700, (460 + i * 40) / 700))
        : stripeEnterPose(interval(enter, (i * 50) / 900, (380 + i * 50) / 900));
    return (
      <span
        key={`${color}-${i}`}
        className="block min-h-0 flex-1"
        style={{
          transform: `translate(${pose.x * bandWidth}px, ${offsetY}px) scale(${pose.sx}, ${pose.sy * 1.04})`,
          backgroundColor: color,
          clipPath: "polygon(3% 0, 100% 0, 97% 100%, 0 100%)",
        }}
      />
    );
  };

  const visibleHeight = police ? 317 : 305;
  const pose = reduce
    ? { y: 0, sx: 1, sy: 1 }
    : exit > 0
      ? dropPose(interval(exit, 0, 0.43))
      : popPose(interval(enter, 0.33, 1));
  const characterTop = Math.max(height - visibleHeight, height / 2 + (426 - visibleHeight));
  const centerY = height / 2;
  const title = (police ? app.startTitlePolice : app.startTitleRobber).split("\n");
  const titleAccent = police ? app.startTitlePoliceAccent : app.startTitleRobberAccent;
  const role = police ? app.roleCop : app.roleRobber;

  return (
    <div ref={ref} className="fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0" style={{ backgroundColor: appColors.black700, opacity: backdrop }} />

      {/* 사선 띠 - 가운데에서 위로 옮겨 기울인다. 아래로 두께 색이 살짝 비친다 */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: bandWidth,
          height: BAND_HEIGHT * BAND_S,
          transform: `translate(-50%, calc(-50% + ${BAND_OFFSET_Y * BAND_S}px)) rotate(${BAND_ANGLE}deg)`,
        }}
      >
        <div className="absolute inset-0 flex flex-col">
          {Array.from({ length: 7 }, (_, i) => stripe(i, edge, 6 * BAND_S))}
        </div>
        <div className="absolute inset-0 flex flex-col">
          {Array.from({ length: 7 }, (_, i) => stripe(i, band))}
        </div>
      </div>

      {/* 속도선 - 배너와 따로 자기 시간표로 그어지고 흐르다 빠진다 */}
      {!reduce &&
        SPEED_LINES.map((line, i) => {
          const drawn = interval(ms, line.start, line.end, cubic(0.3, 0, 0.2, 1));
          const drift = interval(ms, line.end, line.outAt);
          const out = Math.max(
            interval(ms, line.outAt, line.outAt + 360, speedOutCurve),
            interval(exit, 0, 0.4, speedOutCurve),
          );
          const travel = (drift - 0.5) * 18 + out * (W + line.length);
          return (
            <div
              key={i}
              className="absolute flex"
              style={{
                left: line.x - line.length / 2,
                top: centerY + (line.y - 9 - 426),
                width: line.length,
                height: 18,
                transform: `rotate(${BAND_ANGLE}deg)`,
                justifyContent: line.fromLeft ? "flex-start" : "flex-end",
              }}
            >
              <span
                className="block h-full rounded-full"
                style={{
                  width: line.length * drawn,
                  backgroundColor: band,
                  transform: `translateX(${line.fromLeft ? travel : -travel}px)`,
                }}
              />
            </div>
          );
        })}

      {/* 내 팀 캐릭터 - 아래에서 튀어 올라 오른쪽 아래가 잘린다 */}
      <div
        className="absolute"
        style={{
          left: police ? 29 : 23,
          top: characterTop,
          transform: `translateY(${pose.y * visibleHeight}px) scale(${pose.sx}, ${pose.sy})`,
          transformOrigin: "50% 62.5%",
        }}
      >
        <Image
          src={`/demo/start_role_${team}.svg`}
          alt=""
          width={police ? 427 : 493}
          height={police ? 470 : 500}
          style={{ width: police ? 427 : 493, height: "auto", maxWidth: "none" }}
          priority
        />
      </div>

      {/* 글 - 띠와 함께 나타나고 사라지지만 기울지 않는다 */}
      <div
        className="absolute"
        style={{
          left: 30,
          right: 20,
          top: centerY + (273 - 426),
          opacity: contentOpacity,
          transform: `translateX(${contentShift}px)`,
        }}
      >
        <p className="text-[16px] font-medium leading-none" style={{ color: police ? appColors.black600 : appColors.black200 }}>
          {app.startRoleLabel}
        </p>
        <div className="font-scdream mt-[22px]" style={{ marginLeft: -5, color: onBand }}>
          {title.map((line, i) => (
            <p
              key={i}
              className="whitespace-nowrap text-[45px] leading-none tracking-[-0.32px]"
              style={{ marginTop: i > 0 ? 18 : 0 }}
            >
              <Accented text={line} accent={titleAccent} color={accent} />
            </p>
          ))}
        </div>
        <p className="mt-[24px] text-[24px] font-bold leading-none" style={{ color: onBand }}>
          <Accented text={app.startRoleSentence(role)} accent={role} color={accent} />
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- ②③ 대기·설명 장면

const BAND_REVEAL_MS = 980;
const bandOpenCurve = cubic(0.7, 0, 0.25, 1);

/** 역할 띠 모양 → 화면 전체로 펼치는 clip-path (band_transition.dart _BandClipper) */
function bandClip(open: number, width: number, height: number) {
  const cx = width / 2;
  const cy = height / 2 + BAND_OFFSET_Y * BAND_S;
  const a = (BAND_ANGLE * Math.PI) / 180;
  const h = BAND_HEIGHT / 2;
  const band = (x: number, y: number) => [
    cx + (x * Math.cos(a) - y * Math.sin(a)) * BAND_S,
    cy + (x * Math.sin(a) + y * Math.cos(a)) * BAND_S,
  ];
  const from = [band(-195, -h), band(195, -h), band(195, h), band(-195, h)];
  const to = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ];
  const points = from.map(([fx, fy], i) => {
    const [tx, ty] = to[i];
    return `${fx + (tx - fx) * open}px ${fy + (ty - fy) * open}px`;
  });
  return `polygon(${points.join(", ")})`;
}

const mmss = (sec: number) =>
  `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

/** 바닥을 지나가는 경찰차 (police_car_drive.dart: 192x141, 7초에 한 번 가로지르며 통통 튄다) */
function PoliceCarDrive({ reduce }: { reduce: boolean }) {
  return (
    <div className="absolute inset-x-0 overflow-visible" style={{ bottom: 42, height: 144 }}>
      <span
        className={`absolute bottom-0 block ${reduce ? "" : "demo-car-drive"}`}
        style={{ left: reduce ? 184 : undefined }}
      >
        <span className={`block ${reduce ? "" : "demo-car-bounce"}`}>
          <Image src="/demo/icon_police_car.svg" alt="" width={192} height={141} />
        </span>
      </span>
    </div>
  );
}

function ChaseScene({
  team,
  releaseAt,
  onClose,
  reduce,
}: {
  team: Team;
  releaseAt: number;
  onClose?: () => void;
  reduce: boolean;
}) {
  const { app } = useDemoCopy();
  const police = team === "police";
  const now = useNow(250);
  const reveal = useClock(!reduce);
  const { ref, height } = useBoxHeight();
  const [missionOpen, setMissionOpen] = useState(false);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [openedAt] = useState(() => Date.now());

  const rules = police
    ? [app.startRuleQrArrest, app.startRulePing, app.startRuleRobberReveal(DEMO_REVEAL_MINUTES), app.startRuleZoneLock]
    : [app.startRuleQrCaught, app.startRuleMyReveal(DEMO_REVEAL_MINUTES), app.startRulePing, app.startRuleJailbreak];
  // 규칙을 펼쳐 읽는 동안은 넘기지 않는다
  const [pausedIndex, setPausedIndex] = useState<number | null>(null);
  const readClock = Math.max(0, (now || openedAt) - openedAt);
  const ruleIndex = pausedIndex ?? Math.floor(readClock / DEMO_RULE_INTERVAL_MS) % rules.length;

  const left = now ? Math.max(0, Math.ceil((releaseAt - now) / 1000)) : Math.ceil((releaseAt - openedAt) / 1000);
  const finalCount = left <= 10;
  const accent = police ? appColors.blue : appColors.green;
  const teamName = police ? appColors.blueVer2Rich : appColors.green800;
  const open = reduce ? 1 : interval(reveal, 380, BAND_REVEAL_MS, bandOpenCurve);

  const card = (
    icon: ReactNode,
    label: string,
    body: string,
    expanded: boolean,
    toggle: () => void,
    keyId?: string,
  ) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      className="flex w-full items-start gap-[6px] rounded-[16px] px-[16px] py-[18px] text-left shadow-[0_4px_16px_rgba(8,10,12,0.06)]"
      style={{ backgroundColor: police ? appColors.blueVer2_50 : appColors.black900 }}
    >
      <span className="mt-0 shrink-0">{icon}</span>
      <span key={keyId} className={`min-w-0 flex-1 ${keyId ? "demo-fade-in" : ""}`}>
        <span className="block text-[14px] leading-[1.4]" style={{ color: police ? appColors.black600 : appColors.black200 }}>
          {label}
        </span>
        <span
          className={`mt-[4px] block text-[14px] font-semibold leading-[1.16] ${expanded ? "" : "truncate"}`}
          style={{ color: police ? appColors.black : appColors.white }}
        >
          {body}
        </span>
      </span>
    </button>
  );

  return (
    <div
      ref={ref}
      role={onClose ? "button" : undefined}
      tabIndex={onClose ? 0 : undefined}
      onClick={onClose}
      className="fixed inset-0 z-30 overflow-hidden text-left"
      style={{
        backgroundColor: police ? appColors.blueVer2_50 : appColors.black900,
        clipPath: open < 1 ? bandClip(open, W, height) : undefined,
      }}
    >
      {/* 땅이 아래에 붙도록 아래 기준으로 채운다. 긴 화면은 하늘 위쪽이 잘린다 */}
      <Image
        src={`/demo/start_wait_${police ? "day" : "night"}.webp`}
        alt=""
        fill
        sizes="393px"
        className="object-cover object-bottom"
        priority
      />
      <PoliceCarDrive reduce={reduce} />

      <div className="absolute inset-x-0 bottom-0 overflow-y-auto" style={{ top: 118 }}>
        {/* 팀 이름 → 라벨 → 큰 숫자 → 한 줄 안내 */}
        <div className="flex h-[24px] items-center justify-center gap-[6px]">
          <span
            className="block size-[24px]"
            style={{
              backgroundColor: teamName,
              WebkitMask: `url(/demo/icon_role_${team}_${police ? "lightmode" : "darkmode"}.svg) center / contain no-repeat`,
              mask: `url(/demo/icon_role_${team}_${police ? "lightmode" : "darkmode"}.svg) center / contain no-repeat`,
            }}
          />
          <span className="text-[20px] font-bold leading-none" style={{ color: teamName }}>
            {police ? app.teamPolice : app.teamRobber}
          </span>
        </div>
        <p
          className="mt-[48px] flex h-[16px] items-center justify-center text-[16px] font-semibold"
          style={{ color: police ? appColors.black500 : appColors.black200 }}
        >
          {app.startWaitCountdownLabel}
        </p>
        <p className="mt-[14px] flex h-[80px] items-center justify-center">
          <span
            className="font-scdream text-[80px] leading-none tracking-[-0.32px] tabular-nums transition-transform duration-200"
            style={{ color: accent, transform: finalCount ? "scale(1.2)" : undefined }}
          >
            {mmss(left)}
          </span>
        </p>
        <p
          className="mt-[14px] text-center text-[18px] font-semibold"
          style={{ color: police ? appColors.black700 : appColors.white }}
        >
          {police ? app.startWaitPoliceTitle : app.startWaitRobberTitle}
        </p>

        <div className="mt-[50px] flex flex-col gap-[18px] px-[16px] pb-[60px]">
          {card(
            police ? (
              <Image src="/demo/icon_flag.svg" alt="" width={20} height={20} />
            ) : (
              // 도둑 깃발은 같은 그림의 색만 초록으로 바꾼다
              <span
                className="block size-[20px]"
                style={{
                  backgroundColor: appColors.green,
                  WebkitMask: "url(/demo/icon_flag.svg) center / contain no-repeat",
                  mask: "url(/demo/icon_flag.svg) center / contain no-repeat",
                }}
              />
            ),
            police ? app.startMissionPoliceLabel : app.startMissionRobberLabel,
            police ? app.startMissionPolice : app.startMissionRobber,
            missionOpen,
            () => setMissionOpen((v) => !v),
          )}
          {card(
            <Image src="/demo/icon_bulb.svg" alt="" width={20} height={20} />,
            app.startRulesCounter(ruleIndex + 1, rules.length),
            rules[ruleIndex],
            ruleOpen,
            () => {
              setRuleOpen((v) => !v);
              setPausedIndex((p) => (p === null ? ruleIndex : null));
            },
            String(ruleIndex),
          )}
        </div>
      </div>

      {/* 도둑 설명은 화면을 누르면 닫히고 지도로 간다. 경찰 대기는 출동 전까지 닫을 수 없다 */}
      {onClose && (
        <p
          className="absolute inset-x-[16px] text-center text-[14px] leading-[1.4]"
          style={{ bottom: 14, color: police ? appColors.black500 : appColors.black200 }}
        >
          {app.startExplainerTapHint}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- ④ 출동 카운팅

const COUNT_LEAD_MS = 5000;
const COVER_MS = 1000;
export const DISPATCH_OVERLAY_LEAD_MS = COUNT_LEAD_MS + COVER_MS;
const GO_HOLD_MS = 1200;
const IRIS_MS = 1000;
export const DISPATCH_DONE_AFTER_MS = GO_HOLD_MS + IRIS_MS;
const EFFECT_FROM_MS = 4000;

/** dispatchCountdownFrame (start_flow.dart) - 출동 시각과 지금 시각만으로 정한다 */
function dispatchFrame(releaseAt: number, now: number) {
  const remaining = releaseAt - now;
  if (remaining > 0) {
    const e = Math.min(1, Math.max(0, (EFFECT_FROM_MS - remaining) / EFFECT_FROM_MS));
    return {
      seconds: Math.ceil(remaining / 1000) as number | null,
      cover: Math.min(1, Math.max(0, (COUNT_LEAD_MS + COVER_MS - remaining) / COVER_MS)),
      intensity: e ** 1.6,
      iris: 0,
    };
  }
  return {
    seconds: null as number | null,
    cover: 1,
    intensity: 1,
    iris: Math.min(1, Math.max(0, (-remaining - GO_HOLD_MS) / IRIS_MS)),
  };
}

const SIREN_W = 185;
const SIREN_H = 229;
const GAP = 46;
const NUMBER_H = 80;
const PIVOT_FROM_SIREN_TOP = 152;

function DispatchCountdown({ releaseAt, reduce }: { releaseAt: number; reduce: boolean }) {
  const { app } = useDemoCopy();
  const clock = useClock();
  const { ref, height } = useBoxHeight();
  const [mountedAt] = useState(() => Date.now());
  const now = mountedAt + clock;
  const f = dispatchFrame(releaseAt, now);
  const intensity = reduce ? 0 : f.intensity;
  const covering = f.cover < 1;
  const remaining = releaseAt - now;
  const go = f.seconds === null;
  // 숫자가 바뀐 뒤 흐른 초 - 숫자 튀기기와 사이렌 번쩍임에 쓴다
  const sinceSecond = go ? -remaining / 1000 : (Math.ceil(remaining / 1000) * 1000 - remaining) / 1000;

  // 빛줄기 각도 - 세질수록 빨리 돈다(초당 80° → 840°). 세기 곡선(e^1.6)을 그대로 적분한다
  const tau = (EFFECT_FROM_MS - remaining) / 1000;
  const boosted = tau <= 0 ? 0 : tau <= 4 ? (4 * (tau / 4) ** 2.6) / 2.6 : 4 / 2.6 + (tau - 4);
  const angle = (clock / 1000) * 80 + 760 * boosted;

  const groupTop = (height - (SIREN_H + GAP + NUMBER_H)) / 2;
  const pivot = { x: W / 2, y: groupTop + PIVOT_FROM_SIREN_TOP };
  const pop = reduce ? 1 : 1 + 0.2 * Math.max(0, 1 - sinceSecond / 0.25);
  const flare = Math.max(0, 1 - sinceSecond / (go ? 0.3 : 0.45));
  const glow = intensity > 0 ? (4 + 62 * intensity) * (0.6 + 0.4 * flare) : 0;
  let shake = { x: 0, y: 0 };
  if (!reduce && f.seconds === 1) {
    const a = 3 * (1 - Math.min(1, sinceSecond) * 0.5);
    // 프레임마다 다른 값이 필요해 시각에서 흔들림을 만든다(Math.random 대신 결정적인 값)
    shake = { x: Math.sin(clock * 0.9) * a, y: Math.cos(clock * 1.3) * a };
  }

  const farthest = Math.max(
    ...[
      [0, 0],
      [W, 0],
      [0, height],
      [W, height],
    ].map(([x, y]) => Math.hypot(x - pivot.x, y - pivot.y)),
  );
  let mask: string | undefined;
  if (!reduce && covering) {
    const r = (1 - easeInOut(f.cover)) * farthest;
    mask = `radial-gradient(circle at ${pivot.x}px ${pivot.y}px, transparent ${r}px, #000 ${r + 0.5}px)`;
  } else if (!reduce && f.iris > 0) {
    const r = easeInOut(f.iris) * farthest;
    mask = `radial-gradient(circle at ${pivot.x}px ${pivot.y}px, transparent ${r}px, #000 ${r + 0.5}px)`;
  }

  // 빛줄기 방향 쪽 화면을 그 색으로 물들인다
  const toward = ((angle - 90) * Math.PI) / 180;
  const redAt = { x: 50 + 60 * Math.cos(toward), y: 47 + 60 * Math.sin(toward) };
  const blueAt = { x: 100 - redAt.x, y: 94 - redAt.y };
  const tint = 0.5 * intensity * intensity;
  const sirenMask = "url(/demo/icon_siren_counting.svg) center / contain no-repeat";
  const spread = Math.min(1, Math.max(0, (intensity - 0.25) / 0.6));
  const beams = (widthDeg: number, alpha: number) => {
    const w = widthDeg;
    const red = `rgba(255,59,48,${alpha})`;
    const blue = `rgba(34,100,255,${alpha})`;
    return `conic-gradient(from ${angle}deg at ${pivot.x}px ${pivot.y}px, transparent 0deg, ${red} ${w / 2}deg, transparent ${w}deg, transparent 180deg, ${blue} ${180 + w / 2}deg, transparent ${180 + w}deg, transparent 360deg)`;
  };
  const beamMask = `radial-gradient(circle at ${pivot.x}px ${pivot.y}px, #000 6%, rgba(0,0,0,0.85) 30%, transparent 70%)`;

  const layer: CSSProperties = mask ? { WebkitMaskImage: mask, maskImage: mask } : {};

  return (
    <div
      ref={ref}
      className={`fixed inset-0 z-50 overflow-hidden ${f.iris > 0 ? "pointer-events-none" : ""}`}
      style={layer}
      aria-live="assertive"
    >
      <div className="absolute inset-0" style={{ backgroundColor: PURE_BLACK }} />
      {intensity > 0 && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at ${redAt.x}% ${redAt.y}%, rgba(255,59,48,${tint}), transparent 60%), radial-gradient(circle at ${blueAt.x}% ${blueAt.y}%, rgba(34,100,255,${tint}), transparent 60%)`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: [beams(26, 0.18 + 0.82 * intensity), spread > 0 ? beams(70, 0.55 * spread) : null]
                .filter(Boolean)
                .join(", "),
              WebkitMaskImage: beamMask,
              maskImage: beamMask,
            }}
          />
        </>
      )}
      <div className="absolute inset-0" style={{ transform: `translate(${shake.x}px, ${shake.y}px)` }}>
        {glow > 0 && (
          <span
            className="absolute block"
            style={{
              left: (W - SIREN_W) / 2,
              top: groupTop,
              width: SIREN_W,
              height: SIREN_H,
              backgroundColor: appColors.red,
              WebkitMask: sirenMask,
              mask: sirenMask,
              filter: `blur(${glow / 2}px)`,
            }}
          />
        )}
        <Image
          src="/demo/icon_siren_counting.svg"
          alt=""
          width={SIREN_W}
          height={SIREN_H}
          className="absolute"
          style={{ left: (W - SIREN_W) / 2, top: groupTop }}
          priority
        />
        <div
          className="absolute flex items-center justify-center"
          style={{ left: 16, right: 16, top: groupTop + SIREN_H + GAP, height: NUMBER_H }}
        >
          <span
            className="font-scdream whitespace-nowrap text-[80px] leading-none tracking-[-0.32px] text-white"
            style={{ transform: `scale(${pop})` }}
          >
            {go ? app.dispatchGo : covering ? "" : f.seconds}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 흐름

// 게임 시작 흐름 (game_page.dart). [releaseAt] 은 경찰 출동 시각(ms) - 지도의 카운트다운과 같은 값이다.
// 역할 배너 → (경찰) 대기 장면 / (도둑) 설명 장면 → 출동 6초 전 카운팅이 덮고, "출동!" 뒤 원형으로 열린다.
// 경찰은 카운팅이 열리기 시작할 때, 도둑은 설명을 닫을 때(또는 카운팅이 열릴 때) [onStarted] 로 알린다.
export function DemoGameStart({
  team,
  releaseAt,
  onStarted,
}: {
  team: Team;
  releaseAt: number;
  onStarted: () => void;
}) {
  const reduce = useReducedMotion();
  const [finished, setFinished] = useState(false);
  const ms = useClock(!finished);
  const [mountedAt] = useState(() => Date.now());
  const [sceneClosed, setSceneClosed] = useState(false);
  const startedRef = useRef(false);
  const now = mountedAt + ms;

  const roleOn = ms < ROLE_BANNER_MS;
  const sceneShown = ms >= ROLE_REVEAL_AT_MS;
  const overlayOn = now >= releaseAt - DISPATCH_OVERLAY_LEAD_MS && now < releaseAt + DISPATCH_DONE_AFTER_MS;
  const irisStarted = now >= releaseAt + GO_HOLD_MS;
  // 장면은 카운팅이 열리기 시작하면 걷는다 - 그 아래는 지도다
  const sceneOn = sceneShown && !sceneClosed && !irisStarted;

  useEffect(() => {
    if (startedRef.current) return;
    if (irisStarted || (team === "robber" && sceneClosed)) {
      startedRef.current = true;
      onStarted();
    }
  }, [irisStarted, sceneClosed, team, onStarted]);

  const done = now >= releaseAt + DISPATCH_DONE_AFTER_MS && !sceneOn && !roleOn;
  // 다 끝나면 프레임 시계를 멈춘다
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => setFinished(true), 0);
    return () => window.clearTimeout(t);
  }, [done]);
  if (done || finished) return null;

  return (
    <>
      {sceneOn && (
        <ChaseScene
          team={team}
          releaseAt={releaseAt}
          reduce={reduce}
          onClose={team === "robber" ? () => setSceneClosed(true) : undefined}
        />
      )}
      {roleOn && <RoleBanner team={team} reduce={reduce} />}
      {overlayOn && <DispatchCountdown releaseAt={releaseAt} reduce={reduce} />}
    </>
  );
}
