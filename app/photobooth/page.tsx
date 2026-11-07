import type { Metadata } from "next";
import ClosedScreen from "@/components/photobooth/ClosedScreen";
import Kiosk from "@/components/photobooth/Kiosk";
import { isBoothOpen, isBoothOver } from "@/components/photobooth/schedule";
import { boothEvent } from "@/lib/event/server";

// 운영 시간 게이트를 매 요청마다 평가하기 위해 동적 렌더링.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "포토부스",
  description: "경찰과 도둑 포토부스 키오스크.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/photobooth" },
};

export default async function PhotoboothPage() {
  const { settings } = await boothEvent();
  if (isBoothOpen(settings)) return <Kiosk />;
  return <ClosedScreen name={settings.name} dateLabel={settings.dateLabel} location={settings.location} over={isBoothOver(settings)} />;
}
