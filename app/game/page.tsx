import type { Metadata } from "next";
import GameSections from "@/components/game/GameSections";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "경찰과 도둑 하는 법 - 규칙과 게임 소개",
  description:
    "경찰과 도둑(경도) 하는 법을 팀 나누기부터 감옥 탈출, 승리 조건까지 정리했어요. GPS와 실시간 지도가 진행을 맡는 위치 기반 술래잡기 앱도 함께 소개해요.",
  keywords: [
    "경찰과 도둑 게임",
    "경도 게임 방법",
    "경찰과 도둑 플레이",
    "GPS 술래잡기",
    "위치 기반 멀티플레이어",
    "발자국 추적 게임",
    "QR 체포",
    "구역 그리기",
    "팀 채팅 게임",
    "야외 모바일 게임",
    "공원 게임 앱",
    "친구와 할 게임",
  ],
  alternates: {
    canonical: "/game",
    languages: {
      ...alternateLanguages(SITE_URL, "/game"),
      "x-default": `${SITE_URL}/game`,
    },
  },
  openGraph: {
    title: "경찰과 도둑 하는 법 - 규칙과 게임 소개",
    description:
      "구역 그리기, 발자국 추적, QR 체포, 팀 채팅. 술래잡기에 필요한 모든 게 앱 하나에 담겨 있어요.",
    url: "/game",
    type: "article",
    locale: "ko_KR",
  },
};

export default function GamePage() {
  return <GameSections locale="ko" />;
}
