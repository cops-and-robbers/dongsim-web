import type { Metadata } from "next";
import HomeSections from "@/components/home/HomeSections";
import { getMessages } from "@/lib/i18n/messages";
import { alternateLanguages } from "@/lib/i18n/config";
import WebsiteJsonLd from "@/components/seo/WebsiteJsonLd";
import V3AnnouncementModal from "@/components/home/V3AnnouncementModal";
import { isV3AnnouncementLive } from "@/lib/app-version";
import { SITE_URL } from "@/lib/constants";

const meta = getMessages("en").home.meta;

export const metadata: Metadata = {
  // 루트 레이아웃의 "%s | 경찰과 도둑" 템플릿을 우회(absolute)해 영어 제목만 노출.
  title: { absolute: meta.title },
  description: meta.description,
  // 루트의 한국어 keywords가 그대로 새어나가지 않게 영어로 덮어쓴다.
  keywords: [
    "Cops and Robbers",
    "GPS tag",
    "real-life tag",
    "outdoor game",
    "location based game",
    "chase game",
    "team game",
    "hide and seek",
    "play outside with friends",
  ],
  alternates: {
    canonical: `${SITE_URL}/en`,
    languages: {
      ...alternateLanguages(SITE_URL),
      "x-default": `${SITE_URL}/`,
    },
  },
  openGraph: {
    title: meta.title,
    description: meta.description,
    url: `${SITE_URL}/en`,
    locale: "en_US",
    type: "website",
  },
};

export default async function HomeEnPage() {
  const v3Live = await isV3AnnouncementLive();
  return (
    <>
      <WebsiteJsonLd locale="en" />
      <V3AnnouncementModal enabled={v3Live} />
      <HomeSections locale="en" />
    </>
  );
}
