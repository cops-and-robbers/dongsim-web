import type { Metadata } from "next";
import AdminProviders from "@/components/admin/AdminProviders";
import AdminShell from "@/components/admin/AdminShell";

// 어드민은 검색 노출 금지(임시 + 내부용)
export const metadata: Metadata = {
  // OG 이미지 등 절대 URL은 admin 도메인 기준으로. 메인 도메인의 /admin은
  // 프록시가 404로 막아서, 메인 도메인 기준이면 공유 카드 이미지가 안 뜬다.
  metadataBase: new URL("https://admin.copsandrobbers.app"),
  title: "경도 어드민",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProviders>
      <AdminShell>{children}</AdminShell>
    </AdminProviders>
  );
}
