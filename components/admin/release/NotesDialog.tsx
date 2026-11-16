"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChangeDialog } from "@/components/admin/ChangeDialog";
import { AlertIcon, CheckIcon } from "@/components/admin/icons";
import { ReleaseActionError, runReleaseAction } from "@/lib/admin/releaseClient";
import { subj } from "@/lib/release/board";
import { changedNotes, IOS_NOTE_MAX, NOTE_LANGS, type Option } from "@/lib/release/options";

// App Store 새로운 기능(출시 노트) 쓰기 창 (docs/admin-ui.md "새로운 기능").
// 읽는 순서: 무엇을 쓰나(한 줄) → 사실 두 줄(사용자에게 아직 안 보임, 다시 고칠 수 있음) → 세 언어 칸 → 바뀌는 언어 → 저장.
// - 언어 칸마다 글자 수와 상태(그대로, 바뀜, 비어 있음)를 붙여, 저장 전에 무엇이 바뀌는지 한눈에 보이게 한다
// - 같은 버전의 Play 출시 노트가 있으면 그 언어 칸에서 바로 가져올 수 있다(두 스토어 문구를 맞추기 쉽게)
// - 저장하지 않은 글이 있으면 닫기를 한 번 더 확인한다. Ctrl(⌘)+Enter 로 저장한다
// - 서버는 저장하는 순간 애플을 다시 읽어, 이 창을 연 뒤 누가 고쳤으면 덮어쓰지 않는다(options.ts expect)

const FADE = { duration: 0.18, ease: [0.22, 1, 0.36, 1] } as const;

type Notes = Record<string, string>;
const clean = (t: string) => t.replace(/\r\n/g, "\n").trim();

