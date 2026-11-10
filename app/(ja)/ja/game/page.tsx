import type { Metadata } from "next";
import GameSections from "@/components/game/GameSections";
import { getMessages } from "@/lib/i18n/messages";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

const meta = getMessages("ja").game.meta;

export const metadata: Metadata = {
  title: { absolute: meta.title },
  description: meta.description,
  alternates: {
    canonical: `${SITE_URL}/ja/game`,
    languages: {
      ...alternateLanguages(SITE_URL, "/game"),
      "x-default": `${SITE_URL}/game`,
    },
  },
  openGraph: {
    title: meta.title,
    description: meta.description,
    url: `${SITE_URL}/ja/game`,
    locale: "ja_JP",
    type: "article",
  },
};

export default function GameJaPage() {
  return <GameSections locale="ja" />;
}
