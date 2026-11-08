"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/admin/Button";
import { CardNote, EmptyBlock, SearchInput, SectionCard } from "@/components/admin/Parts";
import { ChevronRightIcon } from "@/components/admin/icons";
import { Pill } from "@/components/admin/StatusBadge";
import { formatDateTime } from "@/lib/admin/format";
import type { AuditRow, Candidate } from "@/lib/company/adminApi";
import {
  KIND_LABEL,
  attendanceCounts,
  boardOf,
  formatRecordDate,
  missingLocales,
  nameKey,
  participation,
  showsGithub,
  sortRecords,
  type CompanyRecord,
  type CreditPerson,
  type RecordBoard,
} from "@/lib/company/model";
import { LOCALE_KOREAN } from "./fields";

// 동심지키미 소개 목록들 (#250). 줄을 누르면 왼쪽이 입력 칸으로 바뀌고 오른쪽 미리보기는 그대로 남는다.

const ROW = "flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-sd-pressed focus-visible:bg-sd-pressed focus-visible:outline-none";
const LIST = "divide-y divide-sd-hairline";

export function CandidatesCard({ items, writable, busyId, onUse, onSkip }: { items: Candidate[]; writable: boolean; busyId: number | null; onUse: (c: Candidate) => void; onSkip: (c: Candidate) => void }) {
  if (items.length === 0) return null;
  return (
    <SectionCard title={`올릴 일정 ${items.length}개`} flush>
      <ul className={LIST}>
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-sd-fg">{item.label}</p>
              <p className="mt-0.5 text-[12px] tabular-nums text-sd-fg-subtle">
                {item.day.replaceAll("-", ".")} · {item.category === "event" ? "행사" : "QA"}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button size="sm" variant="neutral" disabled={!writable || busyId === item.id} onClick={() => onSkip(item)}>
                건너뛰기
              </Button>
              <Button size="sm" disabled={!writable || busyId === item.id} onClick={() => onUse(item)}>
                올리기
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t border-sd-hairline px-5 py-3 text-[12px] leading-relaxed text-sd-fg-subtle">날짜가 지난 행사와 QA 일정이에요. 일정 이름은 내부용이라 사이트에 보일 이름으로 다듬어서 올려 주세요.</p>
    </SectionCard>
  );
}

export function RecordsCard({ board, records, writable, onAdd, onOpen }: { board: RecordBoard; records: CompanyRecord[]; writable: boolean; onAdd: () => void; onOpen: (r: CompanyRecord) => void }) {
  const rows = sortRecords(board, records.filter((r) => boardOf(r.kind) === board));
  return (
    <SectionCard
      title={board === "history" ? "걸어온 길" : "수상과 선정"}
      flush
      right={
        <Button size="sm" disabled={!writable} onClick={onAdd}>
          추가
        </Button>
      }
    >
      {rows.length === 0 ? (
        <EmptyBlock title="아직 올린 이력이 없어요" description="추가 버튼으로 첫 이력을 넣어 주세요." />
      ) : (
        <ul className={LIST}>
          {rows.map((row) => (
            <li key={row.id}>
              <button type="button" className={ROW} onClick={() => onOpen(row)}>
                <span className="w-[76px] shrink-0 font-mono text-[13px] font-semibold tabular-nums text-sd-fg-subtle">{formatRecordDate(row.occurredOn, row.precision)}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[14px] font-semibold ${row.visible ? "text-sd-fg" : "text-sd-fg-subtle"}`}>
                    {row.title.ko}
                    {row.badge.ko && <span className="ml-1.5 font-medium text-sd-fg-muted">{row.badge.ko}</span>}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    <Pill tone="slate">{KIND_LABEL[row.kind]}</Pill>
                    {!row.visible && <Pill tone="amber">숨김</Pill>}
                    {missingLocales(row).map((locale) => (
                      <Pill key={locale} tone="amber">
                        {LOCALE_KOREAN[locale]} 없음
                      </Pill>
                    ))}
                  </span>
                </span>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-sd-fg-subtle" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <CardNote>{board === "history" ? "걸어온 길은 오래된 이력부터 보여요." : "수상과 선정은 최근 이력부터 보여요."}</CardNote>
    </SectionCard>
  );
}

export function PeopleCard({ people, records, writable, onAdd, onOpen }: { people: CreditPerson[]; records: CompanyRecord[]; writable: boolean; onAdd: () => void; onOpen: (p: CreditPerson) => void }) {
  const [query, setQuery] = useState("");
  const counts = useMemo(() => attendanceCounts(records), [records]);
  const rows = useMemo(() => {
    const key = nameKey(query);
    const withCount = people.map((person) => ({ person, count: participation(person, counts.get(person.id) ?? 0) }));
    return withCount
      .filter(({ person }) => !key || nameKey(person.name).includes(key))
      .sort((a, b) => Number(b.person.role === "infra") - Number(a.person.role === "infra") || b.count - a.count || a.person.id - b.person.id);
  }, [people, counts, query]);

  return (
    <SectionCard
      title={`명단 ${people.length}명`}
      flush
      right={
        <Button size="sm" disabled={!writable} onClick={onAdd}>
          추가
        </Button>
      }
    >
      <div className="border-b border-sd-hairline px-5 py-3">
        <SearchInput value={query} onChange={setQuery} placeholder="이름으로 찾기" />
      </div>
      {people.length === 0 ? (
        <EmptyBlock title="아직 명단에 아무도 없어요" />
      ) : rows.length === 0 ? (
        <EmptyBlock title="찾는 이름이 없어요" />
      ) : (
        <ul className={LIST}>
          {rows.map(({ person, count }) => (
            <li key={person.id}>
              <button type="button" className={ROW} onClick={() => onOpen(person)}>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[14px] font-semibold ${person.visible ? "text-sd-fg" : "text-sd-fg-subtle"}`}>{person.name}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    <Pill tone={person.role === "infra" ? "blue" : "slate"}>{person.role === "infra" ? "인프라 제공" : `QA ${count}회`}</Pill>
                    {person.github && (showsGithub(person.role, count) ? <Pill tone="green">GitHub 링크 표시 중</Pill> : <Pill tone="slate">QA에 2회 이상 참여하면 GitHub 링크가 보여요</Pill>)}
                    {!person.visible && <Pill tone="amber">숨김</Pill>}
                  </span>
                </span>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-sd-fg-subtle" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

const ACTION: Record<AuditRow["action"], string> = { create: "추가했어요", update: "고쳤어요", delete: "지웠어요" };

export function AuditCard({ rows }: { rows: AuditRow[] }) {
  if (rows.length === 0) return null;
  return (
    <SectionCard title="최근 수정 기록" flush>
      <ul className={LIST}>
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-5 py-2.5 text-[13px]">
            <span className="text-sd-fg">
              {row.target === "record" ? `${row.targetId}번 이력을 ` : `${row.action === "create" ? "명단에" : "명단에서"} ${row.targetId}번을 `}{ACTION[row.action]}
            </span>
            <span className="text-[12px] tabular-nums text-sd-fg-subtle">
              {row.actor} · {formatDateTime(row.at)}
            </span>
          </li>
        ))}
      </ul>
      <CardNote>명단은 이름을 남기지 않고 번호만 남겨요.</CardNote>
    </SectionCard>
  );
}
