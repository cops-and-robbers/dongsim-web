import Badge from "@/components/ui/Badge";
import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import type { Messages } from "@/lib/i18n/messages";

// 주요 연혁 + 수상 및 선정 이력. 장식 없이 날짜·제목·수상 라벨만으로 정렬한
// 미니멀 리스트(SEED식). 날짜는 차분한 회색 모노, 포인트는 수상 배지에만.
type Record = { date: string; title: string; award?: string };

function RecordList({ items }: { items: readonly Record[] }) {
  return (
    <div
      role="list"
      className="divide-y divide-slate-200 dark:divide-white/10"
    >
      {items.map((r, i) => (
        <ScrollReveal key={i} animation="fadeInUp" delayMs={i * 60}>
          <div role="listitem" className="flex items-baseline gap-4 py-4">
            <time className="w-24 shrink-0 font-mono text-sm font-semibold tabular-nums text-slate-400 dark:text-slate-500">
              {r.date}
            </time>
            {/* 모바일: 배지가 제목 아래로(일관). 데스크탑: 제목 오른쪽으로. */}
            <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-4">
              <p className="min-w-0 text-base font-semibold text-slate-900 sm:flex-1 sm:text-lg dark:text-white">
                {r.title}
              </p>
              {r.award && (
                <Badge variant="soft" className="mt-1.5 shrink-0 sm:mt-0">
                  {r.award}
                </Badge>
              )}
            </div>
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
}

export default function TeamRecordsSection({
  copy,
}: {
  copy: Messages["team"]["records"];
}) {
  return (
    <section className="bg-slate-50 py-24 transition-colors duration-500 sm:py-32 dark:bg-app-black-900">
      <Container>
        <div className="grid gap-16 md:grid-cols-2 md:gap-20">
          <div>
            <ScrollReveal animation="fadeInUp">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                {copy.historyHeading}
              </h2>
            </ScrollReveal>
            <div className="mt-8">
              <RecordList items={copy.history} />
            </div>
          </div>

          <div>
            <ScrollReveal animation="fadeInUp">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                {copy.awardsHeading}
              </h2>
            </ScrollReveal>
            <div className="mt-8">
              <RecordList items={copy.awards} />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
