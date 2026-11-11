import type { Metadata } from "next";
import DownloadRedirect from "@/components/DownloadRedirect";

export const metadata: Metadata = {
  title: "앱 다운로드",
  description: "경찰과 도둑 앱을 App Store와 Google Play에서 무료로 받으세요.",
  alternates: { canonical: "/download" },
  robots: { index: false, follow: true },
};

export default function DownloadPage() {
  return <DownloadRedirect />;
}
