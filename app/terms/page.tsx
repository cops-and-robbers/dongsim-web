import type { Metadata } from "next";
import PolicyRenderer, {
  type PolicyData,
} from "@/components/policy/PolicyRenderer";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import termsData from "@/lib/policies/terms.json";

export const metadata: Metadata = {
  title: "서비스 이용약관",
  description:
    "경찰과 도둑(Cops and Robbers) 서비스 이용약관입니다. 서비스 이용과 관련된 회사와 이용자의 권리·의무·책임 사항을 규정합니다.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "서비스 이용약관 | 경찰과 도둑",
    description:
      "경찰과 도둑(Cops and Robbers) 서비스 이용약관 — 회사와 이용자의 권리·의무·책임 사항을 안내합니다.",
    url: "/terms",
    type: "article",
    locale: "ko_KR",
  },
};

export default function TermsPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", path: "/" },
          { name: "서비스 이용약관", path: "/terms" },
        ]}
      />
      <PolicyRenderer data={termsData as PolicyData} />
    </>
  );
}
