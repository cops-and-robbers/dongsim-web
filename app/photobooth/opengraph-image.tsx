import { OG_SIZE, renderPhotoboothOg } from "@/components/photobooth/og";
import { boothEvent } from "@/lib/event/server";

// 부스 링크(/photobooth) 공유 시 - 행사 전엔 준비중 화면이 뜨므로,
// OG는 "어디서·언제 만나요" 예고 카드로(어드민 행사 설정, #219).
export const alt = "경찰과 도둑 포토부스 - 다음 행사에서 만나요";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const { name, dateLabel, location } = (await boothEvent()).settings;
  const details = [name, dateLabel, location].filter(Boolean);
  return renderPhotoboothOg({
    line1: "포토부스",
    line2: "여기서 만나요",
    details,
  });
}
