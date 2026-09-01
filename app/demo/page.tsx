import type { Metadata } from "next";
import DemoSections from "@/components/demo/DemoSections";
import { getMessages } from "@/lib/i18n/messages";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

const meta = getMessages("ko").demo.meta;

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  alternates: {
    canonical: "/demo",
    languages: {
      ...alternateLanguages(SITE_URL, "/demo"),
      "x-default": `${SITE_URL}/demo`,
    },
  },
  openGraph: {
    title: meta.title,
    description: meta.description,
    url: "/demo",
    locale: "ko_KR",
  },
};

export default function DemoPage() {
  return <DemoSections locale="ko" />;
}
