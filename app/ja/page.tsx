import type { Metadata } from "next";
import HomeSections from "@/components/home/HomeSections";
import { getMessages } from "@/lib/i18n/messages";
import { alternateLanguages } from "@/lib/i18n/config";
import WebsiteJsonLd from "@/components/seo/WebsiteJsonLd";
import { SITE_URL } from "@/lib/constants";

const meta = getMessages("ja").home.meta;

export const metadata: Metadata = {
  // 루트 레이아웃의 "%s | 경찰과 도둑" 템플릿을 우회(absolute)해 일본어 제목만 노출.
  title: { absolute: meta.title },
  description: meta.description,
  // 루트의 한국어 keywords가 그대로 새어나가지 않게 일본어로 덮어쓴다.
  // 지역마다 부르는 이름이 갈려서(관동 ドロケイ / 관서 ケイドロ) 둘 다 넣는다.
  keywords: [
    "ケイドロ",
    "ドロケイ",
    "けいどろ",
    "鬼ごっこ",
    "リアル鬼ごっこ",
    "追いかけっこ",
    "位置ゲー",
    "GPS ゲーム",
    "外遊び",
    "アウトドア ゲーム",
    "友達 遊び",
    "Cops and Robbers",
  ],
  alternates: {
    canonical: `${SITE_URL}/ja`,
    languages: {
      ...alternateLanguages(SITE_URL),
      "x-default": `${SITE_URL}/`,
    },
  },
  openGraph: {
    title: meta.title,
    description: meta.description,
    url: `${SITE_URL}/ja`,
    locale: "ja_JP",
    type: "website",
  },
};

export default function HomeJaPage() {
  return (
    <>
      <WebsiteJsonLd locale="ja" />
      <HomeSections locale="ja" />
    </>
  );
}
