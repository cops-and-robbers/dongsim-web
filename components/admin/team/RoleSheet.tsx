"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ArrowRightIcon, CheckIcon, ChevronLeftIcon, XIcon } from "@/components/admin/icons";
import { CardPicker } from "@/components/admin/overview/CardPicker";
import { RoleArt } from "@/components/admin/team/RoleArt";
import { RoleTile } from "@/components/admin/team/RolePicker";
import { useToast } from "@/components/admin/Toast";
import { cellsOf, MAX_CELLS, type CardKey } from "@/lib/admin/overview/cards";
import { fitCards } from "@/lib/admin/overview/layout";
import { DESC_MAX, ICON_GROUPS, isBuiltin, NAME_MAX, roleProblem, type Role, type RoleInput, type Team } from "@/lib/admin/team";
import { archiveRole, createRole, updateRole } from "@/lib/admin/teamClient";

// 역할 편집 창 (docs/admin-ui.md "역할과 카드"). 1 이름과 아이콘, 2 보여 줄 카드.
// 카드는 실제 모양 그대로 작게 보여 주고, 고르는 즉시 오른쪽 개요 미리보기에 놓는다. 숫자는 예시다.

const FIELD = "h-11 w-full rounded-xl border border-sd-line bg-sd-surface px-3.5 text-[15px] text-sd-fg outline-none transition-colors placeholder:text-sd-placeholder focus:border-accent";
export function RoleSheet({ role, team, onClose, onSaved }: { role: Role | null; team: Team; onClose: () => void; onSaved: (next: Team) => void }) {
  const toast = useToast();
  const builtin = !!role && isBuiltin(role.key);
  const [initial] = useState<RoleInput>(() => (role ? { name: role.name, description: role.description, icon: role.icon, cards: fitCards(role.cards) } : { name: "", description: "", icon: "sparkles", cards: [] }));
  const [draft, setDraft] = useState<RoleInput>(initial);
  const [step, setStep] = useState<1 | 2>(1);
  const [note, setNote] = useState<{ text: string; bad?: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const others = team.roles.filter((r) => r.key !== role?.key);
  const keys = fitCards(draft.cards);
  const used = cellsOf(keys);
  const problem = roleProblem(draft, others, builtin);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const holders = role ? team.members.filter((m) => m.roleKeys.includes(role.key)).length : 0;
  const isNew = !role;

  const set = (patch: Partial<RoleInput>) => setDraft((d) => ({ ...d, ...patch }));
  const setCards = (cards: CardKey[]) => {
    setNote(null);
    set({ cards });
  };
  const close = () => (dirty && !pending ? setLeaving(true) : onClose());

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape" || removing || leaving) return;
      if (dirty && !pending) setLeaving(true);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, pending, removing, leaving, onClose]);

  const next = () => {
    if (problem) {
      setNote({ text: problem, bad: true });
      nameRef.current?.focus();
      return;
    }
    setNote(null);
    setStep(2);
  };

  const save = () => {
    setPending(true);
    setNote(null);
    const input = { ...draft, cards: keys };
    (role ? updateRole(role, input) : createRole(input))
      .then((saved) => {
        onSaved({ ...team, roles: role ? team.roles.map((r) => (r.key === saved.key ? saved : r)) : [...team.roles, saved] });
        toast(`${saved.name} 역할을 ${role ? "저장했어요" : "만들었어요"}.`);
        onClose();
      })
      .catch((e: Error) => {
        setNote({ text: e.message, bad: true });
        setPending(false);
      });
  };

  const remove = () => {
    if (!role) return;
    setPending(true);
    archiveRole(role)
      .then(() => {
        const strip = (ks: string[]) => ks.filter((k) => k !== role.key);
        onSaved({ ...team, roles: others, members: team.members.map((m) => ({ ...m, roleKeys: strip(m.roleKeys) })), me: { ...team.me, roleKeys: strip(team.me.roleKeys) } });
        toast(`${role.name} 역할을 지웠어요.`);
        onClose();
      })
      .catch((e: Error) => {
        setNote({ text: e.message, bad: true });
        setRemoving(false);
        setPending(false);
      });
  };

  const tile: Role = { key: role?.key ?? "new", name: draft.name.trim() || "역할 이름", description: draft.description.trim() || "이 역할이 주로 하는 일", icon: draft.icon, cards: [], position: 0, updatedBy: "", updatedAt: "" };

  const stepButton = (n: 1 | 2, label: string) => (
    <button
      type="button"
      aria-current={step === n ? "step" : undefined}
      onClick={() => (n === 2 ? next() : setStep(1))}
      className={`inline-flex h-9 items-center gap-2 rounded-full pl-1.5 pr-3 text-[13px] transition-colors hover:bg-sd-fill ${step === n ? "font-semibold text-sd-fg" : "text-sd-fg-muted"}`}
    >
      <span className={`grid size-6 place-items-center rounded-full text-[12px] font-bold ${step === n ? "bg-accent text-accent-fg" : step > n ? "bg-accent-weak text-accent" : "bg-sd-fill"}`}>{step > n ? <CheckIcon className="size-3.5 [stroke-width:3]" /> : n}</span>
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 sm:p-4">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-sheet-title"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        className={`grid w-full max-w-[1080px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-sd-fill shadow-2xl sm:rounded-[22px] ${step === 1 ? "h-full sm:h-auto sm:max-h-full" : "h-full sm:h-[min(860px,100%)]"}`}
      >
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-sd-hairline bg-sd-surface px-4 py-3 sm:px-6 sm:py-3.5">
          <h2 id="role-sheet-title" className="min-w-0 flex-1 truncate text-[18px] font-bold tracking-tight text-sd-fg">
            {isNew ? "새 역할" : `${role.name} 역할 고치기`}
          </h2>
          <nav aria-label="단계" className="order-3 flex w-full items-center gap-1 sm:order-none sm:w-auto">
            {stepButton(1, "이름과 아이콘")}
            <span aria-hidden className="h-0.5 w-4 rounded bg-sd-line" />
            {stepButton(2, "보여 줄 카드")}
          </nav>
          <button type="button" onClick={close} aria-label="닫기" className="grid size-9 place-items-center rounded-xl text-sd-fg-muted transition-colors hover:bg-sd-fill hover:text-sd-fg">
            <XIcon className="size-[18px]" />
          </button>
        </header>

        <div className={`overscroll-contain ${step === 2 ? "overflow-y-auto md:overflow-hidden" : "overflow-y-auto"}`}>
          {step === 1 ? (
            <div className="grid gap-7 px-4 py-6 sm:px-7 md:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0 space-y-5">
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-bold text-sd-fg">역할 이름</span>
                  <input
                    ref={nameRef}
                    value={draft.name}
                    maxLength={NAME_MAX}
                    autoFocus
                    onChange={(e) => {
                      setNote(null);
                      set({ name: e.target.value });
                    }}
                    onKeyDown={(e) => e.key === "Enter" && next()}
                    placeholder="커뮤니티"
                    className={FIELD}
                  />
                  <span className="mt-1 block text-[12px] text-sd-fg-subtle">처음 고르는 화면과 운영진 목록에 이 이름이 보여요.</span>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-bold text-sd-fg">한 줄 설명</span>
                  <input value={draft.description} maxLength={DESC_MAX} onChange={(e) => set({ description: e.target.value })} onKeyDown={(e) => e.key === "Enter" && next()} placeholder="디스코드와 오픈채팅 응대" className={FIELD} />
                </label>
                {builtin ? (
                  <p className="text-[12.5px] text-sd-fg-subtle">처음부터 있는 역할이라 그림은 그대로예요.</p>
                ) : (
                  <div role="radiogroup" aria-label="아이콘">
                    <span className="mb-2 block text-[13px] font-bold text-sd-fg">아이콘</span>
                    <div className="space-y-2.5">
                      {ICON_GROUPS.map((g) => (
                        <div key={g.label} className="sm:flex sm:gap-3">
                          <span className="mb-1 block shrink-0 text-[12px] font-semibold text-sd-fg-subtle sm:mb-0 sm:w-16 sm:pt-2.5">{g.label}</span>
                          <div className="grid flex-1 grid-cols-6 gap-1 sm:grid-cols-10">
                            {g.icons.map((i) => (
                              <button key={i.key} type="button" role="radio" aria-checked={draft.icon === i.key} aria-label={i.label} title={i.label} onClick={() => set({ icon: i.key })} className={`grid h-10 place-items-center rounded-xl transition-colors ${draft.icon === i.key ? "bg-accent text-accent-fg" : "bg-sd-surface text-sd-fg-muted hover:bg-accent-weak hover:text-accent"}`}>
                                <RoleArt icon={i.key} className="size-5 [stroke-width:1.8]" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="md:sticky md:top-0 md:self-start">
                <span className="mb-2 block text-[13px] font-bold text-sd-fg">처음 고르는 화면에서는 이렇게 보여요</span>
                <div aria-hidden className="pointer-events-none max-w-[300px]">
                  <RoleTile role={tile} on={false} onToggle={() => undefined} />
                </div>
              </div>
            </div>
          ) : (
            <CardPicker keys={keys} onChange={setCards} onNote={setNote} title={`${draft.name.trim() || "이 역할"}의 개요`} starters={others} emptyHint="이 역할을 맡은 분의 개요가 여기 놓인 카드로 시작해요." />
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-sd-hairline bg-sd-surface px-4 py-3 sm:px-6">
          {step === 1 && role && !builtin && (
            <button type="button" onClick={() => setRemoving(true)} className="mr-1 text-[13px] font-semibold text-sd-critical hover:underline">
              이 역할 지우기
            </button>
          )}
          <p role="status" className={`min-w-0 flex-1 basis-48 text-[13px] ${note?.bad ? "font-medium text-sd-critical" : "text-sd-fg-muted"}`}>
            {note?.text ?? (step === 1 ? "다음 단계에서 이 역할의 개요에 보일 카드를 골라요." : keys.length ? `카드 ${keys.length}장, ${used}/${MAX_CELLS}칸을 골랐어요.` : "카드를 고르지 않으면 팀 기본 카드를 보여 드려요.")}
          </p>
          <span className="ml-auto flex gap-2">
            {step === 1 ? (
              <>
                <Button variant="neutral" onClick={close}>
                  취소
                </Button>
                <Button onClick={next}>
                  다음: 보여 줄 카드
                  <ArrowRightIcon className="size-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="neutral" onClick={() => setStep(1)} disabled={pending}>
                  <ChevronLeftIcon className="size-4" />
                  이전
                </Button>
                <Button onClick={save} disabled={pending || !!problem || (!isNew && !dirty)}>
                  {pending ? "저장하는 중..." : isNew ? "역할 만들기" : "저장"}
                </Button>
              </>
            )}
          </span>
        </footer>
      </motion.div>

      <ConfirmDialog open={removing} danger pending={pending} title={`${role?.name ?? ""} 역할을 지울까요?`} message={holders ? `맡고 있는 ${holders}명의 역할에서도 빠져요.` : "맡고 있는 분은 없어요."} confirmText="지우기" onConfirm={remove} onClose={() => setRemoving(false)} />
      <ConfirmDialog open={leaving} title="고친 내용을 버릴까요?" message="저장하지 않고 닫으면 고친 내용이 사라져요." confirmText="버리기" cancelText="계속 고치기" onConfirm={onClose} onClose={() => setLeaving(false)} />
    </div>
  );
}
