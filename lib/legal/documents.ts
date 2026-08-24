// 법적 문서 4종의 단일 진입점.
//
// 같은 문서가 앱(`assets/legals/*.json`)과 웹 양쪽에 있었다. 내용은 같았지만
// 사람이 손으로 맞추는 구조라, 한쪽만 고치면 조용히 어긋난다. 웹을 정본으로 삼고
// 앱이 웹뷰로 가져가기로 했다(#47). 그 첫 단계가 이 파일이다.
//
// 언어 폴더를 지금부터 나눠 둔다. 한국어 하나뿐이라 과해 보이지만, 일본어를
// 넣는 순간 파일명이 지저분해지고 앱이 로케일로 URL 을 만들 때 규칙이 안 선다.

import koLocation from "@/content/legal/ko/location.json";
import koMarketing from "@/content/legal/ko/marketing.json";
import koPrivacy from "@/content/legal/ko/privacy.json";
import koTerms from "@/content/legal/ko/terms.json";

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

/**
 * 슬러그 -> 문서.
 *
 * 언어가 늘면 `Record<Locale, Record<LegalDoc, PolicyData>>` 로 한 겹 더 들어간다.
 * 지금 한 겹으로 두는 것은 ko 뿐이라서고, 구조는 그때 바꾼다.
 */
const KO: Record<LegalDoc, PolicyData> = {
  terms: koTerms as PolicyData,
  privacy: koPrivacy as PolicyData,
  location: koLocation as PolicyData,
  marketing: koMarketing as PolicyData,
};

export function getLegalDoc(doc: LegalDoc): PolicyData {
  return KO[doc];
}

export function isLegalDoc(value: string): value is LegalDoc {
  return (LEGAL_DOCS as readonly string[]).includes(value);
}

/**
 * 앱이 여는 주소. 사이트에 노출되는 `/terms` 와 경로가 다르다.
 *
 * 앱 화면과 붙어야 해서 껍데기 없는 별도 뷰를 쓰고, 그래서 경로도 갈랐다.
 * 같은 내용이 두 주소로 색인되지 않도록 `robots.ts` 가 이 경로를 막는다.
 */
export function embedPath(doc: LegalDoc): string {
  return `/legal/${doc}/embed`;
}
