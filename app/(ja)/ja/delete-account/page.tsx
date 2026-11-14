import type { Metadata } from "next";
import AccountDeletionSections from "@/components/account/AccountDeletionSections";
import { alternateLanguages } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { SITE_URL } from "@/lib/constants";

const copy = getMessages("ja").accountDeletion;

export const metadata: Metadata = {
  title: { absolute: copy.metaTitle },
  description: copy.metaDescription,
  alternates: {
    canonical: `${SITE_URL}/ja/delete-account`,
    languages: {
      ...alternateLanguages(SITE_URL, "/delete-account"),
      "x-default": `${SITE_URL}/delete-account`,
    },
  },
  openGraph: {
    title: copy.metaTitle,
    description: copy.metaDescription,
    url: `${SITE_URL}/ja/delete-account`,
    locale: "ja_JP",
    type: "website",
  },
};

export default function Page() {
  return <AccountDeletionSections locale="ja" />;
}
