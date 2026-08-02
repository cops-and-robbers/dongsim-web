import { HOME_OG_SIZE, renderHomeOg } from "@/components/seo/homeOgCard";

export const alt = "경찰과 도둑 - 앱으로 더 쉽고 몰입감 있게 즐기는 GPS 술래잡기";
export const size = HOME_OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderHomeOg({
    logoPath: "public/brand/header-logo.svg",
    logoW: 285,
    logoH: 46,
    line1: "앱으로 더 쉽고",
    line2: "몰입감 있게",
  });
}
