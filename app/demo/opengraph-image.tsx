import { OG_SIZE, renderTeamOgCard } from "@/components/seo/teamOgCard";

// 체험하기(/demo) 공유용 OG. 정적 페이지라 빌드 시 PNG로 생성된다.
// 문구는 데모 메타 제목과 같은 결 - 설치 장벽 없이 바로 해본다는 것 하나만 말한다.
export const alt = "경찰과 도둑 - 설치 없이 한 판 해보기";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderTeamOgCard({
    label: "체험하기",
    headline: ["설치 없이 여기서", "바로 한 판"],
    subtitle: "실제 앱 화면 그대로, 웹에서 하는 경찰과 도둑 데모",
  });
}
