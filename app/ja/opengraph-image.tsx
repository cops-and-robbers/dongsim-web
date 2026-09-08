import { HOME_OG_SIZE, renderHomeOg } from "@/components/seo/homeOgCard";

export const alt = "ケイドロ - GPSリアル鬼ごっこ";
export const size = HOME_OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderHomeOg({
    logo: "ja",
    line1: "ケイドロが、",
    line2: "帰ってきた。",
  });
}
