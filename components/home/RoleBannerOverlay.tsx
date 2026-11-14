"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { appColors } from "@/lib/app-tokens";
import {
  Accented,
  SPEED_LINES,
  cubic,
  dropPose,
  interval,
  popPose,
  speedOutCurve,
  stripeEnterPose,
  stripeExitPose,
} from "@/lib/demo/start-motion";
import type { Messages } from "@/lib/i18n/messages";

// 홈 "두 팀, 서로 다른 전략"에서 팀 카드를 누르면 섹션 위로 펼쳐지는 역할 배너.
// 앱 4.0.1 게임 시작의 역할 배너(start_banners.dart)를 웹 폭에 맞게 옮겼다 - 흰(경찰)/검정(도둑)
// 사선 띠 7줄이 빨려 들어오고, 미션 제목과 "이번 판은 ○○이에요", 아래에서 튀어 오르는 캐릭터,
// 띠와 나란한 속도선까지 같은 움직임(lib/demo/start-motion)이다. 두 진영이 같은 연출을 받는다.
// 앱처럼 지금 보이는 화면 전체를 덮는다(섹션이 화면보다 길어도 누른 자리에서 다 보이게).
// 앱은 2.35초 머물지만 사이트에서는 화면을 가리는 시간이라 짧게 두고, 누르면 바로 빠진다.

type Team = "police" | "robber";

const ENTER_MS = 900;
const HOLD_MS = 1600;
const EXIT_MS = 700;
const BAND_ANGLE = -7;
const PURE_BLACK = "#000000";

