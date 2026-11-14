import type { Metadata } from "next";
import AccountDeletionSections from "@/components/account/AccountDeletionSections";
import { alternateLanguages } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { SITE_URL } from "@/lib/constants";

const copy = getMessages("en").accountDeletion;

export const metadata: Metadata = {
  title: { absolute: copy.metaTitle },
  description: copy.metaDescription,
  alternates: {
    canonical: `${SITE_URL}/en/delete-account`,
    languages: {
      ...alternateLanguages(SITE_URL, "/delete-account"),
      "x-default": `${SITE_URL}/delete-account`,
    },
  },
  openGraph: {
    title: copy.metaTitle,
    description: copy.metaDescription,
    url: `${SITE_URL}/en/delete-account`,
    locale: "en_US",
    type: "website",
  },
};

export default function Page() {
  return <AccountDeletionSections locale="en" />;
}
