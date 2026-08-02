import { HOME_OG_SIZE, renderHomeOg } from "@/components/seo/homeOgCard";

export const alt = "ケイドロ - GPSリアル鬼ごっこ";
export const size = HOME_OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderHomeOg({
    logoPath: "public/brand/i18n/logo-ja.svg",
    logoW: 2791,
    logoH: 560,
    line1: "ケイドロが、",
    line2: "帰ってきた。",
  });
}
