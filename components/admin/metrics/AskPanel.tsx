"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import { petSignal } from "@/lib/admin/pet/signal";
import type { Anim } from "@/lib/admin/pet/brain";
import { setPetBoxed, usePetBoxed } from "@/components/admin/pet/CheesePet";
import { PetSprite } from "@/components/admin/pet/PetSprite";
import { ArrowRightIcon, ArrowUpIcon, CalendarIcon, PackageIcon, SquarePenIcon, XIcon } from "@/components/admin/icons";
import { AnswerBody, rangeText, type Result } from "@/components/admin/metrics/AskAnswer";
import { TAB_SUGGESTIONS } from "@/lib/metrics/chat/suggest";
import type { View } from "@/lib/metrics/chat/instructions";
import type { Target } from "@/lib/metrics/chat/evidence";

/**
 * 지표 챗봇 패널 (#163). 지표 화면 옆에서 치즈에게 숫자를 묻는다.
 *
 * 처음 판(여섯째 탭, 그다음 옆 패널의 첫 모양)은 "AI 가 만든 화면" 같다는 말을 들었다(2026-10-10).
 * 섹션 제목을 단 카드, 알약 모양 추천 질문, "이 답이 도움이 됐나요?" 문장, 설명 단락이 겹겹이 쌓여 있었다.
 * 분석 도구의 챗봇들을 다시 보고 이렇게 바꿨다.
 * - 답은 숫자가 먼저다. 도구 결과를 지표 화면과 같은 모양으로 그리고, 눌러서 지표 화면의 같은 기간, 같은 탭으로 간다
 *   (Mixpanel Spark 는 답이 곧 보고서이고, Metabase Metabot 과 Amplitude 는 답의 차트를 눌러 원래 화면으로 연다)
 * - 지금 보는 탭과 기간을 입력창 위에 적어, 무엇을 기준으로 답하는지 묻기 전에 보인다(PostHog AI 의 현재 페이지 맥락)
 * - 비서는 치즈다. 말풍선 대신 치즈 얼굴 옆에 답을 두고, 찾는 동안 킁킁, 확인 못 한 답엔 갸웃, 연결 전엔 졸고 있다
 *   (PostHog 의 고슴도치처럼 캐릭터가 상태를 대신 말한다. 별 모양 반짝이 아이콘은 쓰지 않는다)
 * - 추천 질문은 알약 대신 줄 목록. 지금 탭에 맞춘 둘을 앞에 둔다
 *
 * - 넓은 화면(xl)은 본문 옆에 붙어 그래프를 가리지 않고, 그보다 좁으면 오른쪽에 겹쳐 열리고, 휴대폰은 아래에서 올라온다
 * - 닫아도 대화는 남는다(언마운트하지 않고 숨긴다). 서버 상태(남은 질문 수, 추천)는 처음 열 때 한 번 받는다
 * - data-pet-avoid: 돌아다니는 치즈가 이 패널을 피해 다닌다
 */

type Turn = { question: string; state: "loading" | "done" | "error"; result?: Result; error?: string; feedback?: "good" | "bad" };
type Info = { enabled: boolean; remainingToday: number; monthFull: boolean; suggestions: string[] };

const TAB_LABEL: Record<View["tab"], string> = { summary: "요약", instagram: "인스타그램", traffic: "유입 경로", store: "스토어", app: "앱과 광고" };
const MAX_SUGGESTIONS = 4;
// 남은 질문 수는 얼마 안 남았을 때만 알린다
const SHOW_REMAINING_UNDER = 6;

async function authed(url: string, init: RequestInit = {}): Promise<Response> {
  const send = () => fetch(url, { ...init, headers: { ...(init.headers ?? {}), "Content-Type": "application/json", Authorization: `Bearer ${getAccessToken() ?? ""}` }, cache: "no-store" });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  return res;
}

