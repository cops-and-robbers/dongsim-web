"use client";

import Image from "next/image";
import { ReactNode, useId } from "react";
import { appColors } from "@/lib/app-tokens";
import { useDemoCopy } from "../demo-copy";

type Team = "police" | "robber";

// 앱 시안 393x852 기준. 세로 위치는 앱의 .h 처럼 화면 높이 비율로 맞춘다.
const DESIGN_W = 393;
const DESIGN_H = 852;

// 연출 시간표(ms) - game_over_intro_modal.dart _MvpStage 그대로
export const MVP_SWEEP_START_MS = 300;
export const MVP_SWEEP_END_MS = 2000;
export const MVP_POP_AT_MS = 2050;
const POP_MS = 750;
const LIT_MS = 250;
const TOTAL_MS = MVP_POP_AT_MS + POP_MS;
// 색종이 (mvp_confetti.dart)
const CONFETTI_MS = 3600;
/** 이 시간이 지나면 무대 화면은 더 움직이지 않는다 */
export const MVP_STAGE_SETTLED_MS = MVP_POP_AT_MS + CONFETTI_MS;

// 두 팀 시안이 몇 px씩 달라(무대 247/253) 앱은 가운데 값을 쓴다
const TITLE_TOP = 118;
const LABEL_TOP = 213;
const GLOW_TOP = 250;
const GLOW_SIZE = 330;
const CHARACTER_TOP = 315;
const NICKNAME_TOP = 572;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const topPct = (y: number) => `${(y / DESIGN_H) * 100}%`;

// 발끝 기준 쫀득한 등장 - 납작하게 눌렸다(넓고 낮게) 쭉 늘어나고 출렁이며 자리 잡는다
function squash(p: number) {
  if (p <= 0) return { sx: 0, sy: 0, dy: 0 };
  const grow = 1 - Math.pow(1 - clamp01(p / 0.22), 3);
  const wobble = -0.38 * Math.exp(-4.2 * p) * Math.cos(15 * p);
  const hopT = clamp01(p / 0.45);
  const hop = -38 * Math.sin(Math.PI * hopT) * (1 - hopT);
  return { sx: grow * (1 - wobble * 0.75), sy: grow * (1 + wobble), dy: hop };
}

// ---------- 천장 조명 (mvp_spotlight.dart MvpSpotlightPainter) ----------

const CENTER_X = 196;
const SOURCE_Y = -90;
const FLOOR_Y = 600;
const SOURCE_HALF = 24;
// 바닥 x 경로 - 왼쪽 → 오른쪽 → 왼쪽 조금 → 가운데를 살짝 지나쳤다 돌아온다
const PATH: [number, number][] = [
  [0, 30],
  [0.35, 350],
  [0.68, 110],
  [0.88, 212],
  [1, CENTER_X],
];

function floorX(p: number) {
  for (let i = 1; i < PATH.length; i++) {
    const [p0, x0] = PATH[i - 1];
    const [p1, x1] = PATH[i];
    if (p <= p1) {
      const t = clamp01((p - p0) / (p1 - p0));
      return x0 + (x1 - x0) * (t * t * (3 - 2 * t));
    }
  }
  return CENTER_X;
}

