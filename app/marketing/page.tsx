import type { Metadata } from "next";
import PolicyRenderer, {
  type PolicyData,
} from "@/components/policy/PolicyRenderer";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import marketingData from "@/lib/policies/marketing.json";

export const metadata: Metadata = {
  title: "마케팅 정보 수신 동의",
  description:
    "경찰과 도둑(Cops and Robbers) 마케팅 정보 수신 동의 안내입니다. 수신 정보의 목적, 항목, 철회 방법 등을 확인할 수 있습니다.",
  keywords: [
    "마케팅 정보 수신 동의",
    "광고성 정보 수신 동의",
    "경찰과 도둑 마케팅 동의",
    "경도 마케팅 동의",
    "동심지키미 마케팅",
    "수신 동의 철회",
  ],
  alternates: { canonical: "/marketing" },
  openGraph: {
    title: "마케팅 정보 수신 동의 | 경찰과 도둑",
    description:
      "경찰과 도둑(Cops and Robbers) 마케팅 정보 수신 동의 — 수신 정보의 목적, 항목, 철회 방법을 안내합니다.",
    url: "/marketing",
    type: "article",
    locale: "ko_KR",
  },
};

export default function MarketingPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", path: "/" },
          { name: "마케팅 정보 수신 동의", path: "/marketing" },
        ]}
      />
      <PolicyRenderer data={marketingData as PolicyData} />
    </>
  );
}
