import type { Metadata } from "next";
import PolicyRenderer, {
  type PolicyData,
} from "@/components/policy/PolicyRenderer";
import privacyData from "@/lib/policies/privacy.json";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description:
    "경찰과 도둑(Cops and Robbers)의 개인정보 처리방침입니다. 수집 항목, 목적, 보관 및 이용자의 권리를 안내합니다.",
};

export default function PrivacyPage() {
  return <PolicyRenderer data={privacyData as PolicyData} />;
}