// 화면 위 바깥의 조명이 고개를 돌리듯 바닥을 훑다가 가운데에 멈춘다. 가운데에서 멀수록
// 바닥의 빛 웅덩이가 넓고 조금 높게(멀리) 보여 원근이 생긴다. 조명 밖은 어둡게 덮는다.
function Spotlight({
  darkness,
  sweep,
  beamOn,
  beamStrength,
}: {
  darkness: number;
  sweep: number;
  beamOn: number;
  beamStrength: number;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  if (darkness <= 0) return null;

  const px = floorX(sweep);
  const d = Math.abs(px - CENTER_X);
  const cy = FLOOR_Y - d * 0.12;
  const rx = 135 + d * 0.28;
  const ry = 30 + d * 0.06;
  // 조명 머리도 웅덩이 쪽으로 조금 기운다
  const srcX = CENTER_X + (px - CENTER_X) * 0.18;
  const cone =
    `M ${srcX - SOURCE_HALF} ${SOURCE_Y} L ${srcX + SOURCE_HALF} ${SOURCE_Y} ` +
    `L ${px + rx} ${cy} A ${rx} ${ry} 0 0 1 ${px - rx} ${cy} Z`;
  const beam = beamOn * darkness * beamStrength;
  const blur = (id: string, sigma: number) => (
    <filter id={`${uid}${id}`} filterUnits="userSpaceOnUse" x={-200} y={-300} width={DESIGN_W + 400} height={DESIGN_H + 600}>
      <feGaussianBlur stdDeviation={sigma} />
    </filter>
  );

  return (
    <svg
      viewBox={`0 0 ${DESIGN_W} ${DESIGN_H}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        {blur("b14", 14)}
        {blur("b8", 8)}
        {blur("b10", 10)}
        {/* 어둠을 깔고 조명 자리만 흐리게 뚫는다 (앱의 saveLayer + dstOut) */}
        <mask id={`${uid}m`} maskUnits="userSpaceOnUse" x={0} y={0} width={DESIGN_W} height={DESIGN_H}>
          <rect width={DESIGN_W} height={DESIGN_H} fill="white" />
          <path d={cone} fill="black" fillOpacity={0.92 * beamOn} filter={`url(#${uid}b14)`} />
        </mask>
        <linearGradient id={`${uid}g`} gradientUnits="userSpaceOnUse" x1={0} y1={SOURCE_Y} x2={0} y2={cy}>
          <stop offset={0} stopColor={appColors.white} stopOpacity={0.5 * beam} />
          <stop offset={0.75} stopColor={appColors.white} stopOpacity={0.08 * beam} />
          <stop offset={1} stopColor={appColors.white} stopOpacity={0.16 * beam} />
        </linearGradient>
      </defs>
      <rect
        width={DESIGN_W}
        height={DESIGN_H}
        fill={appColors.black}
        fillOpacity={0.95 * darkness}
        mask={`url(#${uid}m)`}
      />
      {/* 빛줄기(위가 밝고 아래로 옅어짐)와 바닥 웅덩이 */}
      {beam > 0 && (
        <>
          <path d={cone} fill={`url(#${uid}g)`} filter={`url(#${uid}b8)`} style={{ mixBlendMode: "plus-lighter" }} />
          <ellipse
            cx={px}
            cy={cy}
            rx={rx}
            ry={ry}
            fill={appColors.white}
            fillOpacity={0.22 * beam}
            filter={`url(#${uid}b10)`}
            style={{ mixBlendMode: "plus-lighter" }}
          />
        </>
      )}
    </svg>
  );
}

// ---------- 색종이 (mvp_confetti.dart MvpConfetti) ----------

const PER_SIDE = 16;
const MARGIN = 24;
const SHAPES = [1, 2, 3, 4, 5, 6].map((n) => `/demo/mvp_confetti_${n}.svg`);
const SHAPE_SIZE: [number, number][] = [
  [31, 21],
  [27, 43],
  [30, 29],
  [35, 29],
  [38, 37],
  [32.515, 31.2144],
];

type Piece = {
  fromLeft: boolean;
  shape: number;
  lane: number;
  vy: number;
  y0: number;
  drag: number;
  vt: number;
  swayA: number;
  swayW: number;
  phase: number;
  flipW: number;
  spin: number;
  angle0: number;
  scale: number;
  delay: number;
};

// 고정 시드 난수 - 매번 같은 모양으로 터진다 (앱은 Random(679))
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 조각마다 화면 폭을 나눈 칸을 하나씩 받아 그 칸으로 퍼진 뒤 살랑이며 떨어진다
const PIECES: Piece[] = (() => {
  const r = seeded(679);
  const n = PER_SIDE * 2;
  const laneW = (DESIGN_W - MARGIN * 2) / n;
  // 솟는 높이를 n단계로 나눠 섞는다 - 같은 높이에 몰려 한 줄로 떨어지지 않게
  const heights = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [heights[i], heights[j]] = [heights[j], heights[i]];
  }
  return heights.map((h, i) => {
    const lane = (MARGIN + laneW * (i + 0.5 + (r() - 0.5) * 0.6)) / DESIGN_W;
    const vy = -(0.45 + (0.9 * (h + r())) / n);
    return {
      // 왼쪽 조각은 짝수 칸, 오른쪽 조각은 홀수 칸 - 엇갈려 지나가며 전체를 채운다
      fromLeft: i % 2 === 0,
      shape: i % SHAPES.length,
      lane,
      vy,
      y0: 0.42 + r() * 0.12,
      drag: 2 + r() * 1.2,
      // 떨어지는 끝속도(화면 높이/초). 앱 시안 검토에서 1.5배로 확정
      vt: (0.07 + r() * 0.06) * 1.5,
      swayA: 6 + r() * 12,
      swayW: 3 + r() * 3,
      phase: r() * Math.PI * 2,
      flipW: 5 + r() * 6,
      spin: (r() - 0.5) * 3,
      angle0: r() * Math.PI * 2,
      scale: 0.75 + r() * 0.5,
      delay: r() * 0.18,
    };
  });
})();

function Confetti({ ms }: { ms: number }) {
  if (ms < 0 || ms >= CONFETTI_MS) return null;
  const elapsed = ms / 1000;
  const total = CONFETTI_MS / 1000;
  const opacity = clamp01((total - elapsed) / 0.8);
  return (
    <span className="pointer-events-none absolute inset-0 block" aria-hidden>
      {PIECES.map((p, i) => {
        const k = elapsed - p.delay;
        if (k <= 0) return null;
        // 터지는 힘이 사라지는 정도 - 공기 저항으로 금방 1에 가까워진다
        const slow = 1 - Math.exp(-p.drag * k);
        const reach = 1 - Math.exp(-p.drag * 1.4 * k);
        const startX = p.fromLeft ? 0 : DESIGN_W;
        const x = startX + (p.lane * DESIGN_W - startX) * reach + p.swayA * Math.sin(p.swayW * k + p.phase) * slow;
        const y = p.y0 + ((p.vy - p.vt) / p.drag) * slow + p.vt * k;
        // 종이가 뒤집히는 느낌 - 세로가 납작해졌다 펴진다
        const flip = Math.cos(p.flipW * k + p.phase);
        const [w, h] = SHAPE_SIZE[p.shape];
        return (
          <Image
            key={i}
            src={SHAPES[p.shape]}
            alt=""
            width={w}
            height={h}
            unoptimized
            className="absolute max-w-none"
            style={{
              left: x,
              top: `${y * 100}%`,
              width: w,
              height: h,
              opacity,
              transform: `translate(-50%, -50%) rotate(${p.angle0 + p.spin * k}rad) scale(${p.scale}, ${p.scale * flip})`,
            }}
          />
        );
      })}
    </span>
  );
}

// ---------- 무대 ----------

function At({ top, children }: { top: number; children: ReactNode }) {
  return (
    <span className="absolute inset-x-0 flex justify-center" style={{ top: topPct(top) }}>
      {children}
    </span>
  );
}

// 무대형 MVP 화면 (game_over_intro_modal.dart _MvpStage, 앱 시안 도둑 9085:21586 · 경찰 9085:21639).
// 배경은 보는 사람이 아니라 MVP의 팀을 따른다. 어두운 빈 무대를 천장 조명이 훑다가
// 가운데에 멈추면, 조명이 꺼지며 캐릭터가 납작하게 눌렸다 쭉 늘어나며 튀어나오고
// 무대(빛 원·글자)가 켜지며 양옆에서 색종이가 터진다.
// [ms] 는 이 화면이 나온 뒤 지난 시간이다. 부모가 프레임마다 넘기고, 움직임 줄이기면
// 충분히 큰 값을 넘겨 최종 상태를 바로 그린다.
export function DemoMvpStage({ team, nickname, ms }: { team: Team; nickname: string; ms: number }) {
  const { app } = useDemoCopy();
  const police = team === "police";
  const t = Math.min(ms, TOTAL_MS);
  const sinceLit = t - MVP_POP_AT_MS;
  const lit = clamp01(sinceLit / LIT_MS);
  const sq = squash(sinceLit / POP_MS);

  return (
    <span
      className="absolute inset-0 block overflow-hidden"
      style={{ backgroundColor: police ? appColors.white : appColors.black }}
    >
      {/* 무대(빛 원 → 색종이 → 글자 순) - 조명이 꺼지는 순간 켜진다 */}
      <At top={GLOW_TOP}>
        <Image
          src={`/demo/mvp_glow_${team}.svg`}
          alt=""
          width={GLOW_SIZE}
          height={GLOW_SIZE}
          unoptimized
          className="max-w-none"
          style={{ width: GLOW_SIZE, height: GLOW_SIZE, opacity: lit }}
        />
      </At>
      {/* 색종이는 빛 원 위, 글자·캐릭터 뒤 - 캐릭터가 나오는 순간 터진다 */}
      <Confetti ms={ms - MVP_POP_AT_MS} />
      <span className="absolute inset-0 block" style={{ opacity: lit }}>
        <At top={TITLE_TOP}>
          <span
            className="text-[18px] font-semibold leading-none tracking-[-0.32px]"
            style={{ color: appColors.black400 }}
          >
            {app.mvpTitle}
          </span>
        </At>
        <At top={LABEL_TOP}>
          <span
            className="rounded-full px-[18px] py-[6px] text-[18px] font-semibold leading-none tracking-[-0.32px]"
            style={
              police
                ? { backgroundColor: appColors.blue, color: appColors.white }
                : { backgroundColor: appColors.green, color: appColors.black }
            }
          >
            {police ? app.mvpPolice : app.mvpRobber}
          </span>
        </At>
        {/* 닉네임과 부제는 한 묶음 (시안 간격 12) */}
        <At top={NICKNAME_TOP}>
          <span className="flex max-w-full flex-col items-center">
            <span className="flex max-w-full items-center gap-[6px]">
              <Image
                src={police ? "/demo/icon_role_police_lightmode.svg" : "/demo/icon_role_robber_darkmode.svg"}
                alt=""
                width={24}
                height={24}
                unoptimized
                className="shrink-0"
              />
              <span
                className="truncate text-[24px] font-semibold leading-none tracking-[-0.32px]"
                style={{ color: police ? appColors.black : appColors.white }}
              >
                {nickname}
              </span>
            </span>
            <span
              className="mt-[12px] text-[16px] font-medium leading-none tracking-[-0.32px]"
              style={{ color: police ? appColors.black600 : appColors.black300 }}
            >
              {police ? app.mvpPoliceSubtitle : app.mvpRobberSubtitle}
            </span>
          </span>
        </At>
      </span>
      <At top={CHARACTER_TOP}>
        {/* 폭은 에셋 원래 크기(도둑 239 · 경찰 217) */}
        <Image
          src={`/demo/mvp_${team}.svg`}
          alt=""
          width={police ? 217 : 239}
          height={police ? 223 : 218}
          unoptimized
          className="max-w-none origin-bottom"
          style={{
            width: police ? 217 : 239,
            height: police ? 223 : 218,
            transform: `translateY(${sq.dy}px) scale(${sq.sx}, ${sq.sy})`,
          }}
        />
      </At>
      <Spotlight
        darkness={1 - lit}
        sweep={clamp01((t - MVP_SWEEP_START_MS) / (MVP_SWEEP_END_MS - MVP_SWEEP_START_MS))}
        beamOn={clamp01((t - MVP_SWEEP_START_MS) / 150)}
        // 흰 무대(경찰)는 빛이 하얗게 날아가지 않게 낮춘다
        beamStrength={police ? 0.45 : 1}
      />
    </span>
  );
}
