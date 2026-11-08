"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChangeDialog } from "@/components/admin/ChangeDialog";
import { AlertIcon, CheckIcon, ChevronDownIcon, ClockIcon } from "@/components/admin/icons";
import { ReleaseActionError, runReleaseAction } from "@/lib/admin/releaseClient";
import { obj } from "@/lib/release/board";
import { NOTE_LANGS, NOTE_MAX, ROLLOUT_STEPS, type Option } from "@/lib/release/options";

// 출시 조작 확인창 (docs/admin-ui.md "출시 조작").
// 읽는 순서: 무엇이 바뀌나(전 → 후) → 사실 세 줄(사용자에게 영향이 가나, 되돌릴 수 있나, 그다음) → 고를 것과 쓸 것 → 안전 확인(구글 검사, 번호 입력) → 버튼.
// - Play 새 출시는 넓은 화면에서 두 단: 왼쪽 무엇과 고르기와 안전 확인, 오른쪽 세 언어 출시 노트
// - Play 조작은 창을 열자마자 구글 검사(커밋 없음)를 돌려 통과해야 버튼이 켜진다
// - 단계 2는 버전 번호를 그대로 입력해야 켜진다. 입력이 필요한 창은 바로 입력 칸에 커서를 둔다
// 움직임은 짧게(0.15~0.3초), 뜻이 있는 곳에만. 기기의 "동작 줄이기"를 따른다(page.tsx 의 MotionConfig)

const pctLabel = (f: number) => (f >= 1 ? "모두에게(100%)" : `${Math.round(f * 1000) / 10}%`);
const SPRING = { type: "spring", stiffness: 420, damping: 34, mass: 0.8 } as const;
const FADE = { duration: 0.18, ease: [0.22, 1, 0.36, 1] } as const;

