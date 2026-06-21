import type { Metadata } from "next";
import PhotoResult from "@/components/photobooth/PhotoResult";

export const metadata: Metadata = {
  title: "사진 받기",
  description: "경찰과 도둑 포토부스에서 찍은 사진을 받아가세요.",
  robots: { index: false, follow: false },
};

// 표시를 허용할 Blob 호스트 — 임의 이미지 URL 렌더 방지(보안).
const ALLOWED_HOST_SUFFIX = ".public.blob.vercel-storage.com";

export default async function PhotoDownloadPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string | string[] }>;
}) {
  const { u } = await searchParams;
  const raw = Array.isArray(u) ? u[0] : u;

  let imageUrl: string | null = null;
  if (raw) {
    try {
      const parsed = new URL(raw);
      if (
        parsed.protocol === "https:" &&
        parsed.host.endsWith(ALLOWED_HOST_SUFFIX)
      ) {
        imageUrl = parsed.toString();
      }
    } catch {
      // 잘못된 URL → null
    }
  }

  return <PhotoResult imageUrl={imageUrl} />;
}
