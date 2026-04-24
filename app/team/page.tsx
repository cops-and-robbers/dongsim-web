import type { Metadata } from "next";
import TeamHeroSection from "@/components/team/TeamHeroSection";
import MissionVisionSection from "@/components/team/MissionVisionSection";
import TeamGridSection from "@/components/team/TeamGridSection";

export const metadata: Metadata = {
  title: "팀 소개",
  description:
    "동심지킴이 — 오프라인 놀이를 디지털로 더 재밌게 만드는 인디 게임 스튜디오. 미션, 가치, 팀원을 소개합니다.",
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
