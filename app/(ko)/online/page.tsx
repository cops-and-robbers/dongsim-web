import type { Metadata } from "next";
import OnlineSections from "@/components/online/OnlineSections";
import { getMessages } from "@/lib/i18n/messages";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

// 경찰과 도둑 온라인 게임 입구. 본문은 components/online/OnlineSections, 근거는 docs/online-game.md
export const revalidate = 30;

const meta = getMessages("ko").online.meta;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: {
    canonical: "/online",
    languages: { ...alternateLanguages(SITE_URL, "/online"), "x-default": `${SITE_URL}/online` },
  },
  openGraph: { title: meta.title, description: meta.description, url: "/online" },
  twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
};

export default function OnlinePage() {
  return <OnlineSections locale="ko" />;
}
