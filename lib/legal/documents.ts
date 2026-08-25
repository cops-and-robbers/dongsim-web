// 법적 문서 4종 x 3언어의 단일 진입점.
//
// 같은 문서가 앱(`assets/legals/*.json`)과 웹 양쪽에 있었다. 내용은 같았지만
// 사람이 손으로 맞추는 구조라, 한쪽만 고치면 조용히 어긋난다. 웹을 정본으로 삼고
// 앱이 웹뷰로 가져가기로 했다(#47). 그 첫 단계가 이 파일이다.
//
// ko 가 원본이고 ja·en 은 번역이다. 다만 번역본에는 원본에 없는
// "일본/해외 이용자에 관한 특칙" 섹션이 하나씩 더 있다. 각 나라의 소비자보호법과
// 개인정보보호법에 대응하기 위한 것이라 번역으로는 만들 수 없는 내용이고,
// 그래서 각 문서 부칙에서 "원문 우선" 원칙의 예외임을 명시하고 있다.

import enLocation from "@/content/legal/en/location.json";
import enMarketing from "@/content/legal/en/marketing.json";
import enPrivacy from "@/content/legal/en/privacy.json";
import enTerms from "@/content/legal/en/terms.json";
import jaLocation from "@/content/legal/ja/location.json";
import jaMarketing from "@/content/legal/ja/marketing.json";
import jaPrivacy from "@/content/legal/ja/privacy.json";
import jaTerms from "@/content/legal/ja/terms.json";
import koLocation from "@/content/legal/ko/location.json";
import koMarketing from "@/content/legal/ko/marketing.json";
import koPrivacy from "@/content/legal/ko/privacy.json";
import koTerms from "@/content/legal/ko/terms.json";
import type { Locale } from "@/lib/i18n/config";

export type PolicyItem = {
  text: string;
  subItems: string[];
};

export type PolicySection = {
  heading: string;
  content: string;
  items: PolicyItem[];
};

export type PolicyData = {
  title: string;
  effectiveDate: string;
  sections: PolicySection[];
};

/** 문서 슬러그. 앱이 이 값으로 URL 을 만든다 */
export const LEGAL_DOCS = [
  "terms",
  "privacy",
  "location",
  "marketing",
] as const;

export type LegalDoc = (typeof LEGAL_DOCS)[number];

const DOCS: Record<Locale, Record<LegalDoc, PolicyData>> = {
  ko: {
    terms: koTerms as PolicyData,
    privacy: koPrivacy as PolicyData,
    location: koLocation as PolicyData,
    marketing: koMarketing as PolicyData,
  },
  ja: {
    terms: jaTerms as PolicyData,
    privacy: jaPrivacy as PolicyData,
    location: jaLocation as PolicyData,
    marketing: jaMarketing as PolicyData,
  },
  en: {
    terms: enTerms as PolicyData,
    privacy: enPrivacy as PolicyData,
    location: enLocation as PolicyData,
    marketing: enMarketing as PolicyData,
  },
};

export function getLegalDoc(doc: LegalDoc, locale: Locale = "ko"): PolicyData {
  return DOCS[locale][doc];
}

export function isLegalDoc(value: string): value is LegalDoc {
  return (LEGAL_DOCS as readonly string[]).includes(value);
}

/**
 * 앱이 여는 주소. 사이트에 노출되는 `/terms` 와 경로가 다르다.
 *
 * 앱 화면과 붙어야 해서 껍데기 없는 별도 뷰를 쓰고, 그래서 경로도 갈랐다.
 * 같은 내용이 두 주소로 색인되지 않도록 `robots.ts` 가 이 경로를 막는다.
 * 앱은 자신의 로케일로 이 경로를 만든다.
 */
export function embedPath(doc: LegalDoc, locale: Locale = "ko"): string {
  const prefix = locale === "ko" ? "" : `/${locale}`;
  return `${prefix}/legal/${doc}/embed`;
}
