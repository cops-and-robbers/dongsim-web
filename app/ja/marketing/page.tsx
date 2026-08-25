import type { Metadata } from "next";
import PolicyRenderer from "@/components/policy/PolicyRenderer";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import { getLegalDoc } from "@/lib/legal/documents";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: { absolute: "マーケティング情報の受信同意" },
  description: "ケイドロ（Cops and Robbers）のマーケティング情報の受信同意です。送信内容と撤回方法をご案内します。",
  alternates: {
    canonical: `${SITE_URL}/ja/marketing`,
    languages: {
      ...alternateLanguages(SITE_URL, "/marketing"),
      "x-default": `${SITE_URL}/marketing`,
    },
  },
  openGraph: {
    title: "マーケティング情報の受信同意",
    description: "ケイドロ（Cops and Robbers）のマーケティング情報の受信同意です。送信内容と撤回方法をご案内します。",
    url: `${SITE_URL}/ja/marketing`,
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
          { name: "マーケティング情報の受信同意", path: "/ja/marketing" },
        ]}
      />
      <PolicyRenderer data={getLegalDoc("marketing", "ja")} />
    </>
  );
}
