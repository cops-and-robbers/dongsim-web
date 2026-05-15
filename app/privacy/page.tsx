import type { Metadata } from "next";
import PolicyRenderer, {
  type PolicyData,
} from "@/components/policy/PolicyRenderer";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import privacyData from "@/lib/policies/privacy.json";

export const metadata: Metadata = {
  title: "개인정보 처리방침",
  description:
    "경찰과 도둑(Cops and Robbers)의 개인정보 처리방침입니다. 수집 항목, 목적, 보관 및 이용자의 권리를 안내합니다.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "개인정보 처리방침 | 경찰과 도둑",
    description:
      "경찰과 도둑(Cops and Robbers) 개인정보 처리방침 — 수집 항목, 이용 목적, 보관 기간, 이용자 권리를 안내합니다.",
    url: "/privacy",
    type: "article",
    locale: "ko_KR",
  },
};

export default function PrivacyPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", path: "/" },
          { name: "개인정보 처리방침", path: "/privacy" },
        ]}
      />
      <PolicyRenderer data={privacyData as PolicyData} />
    </>
  );
}
