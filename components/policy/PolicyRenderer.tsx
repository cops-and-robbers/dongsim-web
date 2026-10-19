import type {
  PolicyData,
  PolicyItem,
  PolicySection,
} from "@/lib/legal/documents";
import Link from "next/link";
import Container from "@/components/ui/Container";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { historyPath, legalHistory, type HistoryDoc } from "@/lib/legal/history";
import { formatIsoDate, type PastVersion } from "@/lib/legal/history-periods";

// 타입은 lib/legal/documents 가 정본이다. 같은 문서를 앱 웹뷰(AppLegalView)도
// 그리기 때문에, 양쪽이 따로 타입을 들고 있으면 스키마가 조용히 갈라진다.
export type {
  PolicyItem,
  PolicySection,
  PolicyData,
} from "@/lib/legal/documents";

function isSubsectionHeading(heading: string) {
  return /^\d+-\d+/.test(heading);
}

function isBracketHeading(heading: string) {
  return /^\[.+\]$/.test(heading) || heading === "부칙";
}

function Section({ section }: { section: PolicySection }) {
  const paragraphs = section.content
    ? section.content.split("\n\n").filter((p) => p.trim().length > 0)
    : [];

  const isSub = isSubsectionHeading(section.heading);
  const isBracket = isBracketHeading(section.heading);

  return (
    <section className="space-y-3.5">
      {section.heading && (
        <>
          {isBracket ? (
            <h2 className="pt-6 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {section.heading.replace(/^\[|\]$/g, "")}
            </h2>
          ) : isSub ? (
            <h3 className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">
              {section.heading}
            </h3>
          ) : (
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
              {section.heading}
            </h2>
          )}
        </>
      )}

      {paragraphs.map((p, i) => (
        <p
          key={i}
          className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 sm:text-[15px] dark:text-slate-300"
        >
          {p}
        </p>
      ))}

      {section.items.length > 0 && (
        <ul className="space-y-3">
          {section.items.map((item, i) => (
            <Item key={i} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Item({ item }: { item: PolicyItem }) {
  return (
    <li className="text-sm leading-relaxed text-slate-700 sm:text-[15px] dark:text-slate-300">
      <div>{item.text}</div>
      {item.subItems.length > 0 && (
        <ul className="mt-2 space-y-1.5 pl-1">
          {item.subItems.map((sub, i) => (
            <li
              key={i}
              className="flex gap-2 text-sm text-slate-600 dark:text-slate-400"
            >
              <span
                aria-hidden="true"
                className="shrink-0 text-slate-400 dark:text-slate-500"
              >
                -
              </span>
              <span>{sub}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function period(template: string, version: PastVersion, locale: Locale) {
  return template
    .replace("{from}", formatIsoDate(version.date, locale))
    .replace("{until}", formatIsoDate(version.until, locale));
}

function History({ doc, locale }: { doc: HistoryDoc; locale: Locale }) {
  const versions = legalHistory(doc, locale);
  if (versions.length === 0) return null;
  const copy = getMessages(locale).legal;
  return (
    <section
      aria-labelledby="policy-history"
      className="mt-14 space-y-3.5 border-t border-slate-200 pt-8 dark:border-white/10"
    >
      <h2
        id="policy-history"
        className="text-lg font-bold text-slate-900 sm:text-xl dark:text-white"
      >
        {copy.history}
      </h2>
      <p className="text-sm leading-relaxed text-slate-700 sm:text-[15px] dark:text-slate-300">
        {copy.historyLead}
      </p>
      <ul className="space-y-2">
        {versions.map((version) => (
          <li key={version.date}>
            <Link
              href={historyPath(doc, locale, version.date)}
              className="text-sm text-brand-blue underline underline-offset-4 sm:text-[15px] dark:text-brand-green"
            >
              {period(copy.period, version, locale)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

type PolicyRendererProps = {
  data: PolicyData;
  locale?: Locale;
  /** 넘기면 문서 끝에 이전 버전 목록을 단다(#174) */
  doc?: HistoryDoc;
  /** 이전 버전 페이지면 맨 위에 적용 기간과 현재 버전 링크를 단다 */
  archived?: { version: PastVersion; currentHref: string };
};

export default function PolicyRenderer({
  data,
  locale = "ko",
  doc,
  archived,
}: PolicyRendererProps) {
  const copy = getMessages(locale).legal;
  // Skip redundant first section that just restates title + date
  const sections = data.sections.filter((section, i) => {
    if (i === 0 && !section.heading && section.content.includes(data.title)) {
      return false;
    }
    return true;
  });

  return (
    <section className="py-16 transition-colors duration-500 sm:py-24">
      <Container>
        <article className="mx-auto max-w-3xl">
          {archived && (
            <p
              role="note"
              className="mb-8 rounded-2xl border border-brand-blue/30 bg-brand-blue-bg px-5 py-4 text-sm leading-relaxed text-slate-700 dark:border-brand-green/40 dark:bg-app-black-900 dark:text-slate-300"
            >
              {period(copy.archivedNotice, archived.version, locale)}{" "}
              <Link
                href={archived.currentHref}
                className="font-semibold text-brand-blue underline underline-offset-4 dark:text-brand-green"
              >
                {copy.viewCurrent}
              </Link>
            </p>
          )}
          <header className="border-b border-slate-200 pb-8 dark:border-white/10">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              {data.title}
            </h1>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              {copy.effectiveDate}: {data.effectiveDate}
            </p>
          </header>

          <div className="mt-10 space-y-8">
            {sections.map((section, i) => (
              <Section key={i} section={section} />
            ))}
          </div>

          {doc && !archived && <History doc={doc} locale={locale} />}
        </article>
      </Container>
    </section>
  );
}
