import type { Metadata } from "next";
import PolicyRenderer from "@/components/policy/PolicyRenderer";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import { getLegalDoc } from "@/lib/legal/documents";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: { absolute: "利用規約" },
  description: "ケイドロ（Cops and Robbers）のサービス利用規約です。当社と利用者の権利・義務・責任事項を定めています。",
  alternates: {
    canonical: `${SITE_URL}/ja/terms`,
    languages: {
      ...alternateLanguages(SITE_URL, "/terms"),
      "x-default": `${SITE_URL}/terms`,
    },
  },
  openGraph: {
    title: "利用規約",
    description: "ケイドロ（Cops and Robbers）のサービス利用規約です。当社と利用者の権利・義務・責任事項を定めています。",
    url: `${SITE_URL}/ja/terms`,
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
          { name: "利用規約", path: "/ja/terms" },
        ]}
      />
      <PolicyRenderer data={getLegalDoc("terms", "ja")} />
    </>
  );
}
