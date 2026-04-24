import Container from "@/components/ui/Container";

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
          className="whitespace-pre-line text-sm leading-relaxed text-slate-700 sm:text-[15px] dark:text-slate-300"
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
                —
              </span>
              <span>{sub}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function PolicyRenderer({ data }: { data: PolicyData }) {
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
          <header className="border-b border-slate-200 pb-8 dark:border-white/10">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              {data.title}
            </h1>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              시행일: {data.effectiveDate}
            </p>
          </header>

          <div className="mt-10 space-y-8">
            {sections.map((section, i) => (
              <Section key={i} section={section} />
            ))}
          </div>
        </article>
      </Container>
    </section>
  );
}
