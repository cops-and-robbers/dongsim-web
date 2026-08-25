import type { Metadata } from "next";
import PolicyRenderer from "@/components/policy/PolicyRenderer";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import { getLegalDoc } from "@/lib/legal/documents";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: { absolute: "位置情報利用規約" },
  description: "ケイドロ（Cops and Robbers）の位置情報利用規約です。ゲーム中の位置情報の収集・利用・提供・破棄について定めています。",
  alternates: {
    canonical: `${SITE_URL}/ja/location`,
    languages: {
      ...alternateLanguages(SITE_URL, "/location"),
      "x-default": `${SITE_URL}/location`,
    },
  },
  openGraph: {
    title: "位置情報利用規約",
    description: "ケイドロ（Cops and Robbers）の位置情報利用規約です。ゲーム中の位置情報の収集・利用・提供・破棄について定めています。",
    url: `${SITE_URL}/ja/location`,
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
          { name: "位置情報利用規約", path: "/ja/location" },
        ]}
      />
      <PolicyRenderer data={getLegalDoc("location", "ja")} />
    </>
  );
}
