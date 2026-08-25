import type { Metadata } from "next";
import PolicyRenderer from "@/components/policy/PolicyRenderer";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import { getLegalDoc } from "@/lib/legal/documents";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: { absolute: "Privacy Policy" },
  description: "Privacy Policy for Cops and Robbers - what personal data we process, why, how long we keep it and what rights you have.",
  alternates: {
    canonical: `${SITE_URL}/en/privacy`,
    languages: {
      ...alternateLanguages(SITE_URL, "/privacy"),
      "x-default": `${SITE_URL}/privacy`,
    },
  },
  openGraph: {
    title: "Privacy Policy",
    description: "Privacy Policy for Cops and Robbers - what personal data we process, why, how long we keep it and what rights you have.",
    url: `${SITE_URL}/en/privacy`,
    locale: "en_US",
    type: "article",
  },
};

export default function Page() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/en" },
          { name: "Privacy Policy", path: "/en/privacy" },
        ]}
      />
      <PolicyRenderer data={getLegalDoc("privacy", "en")} />
    </>
  );
}
