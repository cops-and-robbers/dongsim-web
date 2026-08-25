import type { Metadata } from "next";
import PolicyRenderer from "@/components/policy/PolicyRenderer";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import { getLegalDoc } from "@/lib/legal/documents";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

const DESCRIPTION =
  "Licenses for the open source software used by Cops and Robbers, and attribution for the map and address data.";

export const metadata: Metadata = {
  title: { absolute: "Open Source Licenses and Data Attribution" },
  description: DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/en/licenses`,
    languages: {
      ...alternateLanguages(SITE_URL, "/licenses"),
      "x-default": `${SITE_URL}/licenses`,
    },
  },
  openGraph: {
    title: "Open Source Licenses and Data Attribution",
    description: DESCRIPTION,
    url: `${SITE_URL}/en/licenses`,
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
          { name: "Open Source Licenses and Data Attribution", path: "/en/licenses" },
        ]}
      />
      <PolicyRenderer data={getLegalDoc("licenses", "en")} />
    </>
  );
}