export function ActionDialog({ option, onDone, onClose }: { option: Option; onDone: (message: string) => void; onClose: () => void }) {
  const android = option.platform === "android";
  const isCreate = option.id === "android.createRelease";
  const isRaise = option.id === "android.rolloutSet";
  const raiseChoices = isRaise ? ROLLOUT_STEPS.filter((f) => f > (option.params.fraction ?? 0)) : [];
  // 새 출시는 "모두에게"가 기본(지금까지 우리 출시는 모두 100%). 일부에게 먼저는 접어 둔다
  const [fraction, setFraction] = useState<number | undefined>(isCreate ? 1 : isRaise ? raiseChoices[0] : undefined);
  const [staged, setStaged] = useState(false);
  const [typed, setTyped] = useState("");
  const [check, setCheck] = useState<{ state: "running" | "ok" | "fail"; message?: string } | null>(android ? { state: "running" } : null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);

  // 출시 노트. 한국어는 내부 테스트에 CI 가 넣은 것으로 채우고, 나머지는 지난 출시 문구를 흐리게 보여 준다
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(NOTE_LANGS.map((l) => [l.language, option.params.notes?.find((n) => n.language === l.language)?.text ?? ""])),
  );
  const noteList = NOTE_LANGS.map((l) => ({ language: l.language, text: notes[l.language] ?? "" }));
  const tooLong = noteList.some((n) => [...n.text].length > NOTE_MAX);

  // Play 는 고른 비율로 구글 검사를 다시 돌린다(커밋하지 않는다)
  useEffect(() => {
    if (!android) return;
    let alive = true;
    runReleaseAction({ id: option.id, expect: option.expect, fraction, dryRun: true })
      .then((r) => alive && setCheck({ state: "ok", message: r.message }))
      .catch((e: Error) => alive && setCheck({ state: "fail", message: e.message }));
    return () => {
      alive = false;
    };
  }, [android, option.id, option.expect, fraction]);

  // 번호를 입력해야 하는 창은 바로 입력 칸으로(입력이 꼭 필요해서 실수 위험이 늘지 않는다)
  useEffect(() => {
    if (option.level === 2 && !isCreate) inputRef.current?.focus();
  }, [option.level, isCreate]);

  const pickFraction = (f: number) => {
    if (f === fraction) return;
    setFraction(f);
    setCheck({ state: "running" });
  };

  const lockOk = option.level === 1 || typed.trim() === option.confirmWord;
  const checkOk = !android || check?.state === "ok";
  const notesOk = !isCreate || !tooLong;

  const confirm = () => {
    setPending(true);
    setError(undefined);
    runReleaseAction({ id: option.id, expect: option.expect, fraction, confirm: typed.trim(), ...(isCreate ? { notes: noteList } : {}) })
      .then((r) => onDone(r.message))
      .catch((e: Error) => {
        setError(e instanceof ReleaseActionError && e.stale ? `${e.message} 창을 닫으면 새로 읽어요.` : e.message);
        setPending(false);
      });
  };

  const changes = [
    ...(option.changes ?? []),
    ...(isRaise && fraction ? [{ key: "rate", label: "받는 사람", before: pctLabel(option.params.fraction ?? 0), after: pctLabel(fraction) }] : []),
  ];

  const left = (
    <div className="space-y-5">
      <p className="text-[15px] leading-relaxed text-sd-fg">{option.what}</p>

      {changes.length > 0 && (
        <dl className="space-y-2 rounded-xl bg-sd-fill px-4 py-3">
          {changes.map((c) => (
            <div key={c.key}>
              <dt className="text-[12px] font-medium text-sd-fg-subtle">{c.label}</dt>
              <dd className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[14.5px]">
                <span className="text-sd-fg-subtle line-through decoration-sd-gray-400">{c.before}</span>
                <span aria-hidden className="text-sd-fg-subtle">→</span>
                <span className="sr-only">바뀐 뒤 </span>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={c.after} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={FADE} className="font-semibold text-sd-fg">
                    {c.after}
                  </motion.span>
                </AnimatePresence>
              </dd>
            </div>
          ))}
        </dl>
      )}

      <ul className="space-y-2 text-[13.5px] leading-relaxed">
        <Fact tone={option.reachesUsers ? "bad" : "good"} title={option.reachesUsers ? "사용자에게 영향이 가요" : "사용자에게 영향이 없어요"} />
        <Fact tone={/되돌릴 수 없어요|내릴 수 없어요/.test(option.undo) ? "bad" : "good"} title={option.undo} />
        {option.then && <Fact tone="info" title={option.then} />}
      </ul>

      {isCreate && (
        <Section title="누구에게 낼까요">
          <p className="text-[13.5px] text-sd-fg">
            {staged ? (
              <>
                새 버전을 <b className="font-semibold">{pctLabel(fraction ?? 1)}</b>에게 먼저 내요. 나머지는 지금 버전을 계속 받아요.
              </>
            ) : (
              <>
                승인 뒤 게시하면 <b className="font-semibold">모든 Android 사용자</b>가 받아요. 지금까지 우리 출시는 모두 이 방식이었어요.
              </>
            )}
          </p>
          <button
            type="button"
            disabled={pending}
            aria-expanded={staged}
            onClick={() => {
              const next = !staged;
              setStaged(next);
              pickFraction(next ? 0.2 : 1);
            }}
            className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-sd-fg-muted transition hover:text-sd-fg"
          >
            {staged ? "모두에게 바로 내기로 돌아가기" : "일부에게 먼저 내기(단계적 출시)"}
            <motion.span animate={{ rotate: staged ? 180 : 0 }} transition={SPRING} className="inline-flex">
              <ChevronDownIcon className="size-4" />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {staged && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING} className="overflow-hidden">
                <div className="pt-3">
                  <PercentPicker choices={ROLLOUT_STEPS} value={fraction} disabled={pending} onPick={pickFraction} />
                  <p className="mt-2 text-[12.5px] leading-relaxed text-sd-fg-subtle">
                    큰 변경이라 문제가 걱정될 때 써요. 괜찮으면 출시 화면에서 비율을 올리거나 바로 모두에게 낼 수 있어요. 사용자가 적으면 일부만으로는 문제를 알아채기 어렵고, 옛 버전과 새 버전이 오래 섞여요.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Section>
      )}

      {isRaise && (
        <Section title="얼마나 올릴까요">
          <PercentPicker choices={raiseChoices} value={fraction} disabled={pending} onPick={pickFraction} />
          <p className="mt-2 text-[12.5px] text-sd-fg-subtle">새 버전을 받는 사람의 비율이에요. 비율은 내릴 수 없어요.</p>
        </Section>
      )}

      {(android || option.level === 2) && (
        <Section title="안전 확인">
          <div className="space-y-2.5">
            {check && <CheckRow check={check} />}
            {option.level === 2 && (
              <label className="block">
                <span className="text-[13px] text-sd-fg-muted">
                  확인하려면 <b className="font-bold text-sd-fg">{option.confirmWord}</b>
                  {obj(option.confirmWord).slice(option.confirmWord.length)} 그대로 입력해 주세요
                </span>
                <span className="relative mt-1.5 block">
                  <input
                    ref={inputRef}
                    value={typed}
                    disabled={pending}
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing && lockOk && checkOk && notesOk && !pending) confirm();
                    }}
                    inputMode="decimal"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={option.confirmWord}
                    className={`h-11 w-full rounded-xl border bg-sd-surface px-3.5 pr-10 text-[16px] font-semibold tabular-nums text-sd-fg outline-none transition-colors duration-200 placeholder:font-normal placeholder:text-sd-placeholder ${
                      lockOk ? "border-sd-positive" : "border-sd-line focus:border-accent"
                    }`}
                  />
                  <AnimatePresence>
                    {lockOk && (
                      <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={SPRING} className="absolute right-3 top-1/2 -translate-y-1/2 text-sd-positive">
                        <CheckIcon className="size-5" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </label>
            )}
          </div>
        </Section>
      )}
    </div>
  );

  return (
    <ChangeDialog
      title={option.label}
      size={isCreate ? "xl" : "lg"}
      danger={option.reachesUsers}
      confirmText={option.label}
      pendingText="스토어에 보내는 중..."
      confirmDisabled={!lockOk || !checkOk || !notesOk}
      pending={pending}
      error={error}
      onConfirm={confirm}
      onClose={onClose}
    >
      {isCreate ? (
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-8">
          {left}
          <NotesEditor notes={notes} setNotes={setNotes} lastNotes={option.params.lastNotes ?? []} disabled={pending} />
        </div>
      ) : (
        <div className="mt-4">{left}</div>
      )}
    </ChangeDialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[12.5px] font-semibold uppercase tracking-wide text-sd-fg-subtle">{title}</h3>
      {children}
    </section>
  );
}

