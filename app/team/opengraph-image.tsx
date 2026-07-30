import { OG_SIZE, renderTeamOgCard } from "@/components/seo/teamOgCard";

// 팀 소개(회사 소개) 공유용 OG. /team 정적 페이지라 빌드 시 PNG로 생성된다.
export const alt = "동심지키미 - 게임으로 사람과 사람을 연결합니다";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderTeamOgCard({
    label: "팀 소개",
    headline: ["게임으로 사람과 사람을", "연결합니다"],
    subtitle: "동심지키미 · 경찰과 도둑을 만드는 팀",
  });
}
