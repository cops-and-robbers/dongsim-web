import type { Metadata } from "next";
import TeamHeroSection from "@/components/team/TeamHeroSection";
import TeamRecordsSection from "@/components/team/TeamRecordsSection";
import TeamMomentsSection from "@/components/team/TeamMomentsSection";
import TeamPreviewSection from "@/components/team/TeamPreviewSection";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "팀 소개",
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
  alternates: { canonical: "/team" },
  openGraph: {
    title: "팀 소개 | 경찰과 도둑",
    description:
      "게임으로 사람과 사람을 연결합니다. 위치 기반 오프라인 게임 ‘경찰과 도둑’을 만드는 팀 동심지키미.",
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
      <TeamRecordsSection />
      <TeamMomentsSection />
      <TeamPreviewSection />
    </>
  );
}
