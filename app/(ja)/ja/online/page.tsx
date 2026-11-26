import type { Metadata } from "next";
import OnlineSections from "@/components/online/OnlineSections";
import { getMessages } from "@/lib/i18n/messages";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

// 주기와 캐시 버리기는 한국어 페이지(app/(ko)/online/page.tsx)와 같다
export const revalidate = 300;

const meta = getMessages("ja").online.meta;

export const metadata: Metadata = {
  title: { absolute: meta.title },
  description: meta.description,
  alternates: {
    canonical: `${SITE_URL}/ja/online`,
    languages: { ...alternateLanguages(SITE_URL, "/online"), "x-default": `${SITE_URL}/online` },
  },
  openGraph: { title: meta.title, description: meta.description, url: `${SITE_URL}/ja/online`, locale: "ja_JP", type: "website" },
  twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
};

export default function OnlineJaPage() {
  return <OnlineSections locale="ja" />;
}
