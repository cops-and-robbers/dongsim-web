import type { Metadata } from "next";
import PolicyRenderer from "@/components/policy/PolicyRenderer";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import { getLegalDoc } from "@/lib/legal/documents";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: { absolute: "Marketing Communications Consent" },
  description: "Marketing Communications Consent for Cops and Robbers - what we send, how we send it and how to opt out.",
  alternates: {
    canonical: `${SITE_URL}/en/marketing`,
    languages: {
      ...alternateLanguages(SITE_URL, "/marketing"),
      "x-default": `${SITE_URL}/marketing`,
    },
  },
  openGraph: {
    title: "Marketing Communications Consent",
    description: "Marketing Communications Consent for Cops and Robbers - what we send, how we send it and how to opt out.",
    url: `${SITE_URL}/en/marketing`,
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
          { name: "Marketing Communications Consent", path: "/en/marketing" },
        ]}
      />
      <PolicyRenderer data={getLegalDoc("marketing", "en")} />
    </>
  );
}
