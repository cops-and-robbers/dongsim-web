import type { Metadata } from "next";
import PolicyRenderer from "@/components/policy/PolicyRenderer";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import { getLegalDoc } from "@/lib/legal/documents";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: { absolute: "Terms of Service" },
  description: "Terms of Service for Cops and Robbers - the rights, obligations and responsibilities between the Company and users.",
  alternates: {
    canonical: `${SITE_URL}/en/terms`,
    languages: {
      ...alternateLanguages(SITE_URL, "/terms"),
      "x-default": `${SITE_URL}/terms`,
    },
  },
  openGraph: {
    title: "Terms of Service",
    description: "Terms of Service for Cops and Robbers - the rights, obligations and responsibilities between the Company and users.",
    url: `${SITE_URL}/en/terms`,
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
          { name: "Terms of Service", path: "/en/terms" },
        ]}
      />
      <PolicyRenderer data={getLegalDoc("terms", "en")} />
    </>
  );
}
