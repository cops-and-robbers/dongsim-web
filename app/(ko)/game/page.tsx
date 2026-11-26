import type { Metadata } from "next";
import GameSections from "@/components/game/GameSections";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "경찰과 도둑 하는 법 - 규칙과 게임 소개",
  description:
    "경찰과 도둑(경도) 하는 법을 팀 나누기와 감옥 탈출, 승리 조건 순서로 정리했어요. 좁아지는 구역과 발자국, QR 체포 같은 앱 기능도 실제 화면으로 보여 줘요.",
  keywords: [
    "경찰과 도둑 게임",
    "경도 게임 방법",
    "경찰과 도둑 플레이",
    "GPS 술래잡기",
    "위치 기반 멀티플레이어",
    "발자국 추적 게임",
    "QR 체포",
    "구역 그리기",
    "구역 축소",
    "팀 MVP",
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
      "어릴 때 하던 경찰과 도둑 그대로 뛰면 되고, 판단은 앱이 도와줘요.",
    url: "/game",
    type: "article",
    locale: "ko_KR",
  },
};

export default function GamePage() {
  return <GameSections locale="ko" />;
}
