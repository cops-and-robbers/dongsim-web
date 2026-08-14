import { websiteSchema } from "@/lib/seo/websiteSchema";
import type { Locale } from "@/lib/i18n/config";

// 로케일별 WebSite 구조화 데이터. 각 언어 홈에서 한 번만 렌더한다.
// (루트 레이아웃에 두면 전 로케일에 같은 언어 이름이 박힌다)
export default function WebsiteJsonLd({ locale }: { locale: Locale }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(websiteSchema(locale)),
      }}
    />
  );
}
