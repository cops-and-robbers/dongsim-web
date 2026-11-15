import type { Metadata } from "next";
import TeamSections from "@/components/team/TeamSections";
import { getMessages } from "@/lib/i18n/messages";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

const meta = getMessages("ja").team.meta;

export const metadata: Metadata = {
  title: { absolute: meta.title },
  description: meta.description,
  alternates: {
    canonical: `${SITE_URL}/ja/team`,
    languages: {
      ...alternateLanguages(SITE_URL, "/team"),
      "x-default": `${SITE_URL}/team`,
    },
  },
  openGraph: {
    title: meta.title,
    description: meta.description,
    url: `${SITE_URL}/ja/team`,
    locale: "ja_JP",
    type: "profile",
  },
};

// 어드민이 저장하면 바로 버린다. 주기는 놓쳤을 때를 위한 것(#335)
export const revalidate = 3600;

export default function TeamJaPage() {
  return <TeamSections locale="ja" />;
}
