import type { Metadata } from "next";
import ThiefHuntGame from "@/components/booth/ThiefHuntGame";

export const metadata: Metadata = {
  title: { absolute: "泥棒をつかまえろ！ - ブースミニゲーム" },
  robots: { index: false, follow: true },
};

export default function PlayJaPage() {
  return <ThiefHuntGame />;
}
