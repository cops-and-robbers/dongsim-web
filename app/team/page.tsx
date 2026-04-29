import type { Metadata } from "next";
import TeamHeroSection from "@/components/team/TeamHeroSection";
import MissionVisionSection from "@/components/team/MissionVisionSection";
import TeamGridSection from "@/components/team/TeamGridSection";

export const metadata: Metadata = {
  title: "팀 소개",
  description:
    "동심지킴이 — 추억의 게임에서 가치를 찾는 인디 게임 스튜디오. 우리가 일하는 방식과 함께 만드는 사람들을 소개합니다.",
  alternates: { canonical: "/team" },
  openGraph: {
    title: "팀 소개 | 동심지킴이",
    description:
      "추억의 게임에서 가치를 발견합니다. 친구들과 뛰놀던 그 추억을 더 재미있고 더 편하게 이어가요.",
    url: "/team",
    type: "profile",
    locale: "ko_KR",
  },
};

export default function TeamPage() {
  return (
    <>
      <TeamHeroSection />
      <MissionVisionSection />
      <TeamGridSection />
    </>
  );
}