export default function RoleBannerOverlay({
  team,
  copy,
  onDone,
}: {
  team: Team;
  copy: Messages["home"]["characters"]["banner"];
  onDone: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 1000, h: 600 });
  const [ms, setMs] = useState(0);
  const [exitAt, setExitAt] = useState(ENTER_MS + HOLD_MS);

  // 프레임 시계 - 화면 갱신이 멈춘 환경에서도 끝나게 느린 타이머를 같이 둔다
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = () => setMs(performance.now() - start);
    const loop = () => {
      tick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const fallback = window.setInterval(tick, 200);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(fallback);
    };
  }, []);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const done = ms >= exitAt + EXIT_MS;
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(onDone, 0);
    return () => window.clearTimeout(t);
  }, [done, onDone]);

  const police = team === "police";
  const band = police ? appColors.white : PURE_BLACK;
  const edge = police ? appColors.black100 : appColors.black800;
  const accent = police ? appColors.blue : appColors.green;
  const onBand = police ? appColors.black800 : appColors.white;
  const t = police ? copy.police : copy.robber;

  const enter = Math.min(1, ms / ENTER_MS);
  const exit = Math.min(1, Math.max(0, (ms - exitAt) / EXIT_MS));
  const leaving = ms >= exitAt;

  const backdrop = interval(enter, 0, 500 / 900) * (1 - interval(exit, 200 / 700, 620 / 700));
  const contentIn = interval(enter, 560 / 900, 1, cubic(0.22, 1, 0.36, 1));
  const contentOut = interval(exit, 0, 200 / 700, cubic(0.64, 0, 0.78, 0));
  const unit = Math.min(box.w, 1100) / 300;

  // 띠는 섹션보다 넓게, 높이는 섹션의 절반쯤
  const bandWidth = box.w * 1.4;
  const bandHeight = Math.min(Math.max(box.h * 0.5, 220), 400);
  const stripe = (i: number, color: string, offsetY = 0) => {
    const pose = leaving
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

  // 캐릭터 - 섹션 오른쪽 아래에서 튀어 올라 아래가 잘린다. 좁은 화면은 작게 둔다
  const narrow = box.w < 640;
  const charHeight = Math.min(box.h * (narrow ? 0.36 : 0.78), 560);
  const pose = exit > 0 ? dropPose(interval(exit, 0, 0.43)) : popPose(interval(enter, 0.33, 1));

  return (
    <div
      ref={boxRef}
      className="fixed inset-0 z-[70] cursor-pointer overflow-hidden"
      onClick={() => setExitAt((at) => Math.min(at, Math.max(ms, ENTER_MS)))}
      aria-hidden="true"
    >
      <div className="absolute inset-0" style={{ backgroundColor: appColors.black700, opacity: backdrop * 0.92 }} />

      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: bandWidth,
          height: bandHeight,
          transform: `translate(-50%, -50%) rotate(${BAND_ANGLE}deg)`,
        }}
      >
        <div className="absolute inset-0 flex flex-col">
          {Array.from({ length: 7 }, (_, i) => stripe(i, edge, 6 * unit))}
        </div>
        <div className="absolute inset-0 flex flex-col">
          {Array.from({ length: 7 }, (_, i) => stripe(i, band))}
        </div>
      </div>

      {/* 속도선 - 앱 시안 좌표(393x852)를 섹션 크기 비율로 옮긴다 */}
      {SPEED_LINES.map((line, i) => {
        const length = line.length * unit * 0.8;
        const drawn = interval(ms, line.start, line.end, cubic(0.3, 0, 0.2, 1));
        const drift = interval(ms, line.end, line.outAt);
        const out = Math.max(
          interval(ms, line.outAt, line.outAt + 360, speedOutCurve),
          interval(exit, 0, 0.4, speedOutCurve),
        );
        const travel = (drift - 0.5) * 18 * unit + out * (box.w + length);
        return (
          <div
            key={i}
            className="absolute flex"
            style={{
              left: (line.x / 393) * box.w - length / 2,
              top: box.h / 2 + ((line.y - 426) / 426) * (bandHeight * 0.95),
              width: length,
              height: 8 * unit,
              transform: `rotate(${BAND_ANGLE}deg)`,
              justifyContent: line.fromLeft ? "flex-start" : "flex-end",
            }}
          >
            <span
              className="block h-full rounded-full"
              style={{
                width: length * drawn,
                backgroundColor: band,
                transform: `translateX(${line.fromLeft ? travel : -travel}px)`,
              }}
            />
          </div>
        );
      })}

      <div
        className="absolute bottom-0"
        style={{
          right: narrow ? "-4%" : "6%",
          height: charHeight,
          transform: `translateY(${pose.y * charHeight}px) scale(${pose.sx}, ${pose.sy})`,
          transformOrigin: "50% 62.5%",
        }}
      >
        <Image
          src={`/demo/start_role_${team}.svg`}
          alt=""
          width={police ? 427 : 493}
          height={police ? 470 : 500}
          className="h-full w-auto max-w-none"
        />
      </div>

      {/* 글 - 띠와 함께 나타나고 사라지지만 기울지 않는다 */}
      <div
        className="absolute top-1/2"
        style={{
          left: narrow ? 24 : "8%",
          maxWidth: narrow ? "86%" : "58%",
          opacity: contentIn * (1 - contentOut),
          transform: `translate(${(-16 * (1 - contentIn) + 16 * contentOut) * unit}px, -55%)`,
        }}
      >
        <p className="text-sm font-medium sm:text-base" style={{ color: police ? appColors.black600 : appColors.black200 }}>
          {copy.label}
        </p>
        <div className="font-scdream mt-3 sm:mt-5" style={{ color: onBand }}>
          {t.title.split("\n").map((line, i) => (
            <p
              key={i}
              className="text-[clamp(30px,5.4vw,68px)] leading-[1.08] tracking-[-0.02em]"
              style={{ marginTop: i > 0 ? "0.32em" : 0 }}
            >
              <Accented text={line} accent={t.titleAccent} color={accent} />
            </p>
          ))}
        </div>
        <p className="mt-4 text-[clamp(18px,2.2vw,28px)] font-bold sm:mt-6" style={{ color: onBand }}>
          <Accented text={t.sentence} accent={t.role} color={accent} />
        </p>
      </div>
    </div>
  );
}