export function NotesDialog({
  option,
  focus,
  suggestion = [],
  onDone,
  onClose,
}: {
  option: Option;
  /** 처음 커서를 둘 언어 */
  focus?: string;
  /** 같은 버전의 Play 출시 노트 */
  suggestion?: { language: string; text: string }[];
  onDone: (message: string) => void;
  onClose: () => void;
}) {
  const before = useMemo(() => Object.fromEntries(NOTE_LANGS.map((l) => [l.language, option.params.notes?.find((n) => n.language === l.language)?.text ?? ""])) as Notes, [option.params.notes]);
  const [notes, setNotes] = useState<Notes>(before);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [leaving, setLeaving] = useState(false);
  const refs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const list = NOTE_LANGS.map((l) => ({ language: l.language, text: clean(notes[l.language] ?? "") }));
  const changed = changedNotes(NOTE_LANGS.map((l) => ({ language: l.language, text: clean(before[l.language] ?? "") })), list);
  const tooLong = list.some((n) => [...n.text].length > IOS_NOTE_MAX);
  const empty = NOTE_LANGS.filter((l) => !list.find((n) => n.language === l.language)?.text);
  const dirty = changed.length > 0;
  const canSave = dirty && !tooLong && !pending;

  // 고르고 들어온 언어 칸에 바로 커서를 둔다. 글 끝에 둬서 이어 쓰기 쉽게
  useEffect(() => {
    const el = refs.current[focus ?? NOTE_LANGS[0].language];
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [focus]);

  const save = () => {
    if (!canSave) return;
    setPending(true);
    setError(undefined);
    runReleaseAction({ id: option.id, expect: option.expect, notes: list })
      .then((r) => onDone(r.message))
      .catch((e: Error) => {
        setError(e instanceof ReleaseActionError && e.stale ? `${e.message} 지금 쓴 글은 그대로 있어요. 복사해 두고 창을 닫으면 새로 읽어요.` : e.message);
        setPending(false);
      });
  };

  // 저장하지 않은 글을 한 번에 버리지 않게, 첫 닫기는 확인만 한다
  const close = () => {
    if (pending) return;
    if (dirty && !leaving) {
      setLeaving(true);
      return;
    }
    onClose();
  };

  return (
    <ChangeDialog
      title={`${option.confirmWord} 새로운 기능`}
      size="xl"
      confirmText={dirty ? `${changed.length}개 언어 저장하기` : "저장하기"}
      pendingText="App Store 에 저장하는 중..."
      confirmDisabled={!canSave}
      pending={pending}
      error={error}
      onConfirm={save}
      onClose={close}
    >
      <div
        className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] lg:gap-8"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
            e.preventDefault();
            save();
          }
        }}
      >
        <div className="space-y-5">
          <p className="text-[15px] leading-relaxed text-sd-fg">업데이트할 때 App Store 에 보이는 문구예요. 이번 버전에서 달라진 점을 중요한 것부터 써요.</p>
          <ul className="space-y-2 text-[13.5px] leading-relaxed">
            <Fact title="저장해도 사용자에게는 아직 안 보여요" detail="심사에 낼 때 함께 나가요." />
            <Fact title="심사에 내기 전까지 언제든 다시 고칠 수 있어요" />
          </ul>

          <section>
            <h3 className="mb-2 text-[12.5px] font-semibold uppercase tracking-wide text-sd-fg-subtle">바뀌는 언어</h3>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p key={changed.map((c) => c.language).join() || "none"} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={FADE} className="text-[14px] text-sd-fg">
                {dirty ? NOTE_LANGS.filter((l) => changed.some((c) => c.language === l.language)).map((l) => l.label).join(", ") : <span className="text-sd-fg-subtle">아직 바꾼 언어가 없어요</span>}
              </motion.p>
            </AnimatePresence>
          </section>

          <AnimatePresence initial={false}>
            {empty.length > 0 && (
              <motion.div key="empty" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={FADE} className="overflow-hidden">
                <p className="flex items-start gap-2 rounded-xl bg-sd-warning-weak px-3.5 py-2.5 text-[13px] leading-relaxed text-sd-fg">
                  <AlertIcon className="mt-0.5 size-4 flex-none text-sd-warning" />
                  <span>
                    {subj(empty.map((l) => l.label).join(", "))} 비어 있어요. 이대로 저장할 수는 있지만, 애플은 세 언어가 다 차야 심사 제출을 받아요.
                  </span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {leaving && dirty && (
              <motion.div key="leave" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={FADE} className="overflow-hidden">
                <p role="alert" className="rounded-xl bg-sd-critical-weak px-3.5 py-2.5 text-[13px] leading-relaxed text-sd-fg">
                  저장하지 않은 글이 있어요. 한 번 더 닫으면 쓴 글은 사라져요.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="hidden text-[12px] text-sd-fg-subtle lg:block">Ctrl(⌘) + Enter 로 저장해요.</p>
        </div>

        <div className="space-y-4">
          {NOTE_LANGS.map((l) => {
            const text = notes[l.language] ?? "";
            const len = [...clean(text)].length;
            const was = clean(before[l.language] ?? "");
            const now = clean(text);
            const state = now === was ? (now ? "same" : "empty") : "changed";
            const play = suggestion.find((s) => s.language === l.language)?.text.trim();
            const offer = play && play !== now;
            const warn = !now ? null : now.includes("**") ? "App Store 는 ** 같은 굵은 글씨 표시를 글자 그대로 보여 줘요." : null;
            return (
              <div key={l.language}>
                <div className="flex items-center gap-2">
                  <label htmlFor={`notes-${l.language}`} className="text-[13.5px] font-semibold text-sd-fg">
                    {l.label}
                  </label>
                  <StateChip state={state} />
                  {offer && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setNotes((m) => ({ ...m, [l.language]: play }));
                        setLeaving(false);
                        refs.current[l.language]?.focus();
                      }}
                      className="ml-1 rounded-md px-1.5 py-0.5 text-[12px] font-semibold text-accent transition hover:bg-accent-weak disabled:opacity-50"
                    >
                      Play 노트 가져오기
                    </button>
                  )}
                  <span className={`ml-auto text-[12px] tabular-nums transition-colors ${len > IOS_NOTE_MAX ? "font-semibold text-sd-critical" : "text-sd-fg-subtle"}`}>
                    {len.toLocaleString()}/{IOS_NOTE_MAX.toLocaleString()}
                  </span>
                </div>
                <textarea
                  id={`notes-${l.language}`}
                  ref={(el) => {
                    refs.current[l.language] = el;
                  }}
                  value={text}
                  disabled={pending}
                  onChange={(e) => {
                    setNotes((m) => ({ ...m, [l.language]: e.target.value }));
                    setLeaving(false);
                  }}
                  rows={5}
                  placeholder={play ? `Play 출시 노트\n${play}` : "이번 버전에서 달라진 점을 써 주세요"}
                  className={`mt-1.5 w-full resize-y rounded-xl border bg-sd-surface px-3.5 py-2.5 text-[14px] leading-relaxed text-sd-fg outline-none transition-colors duration-200 placeholder:text-sd-placeholder focus:border-accent ${
                    state === "changed" ? "border-accent/50" : "border-sd-line"
                  }`}
                />
                <AnimatePresence initial={false}>
                  {warn && (
                    <motion.span key={warn} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={FADE} className="block overflow-hidden text-[12px] text-sd-warning">
                      <span className="block pt-1">{warn}</span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </ChangeDialog>
  );
}

function StateChip({ state }: { state: "same" | "changed" | "empty" }) {
  const style = { same: "bg-sd-fill text-sd-fg-subtle", changed: "bg-accent-weak text-accent", empty: "bg-sd-warning-weak text-sd-warning" }[state];
  const label = { same: "그대로", changed: "바뀜", empty: "비어 있음" }[state];
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span key={state} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.14 }} className={`rounded-md px-1.5 py-px text-[11px] font-semibold ${style}`}>
        {label}
      </motion.span>
    </AnimatePresence>
  );
}

function Fact({ title, detail }: { title: string; detail?: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-[1px] flex size-5 flex-none items-center justify-center rounded-full bg-sd-positive-weak text-sd-positive">
        <CheckIcon className="size-3" />
      </span>
      <span className="text-sd-fg">
        {title}
        {detail && <span className="text-sd-fg-muted"> {detail}</span>}
      </span>
    </li>
  );
}
