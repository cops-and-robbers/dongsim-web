import type { Metadata } from "next";
import ThiefHuntGame from "@/components/booth/ThiefHuntGame";

export const metadata: Metadata = {
  title: "도둑을 잡아라! - 부스 미니게임",
  description:
    "30초 동안 빼꼼 나오는 도둑을 잡는 경찰과 도둑 부스 미니게임. 진짜 게임은 앱으로 공원에서 즐기세요.",
  alternates: { canonical: "/play" },
  robots: { index: false, follow: true },
};

export default function PlayPage() {
  return <ThiefHuntGame />;
}
