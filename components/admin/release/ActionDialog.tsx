"use client";

import { useEffect, useState } from "react";
import { ChangeDialog } from "@/components/admin/ChangeDialog";
import { CheckIcon } from "@/components/admin/icons";
import { ReleaseActionError, runReleaseAction } from "@/lib/admin/releaseClient";
import { obj } from "@/lib/release/board";
import { NOTE_LANGS, NOTE_MAX, ROLLOUT_STEPS, type Option } from "@/lib/release/options";

// 출시 조작 확인창 (docs/admin-ui.md "출시 조작").
// 무엇이 일어나는지, 되돌릴 수 있는지, 사용자에게 닿는지를 먼저 보여 준다.
// - Play 조작은 창을 열자마자 구글 검사(커밋 없음)를 돌려 통과해야 버튼이 켜진다
// - 단계 2(되돌릴 수 없거나 사용자에게 닿는 것)는 버전 번호를 그대로 입력해야 켜진다

const pctLabel = (f: number) => (f >= 1 ? "모두에게(100%)" : `${Math.round(f * 1000) / 10}%`);

export function ActionDialog({ option, onDone, onClose }: { option: Option; onDone: (message: string) => void; onClose: () => void }) {
  const android = option.platform === "android";
  const choices =
    option.id === "android.createRelease" ? [1, ...ROLLOUT_STEPS] : option.id === "android.rolloutSet" ? ROLLOUT_STEPS.filter((f) => f > (option.params.fraction ?? 0)) : null;
  // 새 출시는 "모두에게"가 기본(지금까지 우리 출시는 모두 100%)
  const [fraction, setFraction] = useState<number | undefined>(choices?.[0]);
  const [typed, setTyped] = useState("");
  const [check, setCheck] = useState<{ state: "idle" | "running" | "ok" | "fail"; message?: string }>({ state: android ? "running" : "idle" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  // 출시 노트. 한국어는 내부 테스트에 CI 가 넣은 것으로 채우고, 나머지는 지난 출시 문구를 흐리게 보여 준다
  const isCreate = option.id === "android.createRelease";
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

  const lockOk = option.level === 1 || typed.trim() === option.confirmWord;
  const checkOk = !android || check.state === "ok";
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

  return (
    <ChangeDialog
      title={option.label}
      danger={option.reachesUsers}
      confirmText={option.label}
      pendingText="스토어에 보내는 중..."
      confirmDisabled={!lockOk || !checkOk || !notesOk}
      pending={pending}
      error={error}
      onConfirm={confirm}
      onClose={onClose}
    >
      <div className="mt-3 space-y-3">
        <p className="text-[14px] leading-relaxed text-sd-fg">{option.what}</p>
        <ul className="space-y-1.5 text-[13px]">
          <li className="flex items-center gap-2">
            <span className={`rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold ${option.reachesUsers ? "bg-sd-critical-weak text-sd-critical" : "bg-sd-positive-weak text-sd-positive"}`}>
              {option.reachesUsers ? "사용자에게 닿아요" : "사용자에게 닿지 않아요"}
            </span>
          </li>
          <li className="text-sd-fg-muted">{option.undo}</li>
        </ul>

        {isCreate && (
          <fieldset>
            <legend className="text-[12.5px] font-semibold text-sd-fg-muted">누구에게 낼까요</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {[
                { full: true, title: "모두에게 바로", sub: "게시하면 모든 Android 사용자가 받아요" },
                { full: false, title: "일부에게 먼저", sub: "고른 비율만 먼저 받고, 나머지는 지금 버전을 받아요" },
              ].map((c) => {
                const on = c.full ? (fraction ?? 1) >= 1 : (fraction ?? 1) < 1;
                return (
                  <button
                    key={c.title}
                    type="button"
                    aria-pressed={on}
                    disabled={pending}
                    onClick={() => {
                      if (on) return;
                      setFraction(c.full ? 1 : 0.2);
                      setCheck({ state: "running" });
                    }}
                    className={`rounded-xl px-3 py-2.5 text-left transition ${on ? "bg-sd-inverted-bg text-sd-inverted-fg" : "bg-sd-fill text-sd-fg hover:bg-sd-gray-300"}`}
                  >
                    <span className="block text-[13.5px] font-semibold">{c.title}</span>
                    <span className={`mt-0.5 block text-[11.5px] leading-snug ${on ? "opacity-80" : "text-sd-fg-subtle"}`}>{c.sub}</span>
                  </button>
                );
              })}
            </div>
            {fraction !== undefined && fraction < 1 && (
              <PercentPicker choices={ROLLOUT_STEPS} value={fraction} disabled={pending} onPick={(f) => {
                setFraction(f);
                setCheck({ state: "running" });
              }} />
            )}
            <p className="mt-2 text-[12px] leading-relaxed text-sd-fg-subtle">
              {fraction !== undefined && fraction < 1
                ? "단계적 출시예요. 큰 업데이트라 문제가 걱정될 때 일부에게 먼저 내고, 괜찮으면 출시 화면에서 비율을 올리거나 바로 모두에게 낼 수 있어요."
                : "지금까지 우리 출시는 모두 이 방식이었어요. 관리형 게시라 승인된 뒤 게시 개요에서 게시해야 나가요."}
            </p>
          </fieldset>
        )}

        {option.id === "android.rolloutSet" && choices && (
          <fieldset>
            <legend className="text-[12.5px] font-semibold text-sd-fg-muted">얼마나 올릴까요</legend>
            <PercentPicker choices={choices} value={fraction} disabled={pending} onPick={(f) => {
              setFraction(f);
              setCheck({ state: "running" });
            }} />
            <p className="mt-2 text-[12px] leading-relaxed text-sd-fg-subtle">새 버전을 받는 사람의 비율이에요. 지금은 {pctLabel(option.params.fraction ?? 0)}예요. 비율은 내릴 수 없어요.</p>
          </fieldset>
        )}

        {isCreate && (
          <fieldset className="space-y-2.5">
            <legend className="text-[12.5px] font-semibold text-sd-fg-muted">출시 노트(업데이트 문구)</legend>
            {NOTE_LANGS.map((l) => {
              const text = notes[l.language] ?? "";
              const last = option.params.lastNotes?.find((n) => n.language === l.language)?.text.trim();
              const len = [...text].length;
              return (
                <label key={l.language} className="block">
                  <span className="flex items-baseline justify-between text-[12px]">
                    <span className="font-semibold text-sd-fg">{l.label}</span>
                    <span className={`tabular-nums ${len > NOTE_MAX ? "font-semibold text-sd-critical" : "text-sd-fg-subtle"}`}>
                      {len}/{NOTE_MAX}
                    </span>
                  </span>
                  <textarea
                    value={text}
                    disabled={pending}
                    onChange={(e) => setNotes((m) => ({ ...m, [l.language]: e.target.value }))}
                    rows={3}
                    placeholder={last ? `지난 출시 문구\n${last}` : "비우면 이 언어는 업데이트 문구 없이 나가요"}
                    className="mt-1 w-full resize-y rounded-xl border border-sd-line bg-sd-surface px-3 py-2 text-[13px] leading-relaxed text-sd-fg outline-none placeholder:text-sd-placeholder focus:border-accent"
                  />
                  {!text.trim() && <span className="text-[11.5px] text-sd-warning">비어 있어요. 이 언어 사용자에게는 업데이트 문구 없이 나가요.</span>}
                  {text.includes("**") && <span className="text-[11.5px] text-sd-warning">Play 는 ** 같은 굵은 글씨 표시를 그대로 보여 줘요.</span>}
                </label>
              );
            })}
            <p className="text-[11.5px] text-sd-fg-subtle">한국어는 내부 테스트 빌드에 CI 가 넣은 문구예요. 흐린 글씨는 지금 나가 있는 출시의 문구예요.</p>
          </fieldset>
        )}

        {android && (
          <p
            className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
              check.state === "ok" ? "bg-sd-positive-weak text-sd-fg" : check.state === "fail" ? "bg-sd-critical-weak text-sd-fg" : "bg-sd-fill text-sd-fg-muted"
            }`}
          >
            {check.state === "ok" && <CheckIcon className="mt-0.5 size-4 flex-none text-sd-positive" />}
            {check.state === "running" ? "구글 검사 중이에요(스토어는 바뀌지 않아요)..." : check.state === "ok" ? "구글 검사를 통과했어요. 아직 아무것도 바뀌지 않았어요." : `구글이 받지 않아요. ${check.message ?? ""}`}
          </p>
        )}

        {option.level === 2 && (
          <label className="block">
            <span className="text-[12.5px] font-semibold text-sd-fg-muted">
              확인하려면 <b className="font-bold text-sd-fg">{option.confirmWord}</b>
              {obj(option.confirmWord).slice(option.confirmWord.length)} 그대로 입력해 주세요
            </span>
            <input
              value={typed}
              disabled={pending}
              onChange={(e) => setTyped(e.target.value)}
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              className="mt-1.5 h-10 w-full rounded-xl border border-sd-line bg-sd-surface px-3 text-[15px] font-semibold tabular-nums text-sd-fg outline-none focus:border-accent"
              placeholder={option.confirmWord}
            />
          </label>
        )}
      </div>
    </ChangeDialog>
  );
}

/** 단계적 출시 비율 고르기. "1%" 대신 "100명 중 1명"도 같이 써서 크기가 바로 읽히게 */
function PercentPicker({ choices, value, disabled, onPick }: { choices: number[]; value?: number; disabled: boolean; onPick: (f: number) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {choices.map((f) => (
        <button
          key={f}
          type="button"
          aria-pressed={value === f}
          disabled={disabled}
          onClick={() => onPick(f)}
          className={`rounded-lg px-3 py-1.5 text-left transition ${value === f ? "bg-sd-inverted-bg text-sd-inverted-fg" : "bg-sd-fill text-sd-fg-muted hover:bg-sd-gray-300"}`}
        >
          <span className="block text-[13px] font-semibold tabular-nums">{pctLabel(f)}</span>
          <span className={`block text-[10.5px] ${value === f ? "opacity-80" : "text-sd-fg-subtle"}`}>{Math.round(100 / (f * 100)) === 1 ? "모두" : `${Math.round(1 / f)}명 중 1명`}</span>
        </button>
      ))}
    </div>
  );
}
