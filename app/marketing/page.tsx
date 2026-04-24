import type { Metadata } from "next";
import PolicyRenderer, {
  type PolicyData,
} from "@/components/policy/PolicyRenderer";
import marketingData from "@/lib/policies/marketing.json";

export const metadata: Metadata = {
  title: "마케팅 정보 수신 동의",
  description:
    "경찰과 도둑(Cops and Robbers) 마케팅 정보 수신 동의 안내입니다. 수신 정보의 목적, 항목, 철회 방법 등을 확인할 수 있습니다.",
};

export default function MarketingPage() {
  return <PolicyRenderer data={marketingData as PolicyData} />;
}
