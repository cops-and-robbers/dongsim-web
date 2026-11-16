"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertIcon, CheckIcon, InfoIcon, SquarePenIcon } from "@/components/admin/icons";
import { subj, type NotesPanel as Panel } from "@/lib/release/board";
import type { Option } from "@/lib/release/options";

// App Store 카드 아래의 "새로운 기능"(출시 노트) 칸 (docs/admin-ui.md "새로운 기능").
// 읽는 순서: 무엇인가(제목, 버전) → 언어마다 쓴 글이 있나(한 줄 미리 보기) → 빈 언어 때문에 막히는 것 → 고치기.
// 언어 줄을 누르면 그 언어 칸에 바로 커서를 둔 채 편집 창이 열린다.

const SPRING = { type: "spring", stiffness: 420, damping: 34, mass: 0.8 } as const;

/** 한 줄 미리 보기. 줄머리의 "- ", "• " 를 떼고 줄 사이를 " · " 로 잇는다 */
export function previewLine(text: string): string {
  return text
    .split(/\n+/)
    .map((l) => l.trim().replace(/^[-•*·]\s*/, ""))
    .filter(Boolean)
    .join(" · ");
}

// 줄은 그리드로 둔다. 플렉스로 두면 긴 미리 보기 글이 카드의 최소 폭을 밀어 폰에서 카드가 화면 밖으로 넓어졌다
const ROW = "grid w-full grid-cols-[3rem_1rem_minmax(0,1fr)] items-center gap-2.5 px-3.5 py-2.5";

export function NotesPanel({
  notes,
  option,
  writable,
  readOnlyReason,
  onEdit,
}: {
  notes: Panel;
  /** 고칠 수 있을 때만 있다 */
  option?: Option;
  writable: boolean;
  readOnlyReason?: string;
  onEdit: (option: Option, focus?: string) => void;
}) {
  const missing = notes.langs.filter((l) => l.missing);
  const canEdit = notes.editable && !!option && writable;
  const done = missing.length === 0;
  return (
    <section aria-label="App Store 새로운 기능" className="min-w-0 border-t border-sd-hairline px-5 pb-5 pt-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 text-[13.5px] font-semibold text-sd-fg">
            새로운 기능
            <span className="rounded-md bg-sd-fill px-1.5 py-px text-[11.5px] font-semibold tabular-nums text-sd-fg-muted">{notes.version}</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={done ? "done" : "missing"}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.16 }}
                className={`text-[12px] font-semibold ${done ? "text-sd-positive" : notes.editable ? "text-sd-warning" : "text-sd-fg-subtle"}`}
              >
                {done ? "세 언어 모두 썼어요" : `${missing.length}개 언어 비어 있음`}
              </motion.span>
            </AnimatePresence>
          </h3>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-sd-fg-subtle">업데이트할 때 App Store 에 보이는 문구예요. 심사에 낼 때 함께 나가요.</p>
        </div>
        {notes.editable && option && (
          <button
            type="button"
            disabled={!canEdit}
            title={!writable ? readOnlyReason : undefined}
            onClick={() => onEdit(option, missing[0]?.language)}
            className="inline-flex h-8 flex-none items-center gap-1.5 rounded-[10px] bg-sd-surface px-3 text-[13px] font-semibold text-sd-fg ring-1 ring-inset ring-sd-line transition duration-150 hover:bg-sd-fill active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          >
            <SquarePenIcon className="size-3.5" />
            {done ? "고치기" : "쓰기"}
          </button>
        )}
      </div>

      <ul className="mt-3 divide-y divide-sd-hairline overflow-hidden rounded-xl ring-1 ring-inset ring-sd-line">
        {notes.langs.map((l) => {
          const row = (
            <>
              <span className="text-[12.5px] font-semibold text-sd-fg-muted">{l.label}</span>
              <span className={`flex size-4 items-center justify-center rounded-full ${l.missing ? (notes.editable ? "bg-sd-warning-weak text-sd-warning" : "bg-sd-fill text-sd-fg-subtle") : "bg-sd-positive-weak text-sd-positive"}`}>
                {l.missing ? <AlertIcon className="size-2.5" /> : <CheckIcon className="size-2.5" />}
              </span>
              <span className={`truncate text-[13px] ${l.missing ? "text-sd-fg-subtle" : "text-sd-fg"}`}>
                {l.noLocale ? "App Store Connect 에 이 언어가 없어요" : l.missing ? "비어 있어요" : previewLine(l.text)}
              </span>
            </>
          );
          return (
            <li key={l.language}>
              {canEdit && !l.noLocale ? (
                <button
                  type="button"
                  onClick={() => onEdit(option!, l.language)}
                  aria-label={`${l.label} 새로운 기능 ${l.missing ? "쓰기" : "고치기"}`}
                  className={`${ROW} text-left transition-colors hover:bg-sd-fill`}
                >
                  {row}
                </button>
              ) : (
                <div className={ROW}>{row}</div>
              )}
            </li>
          );
        })}
      </ul>

      <AnimatePresence initial={false}>
        {notes.editable && missing.length > 0 && (
          <motion.p
            key="block"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING}
            className="overflow-hidden text-[12.5px] leading-relaxed text-sd-warning"
          >
            <span className="block pt-2.5">{subj(missing.map((l) => l.label).join(", "))} 비어 있으면 애플이 심사 제출을 받지 않아요.</span>
          </motion.p>
        )}
      </AnimatePresence>

      {notes.locked && (
        <p className="mt-2.5 flex items-start gap-1.5 text-[12.5px] leading-relaxed text-sd-fg-subtle">
          <InfoIcon className="mt-[3px] size-3.5 flex-none" />
          {notes.locked}
        </p>
      )}
    </section>
  );
}
