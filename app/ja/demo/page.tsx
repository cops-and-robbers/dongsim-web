import type { Metadata } from "next";
import DemoSections from "@/components/demo/DemoSections";
import { getMessages } from "@/lib/i18n/messages";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

const meta = getMessages("ja").demo.meta;

export const metadata: Metadata = {
  title: { absolute: meta.title },
  description: meta.description,
  alternates: {
    canonical: `${SITE_URL}/ja/demo`,
    languages: {
      ...alternateLanguages(SITE_URL, "/demo"),
      "x-default": `${SITE_URL}/demo`,
    },
  },
  openGraph: {
    title: meta.title,
    description: meta.description,
    url: `${SITE_URL}/ja/demo`,
    locale: "ja_JP",
  },
};

export default function DemoJaPage() {
  return <DemoSections locale="ja" />;
}
