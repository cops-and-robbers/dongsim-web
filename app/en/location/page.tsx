import type { Metadata } from "next";
import PolicyRenderer from "@/components/policy/PolicyRenderer";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import { getLegalDoc } from "@/lib/legal/documents";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: { absolute: "Location Data Terms" },
  description: "Location Data Terms for Cops and Robbers - how location data is collected, used, shared and destroyed during gameplay.",
  alternates: {
    canonical: `${SITE_URL}/en/location`,
    languages: {
      ...alternateLanguages(SITE_URL, "/location"),
      "x-default": `${SITE_URL}/location`,
    },
  },
  openGraph: {
    title: "Location Data Terms",
    description: "Location Data Terms for Cops and Robbers - how location data is collected, used, shared and destroyed during gameplay.",
    url: `${SITE_URL}/en/location`,
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
          { name: "Location Data Terms", path: "/en/location" },
        ]}
      />
      <PolicyRenderer data={getLegalDoc("location", "en")} />
    </>
  );
}
