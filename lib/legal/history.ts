// 약관·처리방침의 이전 버전(#174).
//
// 개정할 때마다 문서를 덮어써서 이전 버전이 git 기록에만 남아 있었다. 개인정보
// 처리방침 작성지침은 이전 버전과 각 버전의 적용 기간을 함께 공개하라고 하고,
// 서버는 동의한 날짜만 저장하므로 그 날짜에 어느 약관이었는지 보이려면 원문이
// 남아 있어야 한다. 그래서 시행일마다 원문을 content/legal/<언어>/archive/<문서>/
// 에 남기고, 현재 문서보다 시행일이 앞선 것을 이전 버전으로 보여 준다.

import type { Locale } from "@/lib/i18n/config";
import { ARCHIVE } from "./archive.generated";
import { getLegalDoc, type LegalDoc, type PolicyData } from "./documents";
import { isoFromEffectiveDate, pastVersions, type PastVersion } from "./history-periods";

/** 이전 버전을 보관하는 문서. 오픈소스 라이선스는 동의 대상이 아니라 뺀다 */
export const HISTORY_DOCS = ["terms", "privacy", "location", "marketing"] as const;

export type HistoryDoc = (typeof HISTORY_DOCS)[number];

export function isHistoryDoc(doc: LegalDoc): doc is HistoryDoc {
  return (HISTORY_DOCS as readonly string[]).includes(doc);
}

function prefix(locale: Locale): string {
  return locale === "ko" ? "" : `/${locale}`;
}

export function currentPath(doc: HistoryDoc, locale: Locale): string {
  return `${prefix(locale)}/${doc}`;
}

export function historyPath(doc: HistoryDoc, locale: Locale, date: string): string {
  return `${prefix(locale)}/${doc}/history/${date}`;
}

/** 이전 버전 목록. 최신이 먼저 */
export function legalHistory(doc: HistoryDoc, locale: Locale): PastVersion[] {
  const current = isoFromEffectiveDate(getLegalDoc(doc, locale).effectiveDate);
  return pastVersions(Object.keys(ARCHIVE[locale][doc]), current);
}

/** 이전 버전 하나. 현재 문서이거나 없는 시행일이면 null */
export function getPastVersion(
  doc: HistoryDoc,
  locale: Locale,
  date: string,
): { data: PolicyData; version: PastVersion } | null {
  const version = legalHistory(doc, locale).find((v) => v.date === date);
  if (!version) return null;
  return { data: ARCHIVE[locale][doc][date], version };
}
