"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/admin/Button";
import { Checkbox } from "@/components/admin/Checkbox";
import { SearchInput, SectionCard } from "@/components/admin/Parts";
import { XIcon } from "@/components/admin/icons";
import { formatDateTime } from "@/lib/admin/format";
import {
  BADGE_MAX,
  BOARD_KINDS,
  KIND_LABEL,
  LOCALES,
  TITLE_MAX,
  attendanceCounts,
  boardOf,
  hasBadge,
  matchNames,
  nameKey,
  nextQaRound,
  parseNames,
  participation,
  qaTitle,
  validateRecord,
  type CompanyRecord,
  type CreditPerson,
  type NameMatch,
  type RecordKind,
  type RecordLocale,
  type RecordProblems,
} from "@/lib/company/model";
import { Chips, DateField, Field, LocaleFields, Toggle } from "./fields";
import type { RecordEdit } from "./types";

// 이력 하나를 넣고 고치는 칸 (#250). QA 면 참가자를 함께 고른다.

const errorsOf = (problems: RecordProblems, field: "title" | "badge") =>
  Object.fromEntries(LOCALES.map((l) => [l, problems[`${field}.${l}` as keyof RecordProblems]])) as Partial<Record<RecordLocale, string>>;

const SELECTION_BADGE = { ko: "선정", en: "Accepted", ja: "選定" };

