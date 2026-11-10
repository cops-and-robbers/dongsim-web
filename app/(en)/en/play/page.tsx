import type { Metadata } from "next";
import ThiefHuntGame from "@/components/booth/ThiefHuntGame";

export const metadata: Metadata = {
  title: { absolute: "Catch the Thieves - Booth Mini-game" },
  robots: { index: false, follow: true },
};

export default function PlayEnPage() {
  return <ThiefHuntGame />;
}
