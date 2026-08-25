import type { Metadata } from "next";
import PolicyRenderer from "@/components/policy/PolicyRenderer";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import { getLegalDoc } from "@/lib/legal/documents";
import { alternateLanguages } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/constants";

const DESCRIPTION =
  "ケイドロ（Cops and Robbers）が利用しているオープンソースソフトウェアのライセンスと、地図・住所データの出典です。";

export const metadata: Metadata = {
  title: { absolute: "オープンソースライセンス及びデータの出典" },
  description: DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/ja/licenses`,
    languages: {
      ...alternateLanguages(SITE_URL, "/licenses"),
      "x-default": `${SITE_URL}/licenses`,
    },
  },
  openGraph: {
    title: "オープンソースライセンス及びデータの出典",
    description: DESCRIPTION,
    url: `${SITE_URL}/ja/licenses`,
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
          { name: "オープンソースライセンス及びデータの出典", path: "/ja/licenses" },
        ]}
      />
      <PolicyRenderer data={getLegalDoc("licenses", "ja")} />
    </>
  );
}
