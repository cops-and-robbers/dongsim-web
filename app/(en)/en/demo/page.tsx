import type { Metadata } from "next";
import DemoSections from "@/components/demo/DemoSections";
import { getMessages } from "@/lib/i18n/messages";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

const meta = getMessages("en").demo.meta;

export const metadata: Metadata = {
  title: { absolute: meta.title },
  description: meta.description,
  alternates: {
    canonical: `${SITE_URL}/en/demo`,
    languages: {
      ...alternateLanguages(SITE_URL, "/demo"),
      "x-default": `${SITE_URL}/demo`,
    },
  },
  openGraph: {
    title: meta.title,
    description: meta.description,
    url: `${SITE_URL}/en/demo`,
    locale: "en_US",
  },
};

export default function DemoEnPage() {
  return <DemoSections locale="en" />;
}
