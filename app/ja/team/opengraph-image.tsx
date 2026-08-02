import { OG_SIZE, renderTeamOgCard } from "@/components/seo/teamOgCard";

export const alt = "チーム・トンシム - 遊びで人と人をつなぐ";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderTeamOgCard({
    label: "チーム紹介",
    headline: ["遊びで人と人を", "つなぐ"],
    subtitle: "チーム・トンシム · ケイドロをつくるチーム",
    logoPath: "public/brand/i18n/logo-ja.svg",
    logoW: 2791,
    logoH: 560,
  });
}
