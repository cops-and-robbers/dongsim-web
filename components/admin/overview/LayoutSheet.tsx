"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { XIcon } from "@/components/admin/icons";
import { CardPicker } from "@/components/admin/overview/CardPicker";
import { cellsOf, MAX_CELLS, presetCards, type CardKey } from "@/lib/admin/overview/cards";
import type { Member, Team } from "@/lib/admin/team";
import { saveLayout } from "@/lib/admin/teamClient";

// 내 개요 구성 (docs/admin-ui.md "내 개요 구성"). 역할 편집과 같은 카드 고르기로 나에게만 보일 카드를 고친다.

export function LayoutSheet({ team, current, custom, onClose, onSaved }: { team: Team; current: CardKey[]; custom: boolean; onClose: () => void; onSaved: (member: Member, before: string[] | null) => void }) {
  const [keys, setKeys] = useState<CardKey[]>(current);
  const [note, setNote] = useState<{ text: string; bad?: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const mine = team.roles.filter((r) => team.me.roleKeys.includes(r.key));
  const defaults = presetCards(mine.map((r) => r.cards));
  const dirty = keys.join() !== current.join();
  const used = cellsOf(keys);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || leaving) return;
      if (dirty && !pending) setLeaving(true);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, pending, leaving, onClose]);

  const close = () => (dirty && !pending ? setLeaving(true) : onClose());

  const save = (cards: CardKey[] | null) => {
    setPending(true);
    setNote(null);
    saveLayout(cards, team.me.roleKeys)
      .then((member) => {
        onSaved(member, team.me.overviewCards);
        onClose();
      })
      .catch((e: Error) => {
        setNote({ text: e.message, bad: true });
        setPending(false);
      });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 sm:p-4">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="layout-sheet-title"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        className="grid h-full w-full max-w-[1080px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-sd-fill shadow-2xl sm:h-[min(860px,100%)] sm:rounded-[22px]"
      >
        <header className="flex items-center gap-4 border-b border-sd-hairline bg-sd-surface px-4 py-3 sm:px-6 sm:py-3.5">
          <div className="min-w-0 flex-1">
            <h2 id="layout-sheet-title" className="truncate text-[18px] font-bold tracking-tight text-sd-fg">
              내 개요 구성
            </h2>
            <p className="truncate text-[12.5px] text-sd-fg-subtle">나에게만 저장돼요. 역할 기본 카드는 그대로예요.</p>
          </div>
          <button type="button" onClick={close} aria-label="닫기" className="grid size-9 shrink-0 place-items-center rounded-xl text-sd-fg-muted transition-colors hover:bg-sd-fill hover:text-sd-fg">
            <XIcon className="size-[18px]" />
          </button>
        </header>

        <div className="overflow-y-auto overscroll-contain md:overflow-hidden">
          <CardPicker keys={keys} onChange={setKeys} onNote={setNote} title="내 개요" starters={[...mine, ...team.roles.filter((r) => !mine.includes(r))]} emptyHint="고르지 않으면 맡은 역할의 기본 카드를 보여 드려요." />
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-sd-hairline bg-sd-surface px-4 py-3 sm:px-6">
          {custom && (
            <button type="button" disabled={pending} onClick={() => save(null)} className="mr-1 text-[13px] font-semibold text-sd-fg-muted hover:text-sd-fg hover:underline disabled:opacity-50">
              역할 기본값으로 되돌리기
            </button>
          )}
          <p role="status" className={`min-w-0 flex-1 basis-48 text-[13px] ${note?.bad ? "font-medium text-sd-critical" : "text-sd-fg-muted"}`}>
            {note?.text ?? (keys.length ? `카드 ${keys.length}장, ${used}/${MAX_CELLS}칸이에요.` : `비워 두면 역할 기본 카드 ${defaults.length}장을 보여 드려요.`)}
          </p>
          <span className="ml-auto flex gap-2">
            <Button variant="neutral" onClick={close} disabled={pending}>
              취소
            </Button>
            <Button onClick={() => save(keys.length ? keys : null)} disabled={pending || !dirty}>
              {pending ? "저장하는 중..." : "저장"}
            </Button>
          </span>
        </footer>
      </motion.div>
      <ConfirmDialog open={leaving} title="고친 내용을 버릴까요?" message="저장하지 않고 닫으면 고친 내용이 사라져요." confirmText="버리기" cancelText="계속 고치기" onConfirm={onClose} onClose={() => setLeaving(false)} />
    </div>
  );
}
