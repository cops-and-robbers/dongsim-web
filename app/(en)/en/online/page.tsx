import type { Metadata } from "next";
import OnlineSections from "@/components/online/OnlineSections";
import { getMessages } from "@/lib/i18n/messages";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 30;

const meta = getMessages("en").online.meta;

export const metadata: Metadata = {
  title: { absolute: meta.title },
  description: meta.description,
  alternates: {
    canonical: `${SITE_URL}/en/online`,
    languages: { ...alternateLanguages(SITE_URL, "/online"), "x-default": `${SITE_URL}/online` },
  },
  openGraph: { title: meta.title, description: meta.description, url: `${SITE_URL}/en/online`, locale: "en_US", type: "website" },
  twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
};

export default function OnlineEnPage() {
  return <OnlineSections locale="en" />;
}
