"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { appColors } from "@/lib/app-tokens";
import { DEMO_MY_NAME } from "@/lib/demo/scenes";
import { useDemoCopy } from "../demo-copy";

type Team = "police" | "robber";

const OVER_MS = 1400;
const TEASE_MS = 1300;
// 진 팀 MVP. 대기실과 참가자 목록의 그 사람들이다
const LOSER_MVP: Record<Team, string> = { police: "잽싼그림자7215", robber: "든든한보안관3402" };

// 게임 종료 인트로 (game_over_intro_modal.dart). 종료 카드를 잠깐 보여 주고, 흔들리는
// "MVP는 누굴까?!" 뒤에 진 팀 MVP, 이긴 팀 MVP 순으로 공개한다. 공개는 탭으로 넘긴다.
// [team] 은 내 팀이고 데모에서는 항상 이긴 쪽이라 이긴 팀 MVP 는 나다.
export function DemoGameOver({ team, onDone }: { team: Team; onDone: () => void }) {
  const { app } = useDemoCopy();
  const dark = team === "robber";
  const accent = dark ? appColors.green : appColors.blue;
  const [phase, setPhase] = useState<"over" | "tease" | "loser" | "winner">("over");

  useEffect(() => {
    if (phase === "over") {
      const t = window.setTimeout(() => setPhase("tease"), OVER_MS);
      return () => window.clearTimeout(t);
    }
    if (phase === "tease") {
      const t = window.setTimeout(() => setPhase("loser"), TEASE_MS);
      return () => window.clearTimeout(t);
    }
  }, [phase]);

  if (phase === "over" || phase === "tease") {
    return (
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-[36px]">
        <div
          className={`flex w-full flex-col items-center rounded-[24px] px-[16px] py-[42px] text-center ${phase === "tease" ? "demo-gameover-shake" : "demo-rise-fade"}`}
          style={{ backgroundColor: dark ? appColors.black : appColors.white }}
        >
          {phase === "over" ? (
            <>
              <p
                className={`text-[20px] font-semibold ${dark ? "font-moneygraphy" : ""}`}
                style={{ color: dark ? appColors.green : appColors.black }}
              >
                {app.gameOverTitle}
              </p>
              <p className="mt-[8px] text-[14px]" style={{ color: dark ? appColors.black400 : appColors.black600 }}>
                {dark ? app.gameOverTimeUp : app.gameOverAllArrested}
              </p>
            </>
          ) : (
            <p className="text-[28px] font-semibold" style={{ color: accent }}>
              {app.mvpTease}
            </p>
          )}
        </div>
      </div>
    );
  }

  const shown: Team = phase === "winner" ? team : team === "police" ? "robber" : "police";
  return (
    <button
      type="button"
      onClick={() => (phase === "loser" ? setPhase("winner") : onDone())}
      className="fixed inset-0 z-20 flex flex-col items-center justify-center"
      style={{ backgroundColor: dark ? appColors.black : appColors.blueVer2_50 }}
    >
      <span key={phase} className="demo-fade-in flex flex-col items-center">
        <span
          className="rounded-full px-[14px] py-[6px] text-[16px]"
          style={
            shown === "police"
              ? { backgroundColor: appColors.blue, color: appColors.white }
              : { backgroundColor: appColors.green, color: appColors.black }
          }
        >
          {shown === "police" ? app.mvpPolice : app.mvpRobber}
        </span>
        <Image
          src={`/demo/mvp_${shown}.svg`}
          alt=""
          width={220}
          height={220}
          className="demo-pop mt-[24px]"
          style={{ height: "auto" }}
        />
        <span className="mt-[24px] text-[28px] font-semibold" style={{ color: dark ? appColors.white : appColors.black }}>
          {phase === "winner" ? DEMO_MY_NAME : LOSER_MVP[team]}
        </span>
      </span>
      <span
        className="demo-fade-in absolute bottom-[56px] text-[12px]"
        style={{ color: appColors.black400, animationDelay: "1s" }}
      >
        {app.mvpTapContinue}
      </span>
    </button>
  );
}
