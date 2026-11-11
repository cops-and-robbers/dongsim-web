import { OG_SIZE, renderTeamOgCard } from "@/components/seo/teamOgCard";

export const alt = "Team Dongsim - connecting people through play";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderTeamOgCard({
    label: "Team",
    headline: ["Connecting people", "through play"],
    subtitle: "Team Dongsim · makers of Cops and Robbers",
    logo: "en",
  });
}