export function AskPanel({ open, onClose, view, onShow }: { open: boolean; onClose: () => void; view: View | null; onShow: (t: Target) => void }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const loadedFor = useRef(-1);
  const busy = turns.some((t) => t.state === "loading");
  const petBoxed = usePetBoxed();

  useEffect(() => {
    if (!open || loadedFor.current === attempt) return;
    loadedFor.current = attempt;
    authed("/api/admin/metrics/chat")
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as Info & { error?: string };
        if (!res.ok) setInfoError(body.error ?? `HTTP ${res.status}`);
        else {
          setInfoError(null);
          setInfo(body);
        }
      })
      .catch((e: unknown) => setInfoError(e instanceof Error ? e.message : String(e)));
  }, [open, attempt]);

  useEffect(() => {
    if (open && info?.enabled) inputRef.current?.focus();
  }, [open, info]);

  // 새 질문이 붙으면 패널 안만 맨 아래로. scrollIntoView 는 바깥 화면까지 움직이고,
  // 최근 Chrome 에선 Promise 를 돌려줘서 effect 에서 그대로 돌려주면 React 가 "destroy is not a function"으로 멈췄다(2026-10-10)
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setDraft("");
    if (inputRef.current) inputRef.current.style.height = "";
    petSignal("asking");
    const i = turns.length;
    setTurns((t) => [...t, { question, state: "loading" }]);
    const patch = (p: Partial<Turn>) => setTurns((t) => t.map((x, j) => (j === i ? { ...x, ...p } : x)));
    try {
      const res = await authed("/api/admin/metrics/chat", { method: "POST", body: JSON.stringify({ question, view }) });
      const body = (await res.json().catch(() => ({}))) as Result & { error?: string };
      if (!res.ok) {
        petSignal("error");
        return patch({ state: "error", error: body.error ?? `HTTP ${res.status}` });
      }
      petSignal(body.unverified.length ? "unverified" : "answered");
      patch({ state: "done", result: body });
      setInfo((x) => (x ? { ...x, remainingToday: Math.max(0, x.remainingToday - 1) } : x));
    } catch (e) {
      petSignal("error");
      patch({ state: "error", error: e instanceof Error ? e.message : String(e) });
    }
  };

  const feedback = async (i: number, value: "good" | "bad") => {
    const id = turns[i]?.result?.id;
    if (!id) return;
    setTurns((t) => t.map((x, j) => (j === i ? { ...x, feedback: value } : x)));
    petSignal(value === "good" ? "liked" : "disliked");
    await authed("/api/admin/metrics/chat", { method: "PATCH", body: JSON.stringify({ id, feedback: value }) }).catch(() => undefined);
  };

  const ready = !!info?.enabled && !infoError;
  const closed = !!info && (info.remainingToday === 0 || info.monthFull);
  const suggestions = info ? [...new Set([...(view ? TAB_SUGGESTIONS[view.tab] : []), ...info.suggestions])].slice(0, MAX_SUGGESTIONS) : [];
  const last = turns[turns.length - 1];
  const followUps = last?.state === "done" && last.result ? last.result.answer.followUps.slice(0, 3) : [];

  return (
    <aside
      data-pet-avoid
      aria-label="치즈에게 물어보기"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      className={`${open ? "flex" : "hidden"} fixed inset-x-0 bottom-0 z-40 h-[85dvh] flex-col rounded-t-2xl border border-sd-line bg-sd-surface shadow-xl sm:inset-y-0 sm:left-auto sm:right-0 sm:h-auto sm:w-[420px] sm:rounded-none sm:border-y-0 sm:border-r-0 xl:static xl:z-auto xl:h-full xl:shrink-0 xl:shadow-none`}
    >
      <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sd-hairline pl-4 pr-2">
        <PetSprite anim="idle" play={false} />
        <h2 className="min-w-0 flex-1 text-[15px] font-bold text-sd-fg">치즈에게 물어보기</h2>
        {turns.length > 0 && (
          <HeadButton label="새로 묻기" onClick={() => setTurns([])} disabled={busy}>
            <SquarePenIcon className="h-[17px] w-[17px]" />
          </HeadButton>
        )}
        <HeadButton label={petBoxed ? "치즈 꺼내기" : "치즈를 보관함에 넣기"} onClick={() => setPetBoxed(!petBoxed)}>
          <PackageIcon className="h-[17px] w-[17px]" />
        </HeadButton>
        <HeadButton label="닫기" onClick={onClose}>
          <XIcon className="h-[18px] w-[18px]" />
        </HeadButton>
      </header>

      <div ref={bodyRef} className="flex flex-1 flex-col overflow-y-auto px-4 py-5">
        {infoError ? (
          <Empty anim="sad" title="치즈를 부르지 못했어요" text={infoError}>
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="mt-3 text-[13px] font-semibold text-accent hover:underline">
              다시 부르기
            </button>
          </Empty>
        ) : info && !info.enabled ? (
          <Empty
            anim="sleep"
            title="치즈가 아직 자고 있어요"
            text="Gemini 연결을 마치면 깨어나요. 설정 순서는 docs/metrics-chat.md 에 있어요. 개발 서버에서는 .env.local 에 CHAT_MOCK=1 을 넣고 서버를 다시 켜면 가짜 답으로 볼 수 있어요."
          />
        ) : turns.length === 0 ? (
          <Empty anim="idle" title="이 기간 숫자, 무엇이 궁금해요?" text="지표 화면과 같은 숫자로 답하고, 답에 쓴 숫자가 맞는지 한 번 더 맞춰 봐요.">
            {ready && !closed && suggestions.length > 0 && (
              <ul className="mt-5 w-full divide-y divide-sd-hairline border-y border-sd-hairline text-left">
                {suggestions.map((s) => (
                  <li key={s}>
                    <SuggestRow onClick={() => ask(s)} disabled={busy}>
                      {s}
                    </SuggestRow>
                  </li>
                ))}
              </ul>
            )}
          </Empty>
        ) : (
          <ol className="flex flex-col gap-6">
            {turns.map((t, i) => (
              <li key={i} className="flex flex-col gap-3">
                <p className="max-w-[85%] self-end whitespace-pre-wrap rounded-2xl rounded-br-md bg-sd-fill px-3.5 py-2 text-[14px] leading-relaxed text-sd-fg">{t.question}</p>
                <div className="flex gap-2.5">
                  <PetSprite anim={faceOf(t)} play={t.state === "loading"} className="mt-[-2px]" />
                  {t.state === "loading" && <p className="pt-1 text-[14px] text-sd-fg-subtle">킁킁, 숫자를 찾고 있어요</p>}
                  {t.state === "error" && (
                    <div className="pt-1 text-[14px] text-sd-fg">
                      <p>답을 만들지 못했어요.</p>
                      <p className="mt-0.5 text-[12px] text-sd-fg-subtle">{t.error}</p>
                      <button type="button" disabled={busy || closed} onClick={() => ask(t.question)} className="mt-2 text-[13px] font-semibold text-accent hover:underline disabled:opacity-40">
                        다시 물어보기
                      </button>
                    </div>
                  )}
                  {t.state === "done" && t.result && (
                    <AnswerBody
                      result={t.result}
                      feedback={t.feedback}
                      onFeedback={(v) => feedback(i, v)}
                      onShow={(target) => {
                        onShow(target);
                        // 휴대폰에서는 시트가 화면을 덮어서, 지표를 보여 주려면 닫는다
                        if (window.matchMedia("(max-width: 639px)").matches) onClose();
                      }}
                    />
                  )}
                </div>
              </li>
            ))}
            {followUps.length > 0 && !busy && !closed && (
              <li className="pl-[38px]">
                <ul className="divide-y divide-sd-hairline border-y border-sd-hairline">
                  {followUps.map((q) => (
                    <li key={q}>
                      <SuggestRow onClick={() => ask(q)}>{q}</SuggestRow>
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </ol>
        )}
      </div>

      <div className="shrink-0 px-3 pb-3 pt-1">
        {closed ? (
          <p className="rounded-2xl bg-sd-fill px-4 py-3 text-[13px] text-sd-fg-muted">
            {info?.monthFull ? "이번 달 챗봇 예산을 다 썼어요. 다음 달 1일에 다시 열려요." : "오늘 질문을 다 썼어요. 내일 다시 물어봐 주세요."}
          </p>
        ) : (
          <form
            className={`rounded-2xl border border-sd-line bg-sd-surface transition focus-within:border-accent ${ready ? "" : "opacity-60"}`}
            onSubmit={(e) => {
              e.preventDefault();
              ask(draft);
            }}
          >
            {view && (
              <p className="flex items-center gap-1.5 px-3.5 pt-2.5 text-[12px] text-sd-fg-subtle tabular-nums">
                <CalendarIcon className="h-3.5 w-3.5" />
                {TAB_LABEL[view.tab]} 탭, {rangeText(view.range)} 기준
              </p>
            )}
            <div className="flex items-end gap-2 py-1.5 pl-3.5 pr-1.5">
              <textarea
                ref={inputRef}
                value={draft}
                disabled={!ready}
                rows={1}
                maxLength={300}
                placeholder={ready ? "숫자에 대해 물어보세요" : ""}
                aria-label="치즈에게 물어보기"
                onChange={(e) => {
                  setDraft(e.target.value);
                  petSignal("typing");
                  // 쓰는 만큼 늘어나다 다섯 줄쯤에서 멈춘다
                  e.target.style.height = "";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 132)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    ask(draft);
                  }
                }}
                className="max-h-[132px] min-h-[36px] flex-1 resize-none bg-transparent py-1.5 text-[14px] leading-relaxed text-sd-fg outline-none placeholder:text-sd-placeholder"
              />
              <button
                type="submit"
                aria-label="보내기"
                disabled={!ready || busy || !draft.trim()}
                className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg transition hover:bg-accent-hover disabled:bg-sd-gray-200 disabled:text-sd-disabled"
              >
                <ArrowUpIcon className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}
        {ready && !closed && info && info.remainingToday < SHOW_REMAINING_UNDER && (
          <p className="mt-1.5 px-1 text-right text-[12px] text-sd-fg-subtle">오늘 {info.remainingToday}번 더 물어볼 수 있어요</p>
        )}
      </div>
    </aside>
  );
}

/** 답마다 치즈 얼굴. 찾는 동안 킁킁, 확인 못 한 숫자가 있으면 갸웃, 오류면 시무룩 */
function faceOf(t: Turn): Anim {
  if (t.state === "loading") return "sniff";
  if (t.state === "error") return "sad";
  return t.result?.unverified.length ? "confused" : "idle";
}

function Empty({ anim, title, text, children }: { anim: Anim; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="m-auto flex w-full max-w-[320px] flex-col items-center py-6 text-center">
      <PetSprite anim={anim} scale={3} />
      <p className="mt-4 text-[16px] font-bold text-sd-fg">{title}</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-sd-fg-muted">{text}</p>
      {children}
    </div>
  );
}

function SuggestRow({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full items-center gap-3 px-1 py-2.5 text-left text-[13px] text-sd-fg-muted transition hover:text-sd-fg disabled:opacity-40"
    >
      <span className="min-w-0 flex-1">{children}</span>
      <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover:opacity-100" />
    </button>
  );
}

function HeadButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-sd-fg-subtle transition hover:bg-sd-fill hover:text-sd-fg disabled:opacity-40"
    >
      {children}
    </button>
  );
}
