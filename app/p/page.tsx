import type { Metadata } from "next";
import PhotoResult from "@/components/photobooth/PhotoResult";
import {
  PHOTOBOOTH_KEY_RE,
  PHOTOBOOTH_PUBLIC_BASE,
} from "@/lib/photobooth/constants";

export const metadata: Metadata = {
  title: "사진 받기",
  description: "경찰과 도둑 포토부스에서 찍은 사진을 받아가세요.",
  robots: { index: false, follow: false },
};

// QR은 전체 URL 대신 짧은 오브젝트 키(?k=)만 담는다 (#123) - 인쇄용 QR을
// 작게 넣어도 읽히도록 밀도를 낮추기 위해서다. URL은 여기서 되살리고,
// 키 형태를 검증해 임의 이미지 URL 렌더를 막는다(기존 호스트 화이트리스트와 같은 목적).
export default async function PhotoDownloadPage({
  searchParams,
}: {
  searchParams: Promise<{ k?: string | string[] }>;
}) {
  const { k } = await searchParams;
  const raw = Array.isArray(k) ? k[0] : k;

  const imageUrl =
    raw && PHOTOBOOTH_KEY_RE.test(raw)
      ? `${PHOTOBOOTH_PUBLIC_BASE}/${raw}`
      : null;

  return <PhotoResult imageUrl={imageUrl} />;
}
