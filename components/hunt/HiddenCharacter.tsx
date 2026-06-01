"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { useHunt } from "./context";

type Pose = "peek" | "run";

type Props = {
  /** 고유 식별자 */
  id: string;
  /** peek=기본 정면(얼굴만 빼꼼), run=달리는 포즈 */
  pose?: Pose;
  /** 좌우 반전 */
  flip?: boolean;
  /** 위치·창 크기(부모는 relative). 예: "right-[6%] top-0 h-11 w-14 -translate-y-1/2" */
  className?: string;
};

// 에셋별 원본 비율(왜곡 방지). 창(window)이 세로를 잘라 얼굴만 보이게 한다.
const ASSET: Record<string, { src: string; w: number; h: number }> = {
  "robber-peek": { src: "/characters/robber.svg", w: 160, h: 145 },
  "police-peek": { src: "/characters/police.svg", w: 180, h: 200 },
  "robber-run": { src: "/characters/robber-flee.svg", w: 144, h: 164 },
  "police-run": { src: "/characters/police-chase.svg", w: 158, h: 202 },
};

/**
 * 팀 소개(/team) 페이지에 숨어 얼굴만 빼꼼 내미는 상대 팀 캐릭터.
 * - /team 에서만 활성화된다.
 * - 부모 요소는 position:relative 여야 한다.
 * - 버튼 자체가 overflow-hidden 창이라, 안의 캐릭터는 윗부분(머리·얼굴)만 보인다.
 */
export default function HiddenCharacter({
  id,
  pose = "peek",
  flip = false,
  className = "",
}: Props) {
  const pathname = usePathname();
  const onTeamPage = pathname === "/team";
  const { team } = useTheme();
  const { register, unregister, capture, isCaught, status } = useHunt();

  useEffect(() => {
    if (!onTeamPage) return;
    register(id);
    return () => unregister(id);
  }, [id, onTeamPage, register, unregister]);

  if (!onTeamPage || status === "won" || status === "lost") return null;

  const caught = isCaught(id);
  // 경찰이면 도둑(생쥐)을, 도둑이면 경찰(고양이)을 쫓는다.
  const huntTeam = team === "police" ? "robber" : "police";
  const asset = ASSET[`${huntTeam}-${pose}`];

  return (
    <button
      type="button"
      onClick={() => capture(id)}
      aria-label="숨은 캐릭터 잡기"
      aria-pressed={caught}
      className={`absolute z-20 block overflow-hidden drop-shadow-sm ${caught ? "pointer-events-none" : "cursor-pointer hover:animate-[hunt-twitch_0.4s_ease-in-out]"} ${className}`}
    >
      <Image
        src={asset.src}
        alt=""
        width={asset.w}
        height={asset.h}
        unoptimized
        aria-hidden="true"
        className={`h-auto w-full origin-top transition-all duration-300 ease-out ${flip ? "-scale-x-100" : ""} ${
          caught ? "scale-50 opacity-0" : ""
        }`}
      />
    </button>
  );
}
