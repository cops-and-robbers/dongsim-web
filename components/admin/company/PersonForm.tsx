"use client";

import { Button } from "@/components/admin/Button";
import { Checkbox } from "@/components/admin/Checkbox";
import { SectionCard } from "@/components/admin/Parts";
import { formatDateTime } from "@/lib/admin/format";
import { PRIOR_MAX, participation, validatePerson, type PersonRole } from "@/lib/company/model";
import { Chips, Field, INPUT, Toggle, inputBorder } from "./fields";
import type { PersonEdit } from "./types";

// 고마운 분들 한 사람 (#250). GitHub 는 저장해 두어도 조건이 맞을 때만 사이트에 나간다.

// 프로필 주소를 통째로 붙여넣어도 아이디만 남긴다
const githubId = (v: string) => v.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\/+$/, "");

export function PersonForm({
  edit,
  attended,
  writable,
  pending,
  error,
  canSave,
  onChange,
  onBack,
  onSave,
  onDelete,
}: {
  edit: PersonEdit;
  attended: number;
  writable: boolean;
  pending: boolean;
  error?: string;
  canSave: boolean;
  onChange: (next: PersonEdit) => void;
  onBack: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const { draft } = edit;
  const problems = validatePerson(draft);
  const set = (patch: Partial<PersonEdit["draft"]>) => onChange({ ...edit, draft: { ...draft, ...patch } });
  const qa = draft.role === "qa";

  return (
    <SectionCard
      title={edit.id === null ? "새로 추가" : "정보 고치기"}
      right={
        <button type="button" onClick={onBack} className="text-[13px] font-semibold text-sd-fg-subtle transition hover:text-accent">
          목록으로
        </button>
      }
    >
      <div className="space-y-5">
        <Field label="이름" htmlFor="person-name" error={problems.name}>
          <input
            id="person-name"
            value={draft.name}
            disabled={!writable}
            aria-invalid={Boolean(problems.name)}
            onChange={(e) => onChange({ ...edit, draft: { ...draft, name: e.target.value }, duplicate: false, sameNameOk: false })}
            className={`${INPUT} ${inputBorder(Boolean(problems.name))}`}
          />
        </Field>

        <Field label="역할">
          <Chips<PersonRole>
            label="역할"
            options={[
              { value: "qa", label: "QA 참가자" },
              { value: "infra", label: "인프라 제공" },
            ]}
            value={draft.role}
            disabled={!writable}
            onChange={(role) => set({ role })}
          />
        </Field>

        {qa && (
          <Field label="이전 참여 횟수" htmlFor="person-prior" error={problems.priorCount} hint={`회차별 기록을 시작하기 전까지의 참여 횟수예요. 이전 참여 ${draft.priorCount}회와 회차 기록 ${attended}회를 합쳐 총 ${participation(draft, attended)}회예요.`}>
            <input
              id="person-prior"
              type="number"
              inputMode="numeric"
              min={0}
              max={PRIOR_MAX}
              value={Number.isNaN(draft.priorCount) ? "" : draft.priorCount}
              disabled={!writable}
              aria-invalid={Boolean(problems.priorCount)}
              onChange={(e) => set({ priorCount: e.target.value === "" ? Number.NaN : Number(e.target.value) })}
              className={`${INPUT} ${inputBorder(Boolean(problems.priorCount))} max-w-28 tabular-nums`}
            />
          </Field>
        )}

        <Field label="GitHub 아이디" htmlFor="person-github" error={problems.github} hint={qa ? "QA에 2회 이상 참여하면 사이트에 GitHub 링크가 보여요." : "인프라 제공자는 링크가 바로 보여요."}>
          <div className={`flex h-10 items-center overflow-hidden rounded-lg border bg-sd-surface transition-colors focus-within:border-accent ${inputBorder(Boolean(problems.github))}`}>
            <span className="shrink-0 bg-sd-fill px-3 text-[13px] leading-10 text-sd-fg-subtle">github.com/</span>
            <input
              id="person-github"
              value={draft.github}
              disabled={!writable}
              aria-invalid={Boolean(problems.github)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => set({ github: githubId(e.target.value) })}
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-[14px] text-sd-fg outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </Field>

        <Toggle label="사이트와 앱에 보이기" on={draft.visible} disabled={!writable} onChange={(visible) => set({ visible })} />

        {edit.duplicate && (
          <Checkbox checked={edit.sameNameOk} highlight={false} className="bg-sd-warning-weak" onChange={(sameNameOk) => onChange({ ...edit, sameNameOk })}>
            동명이인이에요
          </Checkbox>
        )}

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
                완전히 지우기
              </Button>
            )}
            <Button size="sm" variant="neutral" disabled={pending} onClick={onBack}>
              취소
            </Button>
            <Button size="sm" disabled={!writable || !canSave || pending || Object.keys(problems).length > 0 || (edit.duplicate && !edit.sameNameOk)} onClick={onSave}>
              {pending ? "저장 중이에요" : "저장"}
            </Button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
