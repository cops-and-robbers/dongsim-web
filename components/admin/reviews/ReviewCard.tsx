"use client";

import { AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/admin/Button";
import { ChangeDialog } from "@/components/admin/ChangeDialog";
import { AppStoreMark, GooglePlayMark, StarIcon } from "@/components/admin/icons";
import { useToast } from "@/components/admin/Toast";
import { postReply, reopen, saveDraft, skip } from "@/lib/admin/reviewsClient";
import { refreshPendingCounts } from "@/lib/admin/usePendingCounts";
import { countOf, editedAfter, REPLY_MAX, replyProblem, stateOf, type Review } from "@/lib/reviews/model";

// 리뷰 한 장 (docs/admin-ui.md "리뷰"). 리뷰가 짧고 적어서 목록에서 바로 읽고 그 자리에서 답글을 쓴다.

const SAVE_DELAY = 800;
const TERRITORY: Record<string, string> = { KOR: "한국", USA: "미국", JPN: "일본", GBR: "영국", AUS: "호주", CAN: "캐나다" };
const languageName = new Intl.DisplayNames(["ko"], { type: "language" });

const placeOf = (r: Review) => {
  if (!r.place) return null;
  if (r.platform === "ios") return TERRITORY[r.place] ?? r.place;
  try {
    return languageName.of(r.place) ?? r.place;
  } catch {
    return r.place;
  }
};

function dateOf(iso: string) {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat("ko-KR", { ...(sameYear ? {} : { year: "numeric" }), month: "long", day: "numeric", timeZone: "Asia/Seoul" }).format(d);
}

function Stars({ rating }: { rating: number }) {
  return (
    <span role="img" aria-label={`별점 ${rating}점`} className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} className={`size-[15px] ${n <= rating ? "fill-current text-sd-warning" : "text-sd-gray-300"}`} />
      ))}
    </span>
  );
}