export function RecordForm({
  edit,
  records,
  people,
  writable,
  pending,
  error,
  canSave,
  onChange,
  onBack,
  onSave,
  onDelete,
}: {
  edit: RecordEdit;
  records: CompanyRecord[];
  people: CreditPerson[];
  writable: boolean;
  pending: boolean;
  error?: string;
  canSave: boolean;
  onChange: (next: RecordEdit) => void;
  onBack: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const { draft } = edit;
  const problems = validateRecord(draft);
  const badge = hasBadge(draft.kind);
  const set = (patch: Partial<RecordEdit["draft"]>) => onChange({ ...edit, draft: { ...draft, ...patch } });

  const setKind = (kind: RecordKind) => {
    const patch: Partial<RecordEdit["draft"]> = { kind };
    if (kind === "qa" && !draft.title.ko.trim()) patch.title = qaTitle(nextQaRound(records));
    if (kind === "selection" && !draft.badge.ko.trim()) patch.badge = SELECTION_BADGE;
    set(patch);
  };

  return (
    <SectionCard
      title={edit.id === null ? "새 이력 추가" : "이력 고치기"}
      right={
        <button type="button" onClick={onBack} className="text-[13px] font-semibold text-sd-fg-subtle transition hover:text-accent">
          목록으로
        </button>
      }
    >
      <div className="space-y-5">
        <Field label="종류">
          <Chips label="이력 종류" options={BOARD_KINDS[boardOf(draft.kind)].map((value) => ({ value, label: KIND_LABEL[value] }))} value={draft.kind} disabled={!writable} onChange={setKind} />
        </Field>

        <DateField occurredOn={draft.occurredOn} precision={draft.precision} error={problems.date} disabled={!writable} onChange={set} />

        <LocaleFields
          id="record-title"
          label={badge ? "대회 이름" : "사이트에 보일 이름"}
          value={draft.title}
          max={TITLE_MAX}
          errors={errorsOf(problems, "title")}
          hint="영어와 일본어를 비워 두면 그 언어 페이지에는 보이지 않아요."
          disabled={!writable}
          onChange={(title) => set({ title })}
        />

        {badge && <LocaleFields id="record-badge" label="상 이름" value={draft.badge} max={BADGE_MAX} errors={errorsOf(problems, "badge")} disabled={!writable} onChange={(next) => set({ badge: next })} />}

        {draft.kind === "qa" && <AttendeePicker edit={edit} records={records} people={people} disabled={!writable} onChange={onChange} />}

        <Toggle label="사이트에 보이기" on={draft.visible} disabled={!writable} onChange={(visible) => set({ visible })} />

        {error && (
          <p role="alert" className="text-[13px] leading-relaxed text-sd-critical">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sd-hairline pt-4">
          <p className="text-[12px] text-sd-fg-subtle">
            {edit.updatedBy && edit.updatedAt && (
              <>
                마지막으로 고친 사람: {edit.updatedBy} (<span className="tabular-nums">{formatDateTime(edit.updatedAt)}</span>)
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            {edit.id !== null && (
              <Button size="sm" variant="neutral" disabled={!writable || pending} onClick={onDelete} className="text-sd-critical!">
                지우기
              </Button>
            )}
            <Button size="sm" variant="neutral" disabled={pending} onClick={onBack}>
              취소
            </Button>
            <Button size="sm" disabled={!writable || !canSave || pending || Object.keys(problems).length > 0} onClick={onSave}>
              {pending ? "저장 중이에요" : "저장"}
            </Button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

/** 참가자 고르기. 붙여넣으면 이미 있는 분, 새로운 분, 비슷한 이름으로 나눠 사람이 확인하게 한다 */
function AttendeePicker({ edit, records, people, disabled, onChange }: { edit: RecordEdit; records: CompanyRecord[]; people: CreditPerson[]; disabled: boolean; onChange: (next: RecordEdit) => void }) {
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [similar, setSimilar] = useState<Extract<NameMatch, { kind: "similar" }>[]>([]);
  const [result, setResult] = useState<{ existing: number; added: number } | null>(null);

  const chosen = new Set(edit.draft.attendees);
  const qaPeople = useMemo(() => people.filter((p) => p.role === "qa"), [people]);
  const found = useMemo(() => {
    const key = nameKey(query);
    return key ? qaPeople.filter((p) => nameKey(p.name).includes(key)) : qaPeople;
  }, [qaPeople, query]);
  const total = edit.draft.attendees.length + edit.newNames.length;
  // 이 회차를 뺀 참여 수. 고르는 순간 그 사람의 횟수가 몇이 되는지 줄에 보여 준다
  const otherCounts = useMemo(() => attendanceCounts(records.filter((r) => r.id !== edit.id)), [records, edit.id]);

  const update = (attendees: number[], newNames: string[]) => onChange({ ...edit, draft: { ...edit.draft, attendees: [...new Set(attendees)] }, newNames });
  const addNew = (name: string, names: string[]) => (names.some((n) => nameKey(n) === nameKey(name)) ? names : [...names, name]);

  const importNames = () => {
    const matches = matchNames(parseNames(text), people);
    let attendees = [...edit.draft.attendees];
    let newNames = [...edit.newNames];
    for (const match of matches) {
      if (match.kind === "existing") attendees = [...attendees, match.person.id];
      if (match.kind === "new") newNames = addNew(match.name, newNames);
    }
    update(attendees, newNames);
    setSimilar(matches.filter((m): m is Extract<NameMatch, { kind: "similar" }> => m.kind === "similar"));
    setResult({ existing: matches.filter((m) => m.kind === "existing").length, added: matches.filter((m) => m.kind === "new").length });
    setText("");
  };

  const resolve = (match: Extract<NameMatch, { kind: "similar" }>, same: boolean) => {
    if (same) update([...edit.draft.attendees, match.person.id], edit.newNames);
    else update(edit.draft.attendees, addNew(match.name, edit.newNames));
    setSimilar((list) => list.filter((m) => m !== match));
  };

  const toggle = (id: number) => update(chosen.has(id) ? edit.draft.attendees.filter((a) => a !== id) : [...edit.draft.attendees, id], edit.newNames);

  return (
    <div className="space-y-3 rounded-xl bg-sd-fill p-4">
      <div>
        <p className="text-[13px] font-semibold text-sd-fg">참가자 {total}명</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-sd-fg-subtle">이번 참여가 이미 참여 횟수에 포함된 분은 고르지 말아 주세요. 참가자를 비워 두면 걸어온 길에만 올라가요.</p>
      </div>

      {total > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {edit.draft.attendees.map((id) => {
            const person = people.find((p) => p.id === id);
            if (!person) return null;
            return <NameChip key={id} label={person.name} disabled={disabled} onRemove={() => toggle(id)} />;
          })}
          {edit.newNames.map((name) => (
            <NameChip key={name} label={name} tag="새로 추가" disabled={disabled} onRemove={() => update(edit.draft.attendees, edit.newNames.filter((n) => n !== name))} />
          ))}
        </ul>
      )}

      <div>
        <label htmlFor="attendee-paste" className="sr-only">
          참가자 이름 붙여넣기
        </label>
        <textarea
          id="attendee-paste"
          rows={2}
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          placeholder="이름을 쉼표나 줄바꿈으로 구분해서 붙여넣어 주세요."
          className="w-full resize-y rounded-lg border border-sd-line bg-sd-surface px-3 py-2 text-[14px] text-sd-fg outline-none transition-colors placeholder:text-sd-placeholder focus:border-accent"
        />
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <p aria-live="polite" className="text-[12px] text-sd-fg-subtle">
            {result && `이미 명단에 있어요 ${result.existing}명 · 새로 추가돼요 ${result.added}명`}
          </p>
          <Button size="sm" variant="neutral" disabled={disabled || !text.trim()} onClick={importNames}>
            참가자로 넣기
          </Button>
        </div>
      </div>

      {similar.map((match) => (
        <div key={match.name} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-sd-warning-weak px-3 py-2">
          <p className="text-[13px] text-sd-fg">
            <span className="font-semibold">{match.name}</span>님과 비슷한 이름이 있어요
          </p>
          <div className="flex gap-1.5">
            <Button size="sm" variant="neutral" onClick={() => resolve(match, true)}>
              {match.person.name}님이 맞아요
            </Button>
            <Button size="sm" variant="neutral" onClick={() => resolve(match, false)}>
              다른 분이에요
            </Button>
          </div>
        </div>
      ))}

      <div>
        <SearchInput value={query} onChange={setQuery} placeholder="이름으로 찾기" />
        <ul className="mt-2 grid max-h-56 grid-cols-1 gap-0.5 overflow-y-auto overscroll-contain rounded-lg border border-sd-line bg-sd-surface p-1.5 sm:grid-cols-2">
          {found.map((person) => {
            const on = chosen.has(person.id);
            const count = participation(person, (otherCounts.get(person.id) ?? 0) + (on ? 1 : 0));
            return (
              <li key={person.id}>
                <Checkbox
                  checked={on}
                  disabled={disabled}
                  onChange={() => toggle(person.id)}
                  right={<span className={`shrink-0 text-[12px] font-semibold tabular-nums ${on ? "text-accent" : "text-sd-fg-subtle"}`}>QA {count}회</span>}
                >
                  {person.name}
                </Checkbox>
              </li>
            );
          })}
          {found.length === 0 && <li className="col-span-full px-3 py-4 text-center text-[13px] text-sd-fg-subtle">찾는 이름이 없어요</li>}
        </ul>
      </div>
    </div>
  );
}

function NameChip({ label, tag, disabled, onRemove }: { label: string; tag?: string; disabled: boolean; onRemove: () => void }) {
  return (
    <li className="inline-flex items-center gap-1 rounded-md bg-sd-surface py-1 pl-2 pr-1 text-[13px] font-semibold text-sd-fg shadow-[0_0_0_1px_var(--sd-line)]">
      {label}
      {tag && <span className="text-[11px] font-semibold text-accent">{tag}</span>}
      <button type="button" aria-label={`${label} 빼기`} disabled={disabled} onClick={onRemove} className="rounded p-0.5 text-sd-fg-subtle transition hover:text-sd-critical">
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
