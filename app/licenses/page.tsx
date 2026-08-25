import type { Metadata } from "next";
import PolicyRenderer from "@/components/policy/PolicyRenderer";
import BreadcrumbJsonLd from "@/components/seo/BreadcrumbJsonLd";
import { getLegalDoc } from "@/lib/legal/documents";

export const metadata: Metadata = {
  title: "오픈소스 라이선스 및 데이터 출처",
  description:
    "경찰과 도둑(Cops and Robbers)이 사용하는 오픈소스 소프트웨어의 라이선스와 지도·주소 데이터의 출처입니다.",
  keywords: [
    "경찰과 도둑 오픈소스 라이선스",
    "경도 오픈소스",
    "동심지키미 오픈소스 라이선스",
    "OpenStreetMap 출처",
    "Cops and Robbers Open Source Licenses",
  ],
  alternates: { canonical: "/licenses" },
  openGraph: {
    title: "오픈소스 라이선스 및 데이터 출처 | 경찰과 도둑",
    description:
      "경찰과 도둑(Cops and Robbers)이 사용하는 오픈소스 소프트웨어의 라이선스와 지도·주소 데이터의 출처를 안내합니다.",
    url: "/licenses",
    type: "article",
    locale: "ko_KR",
  },
};

export default function LicensesPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "홈", path: "/" },
          { name: "오픈소스 라이선스 및 데이터 출처", path: "/licenses" },
        ]}
      />
      <PolicyRenderer data={getLegalDoc("licenses")} />
    </>
  );
}
