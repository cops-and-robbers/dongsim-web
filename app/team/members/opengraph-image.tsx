import { OG_SIZE, renderTeamOgCard } from "@/components/seo/teamOgCard";

// 구성원 페이지 공유용 OG. 정적 페이지라 빌드 시 PNG로 생성된다.
export const alt = "동심지키미 구성원 - 경찰과 도둑을 함께 만드는 사람들";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderTeamOgCard({
    label: "구성원",
    headline: ["경찰과 도둑을", "함께 만드는 사람들"],
    subtitle: "동심지키미 · 개발·디자인·마케팅",
  });
}
