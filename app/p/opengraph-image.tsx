import { OG_SIZE, renderPhotoboothOg } from "@/components/photobooth/og";

// 손님이 받은 사진 링크(/p) 공유 시 - "사진 받아가세요" 카드.
export const alt = "경찰과 도둑 포토부스 - 사진 받아가세요";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderPhotoboothOg({ line1: "포토부스 사진", line2: "받아가세요" });
}
