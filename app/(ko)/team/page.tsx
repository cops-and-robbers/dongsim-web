import type { Metadata } from "next";
import TeamSections from "@/components/team/TeamSections";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "동심지키미 팀 소개",
  description:
    "동심지키미 - 게임으로 사람과 사람을 연결하는 팀. 위치 기반 오프라인 게임 ‘경찰과 도둑’을 기획·개발하며, 연혁과 수상·선정 이력을 소개합니다.",
  keywords: [
    "동심지키미",
    "팀 동심지키미",
    "경찰과 도둑 개발팀",
    "경도 개발사",
    "위치 기반 게임 스타트업",
    "인디 게임 스튜디오",
    "게임 개발팀 소개",
  ],
  alternates: {
    canonical: "/team",
    languages: {
      ...alternateLanguages(SITE_URL, "/team"),
      "x-default": `${SITE_URL}/team`,
    },
  },
  openGraph: {
    title: "팀 소개 | 경찰과 도둑",
    description:
      "게임으로 사람과 사람을 연결합니다. 위치 기반 오프라인 게임 ‘경찰과 도둑’을 만드는 팀 동심지키미.",
    url: "/team",
    type: "profile",
    locale: "ko_KR",
  },
};

// 어드민이 저장하면 바로 버리고, 놓쳐도 5분 안에 새로 그린다 (#250)
export const revalidate = 300;

export default function TeamPage() {
  return <TeamSections locale="ko" />;
}
