import type { Metadata } from "next";
import PolicyRenderer, {
  type PolicyData,
} from "@/components/policy/PolicyRenderer";
import locationData from "@/lib/policies/location.json";

export const metadata: Metadata = {
  title: "위치정보 이용약관",
  description:
    "경찰과 도둑(Cops and Robbers) 위치기반서비스 이용약관입니다. 위치정보의 수집·이용·제공과 이용자의 권리를 안내합니다.",
  alternates: { canonical: "/location" },
};

export default function LocationPage() {
  return <PolicyRenderer data={locationData as PolicyData} />;
}
