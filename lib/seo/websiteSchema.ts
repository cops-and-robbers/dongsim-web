import { SITE_URL } from "@/lib/constants";
import { getMessages } from "@/lib/i18n/messages";
import { localizedPath, type Locale } from "@/lib/i18n/config";

// 검색 결과에 붙는 사이트 이름은 이 WebSite 스키마의 name에서 온다.
// 로케일마다 다르게 주지 않으면 일본어 페이지 옆에 한국어 이름이 따라붙는다.
// 표기는 각 스토어의 앱 이름과 맞춘다 (ja=ケイドロ, en=Cops and Robbers).
const SITE_NAME: Record<Locale, string> = {
  ko: "경찰과 도둑",
  en: "Cops and Robbers",
  ja: "ケイドロ",
};

// 같은 서비스를 부르는 다른 표기. 지역마다 부르는 이름이 갈리는 경우를 포함한다
// (일본은 관동 ドロケイ / 관서 ケイドロ 로 갈린다).
const ALTERNATE_NAME: Record<Locale, string[]> = {
  ko: ["경도", "동심지키미", "Cops and Robbers"],
  en: ["Cops and Robbers: Real Chase", "GPS Tag"],
  ja: ["ドロケイ", "リアル鬼ごっこ", "Cops and Robbers"],
};

const IN_LANGUAGE: Record<Locale, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
};

export function websiteSchema(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME[locale],
    alternateName: ALTERNATE_NAME[locale],
    url: `${SITE_URL}${localizedPath("/", locale)}`,
    description: getMessages(locale).home.meta.description,
    inLanguage: IN_LANGUAGE[locale],
    publisher: {
      "@type": "Organization",
      name: "동심지키미",
      url: SITE_URL,
    },
  };
}
