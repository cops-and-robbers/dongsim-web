import type { ReactNode } from "react";
import Badge from "@/components/ui/Badge";
import Container from "@/components/ui/Container";
import ScrollReveal from "@/components/ui/ScrollReveal";
import type { Messages } from "@/lib/i18n/messages";
import type { PublicRecord, PublicRecords } from "@/lib/company/model";

// 주요 연혁 + 수상 및 선정 이력. 장식 없이 날짜·제목·수상 라벨만으로 정렬한
// 미니멀 리스트. 날짜는 차분한 회색 모노, 포인트는 수상 배지에만.
// 값은 어드민 "동심지키미 소개"에서 고친다(#250). 어드민 미리보기도 RecordColumn 을 그대로 그린다.

// 줄이 늘어도 끝쪽이 한참 뒤에 나타나지 않게 등장 지연에 상한을 둔다
const MAX_STAGGER = 6;

function Reveal({ on, delayMs, children }: { on: boolean; delayMs?: number; children: ReactNode }) {
  if (!on) return <div>{children}</div>;
  return (
    <ScrollReveal animation="fadeInUp" delayMs={delayMs}>
      {children}
    </ScrollReveal>
  );
}

function RecordList({ items, reveal }: { items: readonly PublicRecord[]; reveal: boolean }) {
  return (
    <div
      role="list"
      className="divide-y divide-slate-200 dark:divide-white/10"
    >
      {items.map((r, i) => (
        <Reveal key={r.id} on={reveal} delayMs={Math.min(i, MAX_STAGGER) * 60}>
          <div role="listitem" data-spot-id={r.id} className="flex items-baseline gap-4 py-4">
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
        </Reveal>
      ))}
    </div>
  );
}

export function RecordColumn({
  heading,
  items,
  reveal = true,
}: {
  heading: string;
  items: readonly PublicRecord[];
  reveal?: boolean;
}) {
  return (
    <div>
      <Reveal on={reveal}>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          {heading}
        </h2>
      </Reveal>
      <div className="mt-8">
        <RecordList items={items} reveal={reveal} />
      </div>
    </div>
  );
}

export default function TeamRecordsSection({
  copy,
  records,
}: {
  copy: Messages["team"]["records"];
  records: PublicRecords;
}) {
  return (
    <section className="bg-slate-50 py-24 transition-colors duration-500 sm:py-32 dark:bg-app-black-900">
      <Container>
        <div className="grid gap-16 md:grid-cols-2 md:gap-20">
          <RecordColumn heading={copy.historyHeading} items={records.history} />
          <RecordColumn heading={copy.awardsHeading} items={records.awards} />
        </div>
      </Container>
    </section>
  );
}
