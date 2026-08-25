import type { Metadata } from "next";
import PolicyRenderer from "@/components/policy/PolicyRenderer";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import { getLegalDoc } from "@/lib/legal/documents";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: { absolute: "プライバシーポリシー" },
  description: "ケイドロ（Cops and Robbers）のプライバシーポリシーです。取り扱う情報の項目、目的、保管及び利用者の権利を説明します。",
  alternates: {
    canonical: `${SITE_URL}/ja/privacy`,
    languages: {
      ...alternateLanguages(SITE_URL, "/privacy"),
      "x-default": `${SITE_URL}/privacy`,
    },
  },
  openGraph: {
    title: "プライバシーポリシー",
    description: "ケイドロ（Cops and Robbers）のプライバシーポリシーです。取り扱う情報の項目、目的、保管及び利用者の権利を説明します。",
    url: `${SITE_URL}/ja/privacy`,
    locale: "ja_JP",
    type: "article",
  },
};

export default function Page() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/ja" },
          { name: "プライバシーポリシー", path: "/ja/privacy" },
        ]}
      />
      <PolicyRenderer data={getLegalDoc("privacy", "ja")} />
    </>
  );
}