export function ReviewCard({ review: r, disabled, onChange }: { review: Review; disabled: boolean; onChange: (next: Review) => void }) {
  const toast = useToast();
  const state = stateOf(r);
  const [writing, setWriting] = useState(!!r.draft);
  const [text, setText] = useState(r.draft ?? "");
  const [original, setOriginal] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [savedDraft, setSavedDraft] = useState(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const key = { platform: r.platform, id: r.id };
  const max = REPLY_MAX[r.platform];
  const over = max !== null && countOf(text) > max;
  const problem = replyProblem(r.platform, text);
  const editing = !!r.reply;

  const write = (next: string) => {
    setText(next);
    setSavedDraft(false);
    // 이미 올린 답글을 고칠 때는 초안을 남기지 않는다. 다음에 열면 올라간 답글에서 시작한다
    if (disabled || editing) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      saveDraft(key, next.trim() ? next : null)
        .then(() => setSavedDraft(true))
        .catch((e: Error) => toast(e.message));
    }, SAVE_DELAY);
  };

  const run = (work: Promise<Review>, message: string) => {
    setPending(true);
    work
      .then((next) => {
        onChange(next);
        refreshPendingCounts();
        toast(message);
      })
      .catch((e: Error) => toast(e.message))
      .finally(() => setPending(false));
  };

  const send = () => {
    window.clearTimeout(timer.current);
    setPending(true);
    setError(undefined);
    postReply(key, text.trim())
      .then((next) => {
        setConfirming(false);
        setWriting(false);
        setText("");
        onChange(next);
        refreshPendingCounts();
        toast(editing ? "답글을 고쳤어요." : "답글을 올렸어요.");
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setPending(false));
  };

  const shown = r.translated && !original ? r.translated : r.body;
  const meta = [dateOf(r.reviewedAt), placeOf(r), r.appVersion, r.device].filter(Boolean).join(" · ");

  return (
    <article aria-label={`${r.author || "이름 없는 분"}의 리뷰`} className="rounded-2xl border border-sd-line bg-sd-surface px-5 py-4">
      <AnimatePresence>
        {confirming && (
          <ChangeDialog title={editing ? "답글을 고칠까요?" : "답글을 올릴까요?"} size="lg" confirmText={editing ? "고치기" : "올리기"} pendingText="올리는 중..." pending={pending} error={error} onConfirm={send} onClose={() => setConfirming(false)}>
            <p className="max-h-[40vh] overflow-y-auto whitespace-pre-line break-words rounded-[10px] bg-sd-fill px-3 py-2 text-[14px] leading-relaxed text-sd-fg">{text.trim()}</p>
            <p className="mt-3 text-[13px] leading-relaxed text-sd-fg-muted">스토어에 공개되고, 리뷰를 쓴 분이 알림을 받을 수 있어요. 올린 뒤에도 고칠 수 있어요.</p>
          </ChangeDialog>
        )}
      </AnimatePresence>

      <header className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <Stars rating={r.rating} />
        <span className="text-[14px] font-semibold text-sd-fg">{r.author || "이름 없는 분"}</span>
        <span className="text-[12.5px] text-sd-fg-subtle">{meta}</span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] font-medium text-sd-fg-muted">
          {r.platform === "ios" ? <AppStoreMark className="size-4" /> : <GooglePlayMark className="size-4" />}
          {r.platform === "ios" ? "App Store" : "Google Play"}
        </span>
      </header>

      {editedAfter(r) && <p className="mt-2 text-[12.5px] font-semibold text-sd-warning">끝낸 뒤에 리뷰가 고쳐졌어요. 다시 봐 주세요.</p>}
      {r.title && <h3 className="mt-2.5 text-[15px] font-bold text-sd-fg">{r.title}</h3>}
      <p className={`${r.title ? "mt-1" : "mt-2.5"} whitespace-pre-line break-words text-[15px] leading-relaxed text-sd-fg`}>{shown}</p>
      {r.translated && (
        <button type="button" onClick={() => setOriginal((v) => !v)} className="mt-1 text-[12.5px] font-semibold text-accent hover:underline">
          {original ? "번역 보기" : "원문 보기"}
        </button>
      )}

      {r.reply && !writing && (
        <div className="mt-3 rounded-xl bg-sd-fill px-3.5 py-2.5">
          <p className="text-[12.5px] font-semibold text-sd-fg-muted">
            우리 답글
            <span className="font-normal text-sd-fg-subtle">
              {r.replyBy ? ` · ${r.replyBy}` : ""}
              {r.replyAt ? ` · ${dateOf(r.replyAt)}` : ""}
              {r.replyState === "pending" ? " · 스토어에 올라가는 중" : ""}
            </span>
          </p>
          <p className="mt-1 whitespace-pre-line break-words text-[14px] leading-relaxed text-sd-fg">{r.reply}</p>
        </div>
      )}

      {state === "skipped" && !writing && <p className="mt-3 text-[13px] text-sd-fg-subtle">{r.skippedBy ? `${r.skippedBy}님이 답글 없이 넘겼어요.` : "답글 없이 넘겼어요."}</p>}

      {writing ? (
        <div className="mt-3">
          <textarea value={text} onChange={(e) => write(e.target.value)} disabled={disabled || pending} autoFocus={!r.draft} rows={3} aria-label="답글" placeholder="이 분께 남길 답글을 써 주세요" className={`block w-full resize-y rounded-xl border bg-sd-surface px-3.5 py-2.5 text-[14px] leading-relaxed text-sd-fg outline-none placeholder:text-sd-fg-subtle ${over ? "border-sd-critical" : "border-sd-line focus:border-accent"}`} />
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 text-[12.5px] text-sd-fg-subtle">
            <span>모두에게 공개돼요. 연락처 같은 개인정보와 광고는 쓸 수 없어요.</span>
            <span className={`tabular-nums ${over ? "font-semibold text-sd-critical" : ""}`}>
              {savedDraft && !over ? "초안에 저장했어요" : ""}
              {max !== null ? `${savedDraft && !over ? " · " : ""}${countOf(text)} / ${max}` : ""}
            </span>
          </div>
          <div className="mt-2.5 flex justify-end gap-2">
            <Button
              variant="neutral"
              size="sm"
              disabled={pending}
              onClick={() => {
                window.clearTimeout(timer.current);
                if (r.draft || (!editing && text.trim())) saveDraft(key, text.trim() ? text : null).then(onChange).catch(() => undefined);
                setWriting(false);
              }}
            >
              닫기
            </Button>
            <Button size="sm" disabled={disabled || pending || !!problem || (editing && text.trim() === r.reply)} onClick={() => setConfirming(true)}>
              {editing ? "고치기" : "답글 올리기"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          {state === "waiting" && !r.reply && (
            <Button variant="neutral" size="sm" disabled={disabled || pending} onClick={() => run(skip(key), "끝남으로 옮겼어요.")}>
              넘기기
            </Button>
          )}
          {state === "skipped" && (
            <Button variant="neutral" size="sm" disabled={disabled || pending} onClick={() => run(reopen(key), "답글 대기로 옮겼어요.")}>
              다시 대기로
            </Button>
          )}
          <Button
            size="sm"
            variant={r.reply ? "neutral" : "brand"}
            disabled={disabled || pending}
            onClick={() => {
              setText(r.draft ?? r.reply ?? "");
              setWriting(true);
            }}
          >
            {r.reply ? "답글 고치기" : "답글 쓰기"}
          </Button>
        </div>
      )}
    </article>
  );
}