function Fact({ tone, title }: { tone: "good" | "bad" | "info"; title: string }) {
  const style = tone === "good" ? "bg-sd-positive-weak text-sd-positive" : tone === "bad" ? "bg-sd-critical-weak text-sd-critical" : "bg-sd-info-weak text-sd-info";
  const Icon = tone === "good" ? CheckIcon : tone === "bad" ? AlertIcon : ClockIcon;
  return (
    <li className="flex items-start gap-2.5">
      <span className={`mt-[1px] flex size-5 flex-none items-center justify-center rounded-full ${style}`}>
        <Icon className="size-3" />
      </span>
      <span className="text-sd-fg">{title}</span>
    </li>
  );
}

/** 구글 검사 상태. 검사 중 → 통과/실패로 부드럽게 바뀐다 */
function CheckRow({ check }: { check: { state: "running" | "ok" | "fail"; message?: string } }) {
  const style = check.state === "ok" ? "bg-sd-positive-weak" : check.state === "fail" ? "bg-sd-critical-weak" : "bg-sd-fill";
  return (
    <motion.div layout transition={SPRING} className={`overflow-hidden rounded-xl px-3.5 py-2.5 transition-colors duration-300 ${style}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p key={check.state} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={FADE} className="flex items-start gap-2 text-[13px] leading-relaxed text-sd-fg">
          {check.state === "running" ? (
            <span className="mt-[3px] size-3.5 flex-none animate-spin rounded-full border-2 border-sd-gray-400 border-t-sd-fg-muted" />
          ) : check.state === "ok" ? (
            <CheckIcon className="mt-0.5 size-4 flex-none text-sd-positive" />
          ) : (
            <AlertIcon className="mt-0.5 size-4 flex-none text-sd-critical" />
          )}
          <span>
            {check.state === "running" ? "구글 검사 중이에요. 스토어는 바뀌지 않아요." : check.state === "ok" ? "구글 검사를 통과했어요. 아직 아무것도 바뀌지 않았어요." : `구글이 받지 않아요. ${check.message ?? ""}`}
          </span>
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}

/** Play 출시 노트 세 언어. 글자 수, 빈 언어, ** 경고 */
function NotesEditor({
  notes,
  setNotes,
  lastNotes,
  disabled,
}: {
  notes: Record<string, string>;
  setNotes: (fn: (m: Record<string, string>) => Record<string, string>) => void;
  lastNotes: { language: string; text: string }[];
  disabled: boolean;
}) {
  return (
    <Section title="출시 노트(업데이트 문구)">
      <div className="space-y-3.5">
        {NOTE_LANGS.map((l) => {
          const text = notes[l.language] ?? "";
          const last = lastNotes.find((n) => n.language === l.language)?.text.trim();
          const len = [...text].length;
          const warn = !text.trim() ? "비어 있어요. 이 언어 사용자에게는 업데이트 문구 없이 나가요." : text.includes("**") ? "Play 는 ** 같은 굵은 글씨 표시를 그대로 보여 줘요." : null;
          return (
            <label key={l.language} className="block">
              <span className="flex items-baseline justify-between">
                <span className="text-[13.5px] font-semibold text-sd-fg">{l.label}</span>
                <span className={`text-[12px] tabular-nums transition-colors ${len > NOTE_MAX ? "font-semibold text-sd-critical" : "text-sd-fg-subtle"}`}>
                  {len}/{NOTE_MAX}
                </span>
              </span>
              <textarea
                value={text}
                disabled={disabled}
                onChange={(e) => setNotes((m) => ({ ...m, [l.language]: e.target.value }))}
                rows={4}
                placeholder={last ? `지난 출시 문구\n${last}` : "비우면 이 언어는 업데이트 문구 없이 나가요"}
                className="mt-1.5 w-full resize-y rounded-xl border border-sd-line bg-sd-surface px-3.5 py-2.5 text-[14px] leading-relaxed text-sd-fg outline-none transition-colors duration-200 placeholder:text-sd-placeholder focus:border-accent"
              />
              <AnimatePresence initial={false}>
                {warn && (
                  <motion.span key={warn} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={FADE} className="block overflow-hidden text-[12px] text-sd-warning">
                    <span className="block pt-1">{warn}</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </label>
          );
        })}
        <p className="text-[12px] leading-relaxed text-sd-fg-subtle">한국어는 내부 테스트 빌드에 CI 가 넣은 문구예요. 흐린 글씨는 지금 나가 있는 출시의 문구예요.</p>
      </div>
    </Section>
  );
}

/** 단계적 출시 비율 고르기. "1%" 옆에 "100명 중 1명"도 써서 크기가 바로 읽히게. 고른 칸은 미끄러지듯 옮겨 간다 */
function PercentPicker({ choices, value, disabled, onPick }: { choices: number[]; value?: number; disabled: boolean; onPick: (f: number) => void }) {
  return (
    <div className={`grid gap-1.5 ${choices.length >= 5 ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-3 sm:grid-cols-4"}`}>
      {choices.map((f) => {
        const on = value === f;
        return (
          <button
            key={f}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onPick(f)}
            className="group relative min-w-0 rounded-lg px-2.5 py-1.5 text-left transition-transform active:scale-[0.97]"
          >
            {on && <motion.span layoutId="pct-pill" transition={SPRING} className="absolute inset-0 rounded-lg bg-sd-inverted-bg" />}
            {!on && <span className="absolute inset-0 rounded-lg bg-sd-fill transition-colors group-hover:bg-sd-gray-300" />}
            <span className={`relative block text-[13.5px] font-semibold tabular-nums transition-colors ${on ? "text-sd-inverted-fg" : "text-sd-fg-muted"}`}>{pctLabel(f)}</span>
            <span className={`relative block whitespace-nowrap text-[10.5px] transition-colors ${on ? "text-sd-inverted-fg/80" : "text-sd-fg-subtle"}`}>{`${Math.round(1 / f)}명 중 1명`}</span>
          </button>
        );
      })}
    </div>
  );
}
