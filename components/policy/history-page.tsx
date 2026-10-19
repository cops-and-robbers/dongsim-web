// 약관·처리방침 이전 버전 페이지를 만드는 팩토리(#174).
//
// 문서 4종 × 언어 3개라 페이지 파일이 12개다. 본문은 여기 한 곳에 모아
// 파일마다 갈라지지 않게 한다(lib/legal/embed-route.ts 와 같은 방식).
// 이전 버전은 현재 문서와 내용이 겹치고 이미 효력이 끝난 문서라 검색에서 뺀다.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PolicyRenderer from "@/components/policy/PolicyRenderer";
import { SITE_URL } from "@/lib/constants";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import {
  currentPath,
  getPastVersion,
  historyPath,
  legalHistory,
  type HistoryDoc,
} from "@/lib/legal/history";
import { formatIsoDate } from "@/lib/legal/history-periods";

type Props = { params: Promise<{ date: string }> };

export function createLegalHistoryPage(doc: HistoryDoc, locale: Locale) {
  function generateStaticParams(): { date: string }[] {
    return legalHistory(doc, locale).map((version) => ({ date: version.date }));
  }

  async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { date } = await params;
    const past = getPastVersion(doc, locale, date);
    if (!past) return {};
    const title = getMessages(locale)
      .legal.archivedTitle.replace("{title}", past.data.title)
      .replace("{from}", formatIsoDate(date, locale));
    return {
      // ko 는 레이아웃의 제목 틀을 따르고, ja·en 은 현재 문서 페이지처럼 그대로 쓴다
      title: locale === "ko" ? title : { absolute: title },
      robots: { index: false, follow: true },
      alternates: { canonical: `${SITE_URL}${historyPath(doc, locale, date)}` },
    };
  }

  async function Page({ params }: Props) {
    const { date } = await params;
    const past = getPastVersion(doc, locale, date);
    if (!past) notFound();
    return (
      <PolicyRenderer
        data={past.data}
        locale={locale}
        archived={{ version: past.version, currentHref: currentPath(doc, locale) }}
      />
    );
  }

  return { generateStaticParams, generateMetadata, Page };
}
