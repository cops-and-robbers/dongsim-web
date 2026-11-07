import type { Metadata } from "next";
import BoothPreview from "@/components/photobooth/BoothPreview";

// 어드민 행사 화면이 iframe 으로 여는 부스 화면 미리보기(#221). 부스 화면은 vh 를 써서 실제 크기(1280x800) 창에 그려야 같다.
// 값은 어드민이 postMessage 로 넘긴다(같은 주소에서 온 것만). 카메라, 사진 올리기, 인쇄는 하지 않는다.
export const metadata: Metadata = {
  title: "포토부스 미리보기",
  robots: { index: false, follow: false },
};

export default function BoothPreviewPage() {
  return <BoothPreview />;
}
