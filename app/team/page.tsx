import type { Metadata } from "next";
import TeamHeroSection from "@/components/team/TeamHeroSection";
import MissionVisionSection from "@/components/team/MissionVisionSection";
import TeamGridSection from "@/components/team/TeamGridSection";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "팀 소개",
  description:
    "동심지키미 — 추억의 게임에서 가치를 찾는 인디 게임 스튜디오. 우리가 일하는 방식과 함께 만드는 사람들을 소개합니다.",
  keywords: [
    "동심지키미",
    "팀 동심지키미",
    "경찰과 도둑 개발팀",
    "경도 개발사",
    "인디 게임 스튜디오",
    "한국 인디 게임",
    "추억의 게임 스튜디오",
    "게임 개발팀 소개",
  ],
  alternates: { canonical: "/team" },
  openGraph: {
    title: "팀 소개 | 경찰과 도둑",
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
      <BreadcrumbJsonLd
        items={[
          { name: "홈", path: "/" },
          { name: "팀 소개", path: "/team" },
        ]}
      />
      <TeamHeroSection />
      <MissionVisionSection />
      <TeamGridSection />
    </>
  );
}
