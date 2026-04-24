import type { Metadata } from "next";
import PolicyRenderer, {
  type PolicyData,
} from "@/components/policy/PolicyRenderer";
import termsData from "@/lib/policies/terms.json";

export const metadata: Metadata = {
  title: "이용약관",
  description:
    "경찰과 도둑(Cops and Robbers) 서비스 이용약관입니다. 서비스 이용과 관련된 회사와 이용자의 권리·의무·책임 사항을 규정합니다.",
};

export default function TermsPage() {
  return <PolicyRenderer data={termsData as PolicyData} />;
}
