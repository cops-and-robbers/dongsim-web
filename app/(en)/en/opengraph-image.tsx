import { HOME_OG_SIZE, renderHomeOg } from "@/components/seo/homeOgCard";

export const alt = "Cops and Robbers - real-life GPS tag, back in real life";
export const size = HOME_OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderHomeOg({
    logo: "en",
    line1: "Cops and Robbers,",
    line2: "back in real life",
  });
}
