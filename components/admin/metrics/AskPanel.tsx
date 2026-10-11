"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import { petSay, petSignal } from "@/lib/admin/pet/signal";
import type { Anim } from "@/lib/admin/pet/brain";
import { PetSprite } from "@/components/admin/pet/PetSprite";
import { ArrowUpIcon, ChevronDownIcon, SquarePenIcon } from "@/components/admin/icons";
import { AnswerBody, rangeText, type FeedbackState, type Result } from "@/components/admin/metrics/AskAnswer";
import { complete, type EventName } from "@/lib/metrics/chat/autocomplete";
import type { InputSource } from "@/lib/metrics/chat/feedback";
import { progressLines, waitingLine, type ProgressEvent } from "@/lib/metrics/chat/progress";
import { starters } from "@/lib/metrics/chat/suggest";
import type { Usage } from "@/lib/metrics/chat/usage";
import type { View } from "@/lib/metrics/chat/instructions";
import type { Target } from "@/lib/metrics/chat/evidence";

/**
 * 지표 챗봇 패널 (#163). 지표 화면 옆에서 체다에게 숫자를 묻는다.
 *
 * 이름은 체다(2026-10-11). 경찰(냥파, 특수치즈수사대)과 도둑(도둥이, 반치즈주의자)의 치즈 세계관에 맞춘 치즈 캐릭터다.
 * 코드 이름(CheesePet, 치즈 펫)은 그대로 둔다. 화면에 보이는 말만 체다
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
 * - 오른쪽 아래에 떠 있는 작은 창(380px)이다. 화면 한쪽을 통째로 덮는 옆 패널은 "한쪽 창을 다 덮는 느낌"이라 바꿨다(2026-10-10).
 *   채팅 상담 창(채널톡 등)처럼 익숙한 자리이고, 지표 화면 배치는 건드리지 않는다. 휴대폰은 아래에서 올라오는 시트
 * - 답의 "지표 화면에서 이 기간 보기"를 누르면 창을 접어 그래프가 다 보이게 하고, 치즈가 "이 기간을 열었어요"라고 알린다
 * - 창을 접어 둔 사이 답이 오면 치즈 머리 위 말풍선으로 알린다. 답 자체를 말풍선에 넣지는 않는다(숫자 비교와 막대가 안 들어간다)
 * - 닫아도 대화는 남는다(언마운트하지 않고 숨긴다). 서버 상태(남은 질문 수, 추천)는 처음 열 때 한 번 받는다
 * - data-pet-avoid: 돌아다니는 치즈가 이 창을 피해 그 왼쪽에 선다
 *
 * 2026-10-11 진짜 Vertex 실험(29문항)과 분석 도구 챗봇 조사로 더한 것
 * - 기다리는 동안 치즈가 무엇을 꺼내 봤는지 한 줄씩 말한다(라우트가 흘려 보내는 진행 신호, progress.ts). 답까지 중앙 13초, 길면 45초다.
 *   "분석 중" 같은 말이나 모델의 생각 글은 보이지 않는다
 * - 머리말 이름 아래에 치즈가 지금 뭘 하는지 한 줄(같이 보는 중, 찾는 중, 자는 중)
 * - 자동 완성: 쓰는 중인 낱말로 질문 틀을 채운다(autocomplete.ts, 모델을 부르지 않는다). 위아래 화살표와 Enter, Tab 으로 고른다
 * - 남은 한도는 돈이 아니라 "몇 번 더 물을 수 있나"로 입력창 아래 한 줄. 달 예산 80% 를 넘거나 오늘 몫이 다섯 번 이하면 노랗게(usage.ts)
 * - 질문을 어떻게 넣었는지(직접, 추천, 자동 완성, 이어 묻기)를 같이 보내 기록한다. 어떤 입력이 쓰이는지 보고 추천과 자동 완성을 고친다
 *
 * 로컬에서 본 뒤 다시 짠 것(2026-10-11)
 * - 첫 화면이 가운데 큰 그림, 제목, 설명, 목록이라 흔한 AI 첫 화면 같았다. 치즈가 먼저 말을 거는 대화 모양으로 바꿨다(치즈 얼굴 옆 인사, 그 아래 물어볼 만한 것)
 * - 머리말 아이콘 셋(새로 묻기, 보관함, 닫기)이 흔한 챗봇 머리말 같았다. 닫아도 대화가 남으니 X 대신 접기(아래 화살표)로 두고,
 *   돌아다니는 체다 넣기/꺼내기 버튼은 뺐다. 체다를 꾹 눌러 끌어 보관함에 넣고, 보관함을 눌러 꺼낸다(CheesePet)
 * - 이름 옆에 체다 버전(version.ts). 질문마다 버전이 기록에 남아 버전끼리 신선도 평가를 견준다
 */

type Turn = {
  question: string;
  source: InputSource;
  state: "loading" | "done" | "error";
  progress: ProgressEvent[];
  startedAt: number;
  result?: Result;
  error?: string;
  feedback?: FeedbackState;
};
type Info = { enabled: boolean; version: string | null; usage: Usage | null; remainingToday: number; monthFull: boolean; suggestions: string[]; events: EventName[] };

const URL_CHAT = "/api/admin/metrics/chat";

async function authed(url: string, init: RequestInit = {}): Promise<Response> {
  const send = () => fetch(url, { ...init, headers: { ...(init.headers ?? {}), "Content-Type": "application/json", Authorization: `Bearer ${getAccessToken() ?? ""}` }, cache: "no-store" });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  return res;
}

/** 줄마다 JSON 하나인 응답을 읽는다. 진행 신호마다 onLine 을 부른다 */
async function readLines(res: Response, onLine: (x: Record<string, unknown>) => void) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl = buf.indexOf("\n");
    while (nl >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) onLine(JSON.parse(line) as Record<string, unknown>);
      nl = buf.indexOf("\n");
    }
  }
  if (buf.trim()) onLine(JSON.parse(buf) as Record<string, unknown>);
}

export function AskPanel({ open, onClose, view, onShow }: { open: boolean; onClose: () => void; view: View | null; onShow: (t: Target) => void }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  // 자동 완성에서 고른 줄(-1 은 아무것도 안 고름)과, Esc 로 닫은 뒤 다시 쓰기 전까지 숨김
  const [active, setActive] = useState(-1);
  const [hideCompletions, setHideCompletions] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const loadedFor = useRef(-1);
  const busy = turns.some((t) => t.state === "loading");
  // 답이 왔을 때 창이 열려 있나. ask 안의 비동기 흐름에서 최신 값을 보려고 ref 로 든다
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open || loadedFor.current === attempt) return;
    loadedFor.current = attempt;
    authed(URL_CHAT)
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as Partial<Info> & { error?: string };
        if (!res.ok) setInfoError(body.error ?? `HTTP ${res.status}`);
        else {
          setInfoError(null);
          setInfo({ enabled: !!body.enabled, version: body.version ?? null, usage: body.usage ?? null, remainingToday: body.remainingToday ?? 0, monthFull: !!body.monthFull, suggestions: body.suggestions ?? [], events: body.events ?? [] });
        }
      })
      .catch((e: unknown) => setInfoError(e instanceof Error ? e.message : String(e)));
  }, [open, attempt]);

  useEffect(() => {
    if (open && info?.enabled) inputRef.current?.focus();
  }, [open, info]);

  // 기다리는 동안만 1초마다 시계를 돌려 "오래 걸려요"를 띄운다
  useEffect(() => {
    if (!busy) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [busy]);

  // 새 질문이 붙으면 패널 안만 맨 아래로. scrollIntoView 는 바깥 화면까지 움직이고,
  // 최근 Chrome 에선 Promise 를 돌려줘서 effect 에서 그대로 돌려주면 React 가 "destroy is not a function"으로 멈췄다(2026-10-10)
  // 접혀 있던 동안 온 답은 창을 열 때 내린다(접힌 동안에는 높이가 0 이라 못 내린다)
  useEffect(() => {
    const el = bodyRef.current;
    if (el && open) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns, open]);

  const ask = async (q: string, source: InputSource) => {
    const question = q.trim();
    if (!question || busy) return;
    setDraft("");
    setActive(-1);
    if (inputRef.current) inputRef.current.style.height = "";
    petSignal("asking");
    const i = turns.length;
    // 시계(now)는 기다리는 동안 1초마다 돈다. 첫 1초는 이전 값이라 기다린 시간이 음수일 수 있는데, 그땐 아무 말도 안 띄운다
    setTurns((t) => [...t, { question, source, state: "loading", progress: [], startedAt: Date.now() }]);
    const patch = (p: Partial<Turn> | ((x: Turn) => Partial<Turn>)) => setTurns((t) => t.map((x, j) => (j === i ? { ...x, ...(typeof p === "function" ? p(x) : p) } : x)));
    const fail = (error: string) => {
      petSignal("error");
      if (!openRef.current) petSay("답을 못 찾았어요");
      patch({ state: "error", error });
    };
    try {
      const res = await authed(URL_CHAT, { method: "POST", headers: { Accept: "application/x-ndjson" }, body: JSON.stringify({ question, view, source }) });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return fail(body.error ?? `HTTP ${res.status}`);
      }
      let finished = false;
      await readLines(res, (x) => {
        if (x.type === "progress") patch((t) => ({ progress: [...t.progress, x as unknown as ProgressEvent] }));
        if (x.type === "error") {
          finished = true;
          fail(String(x.error ?? "답을 만들지 못했어요"));
        }
        if (x.type === "done") {
          finished = true;
          const result = x as unknown as Result;
          petSignal(result.unverified.length ? "unverified" : "answered");
          if (!openRef.current) petSay("답을 찾았어요");
          patch({ state: "done", result });
          setInfo((s) => (s ? { ...s, remainingToday: Math.max(0, s.remainingToday - 1), usage: s.usage && spent(s.usage, result.costUsd) } : s));
        }
      });
      if (!finished) fail("답이 중간에 끊겼어요");
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    }
  };

  /** 표정을 고르면 바로 남기고, 이유와 메모를 고르면 덮어쓴다. 돌아다니는 치즈도 같은 표정을 짓는다 */
  const feedback = async (i: number, f: FeedbackState) => {
    const id = turns[i]?.result?.id;
    if (!id) return;
    const before = turns[i].feedback?.value;
    setTurns((t) => t.map((x, j) => (j === i ? { ...x, feedback: f } : x)));
    if (before !== f.value) petSignal(f.value === "good" ? "liked" : f.value === "meh" ? "meh" : "disliked");
    await authed(URL_CHAT, { method: "PATCH", body: JSON.stringify({ id, feedback: f.value, reason: f.reason, note: f.note }) }).catch(() => undefined);
  };

  const ready = !!info?.enabled && !infoError;
  const closed = !!info && (info.remainingToday === 0 || info.monthFull);
  const suggestions = info ? starters(view?.range ?? null, info.events) : [];
  const last = turns[turns.length - 1];
  const followUps = last?.state === "done" && last.result ? last.result.answer.followUps.slice(0, 3) : [];
  const completions = useMemo(() => (ready && !busy && !hideCompletions ? complete(draft, info?.events ?? []) : []), [ready, busy, hideCompletions, draft, info]);
  // 이름 아래 한 줄: 평소엔 고른 기간만(체다는 탭이 아니라 이 기간 데이터 전체로 답한다), 찾는 동안과 잘 때만 상태
  const status = !info && !infoError ? "부르는 중" : infoError ? "오지 못했어요" : !info?.enabled ? "쿨쿨 자고 있어요" : busy ? "숫자를 찾고 있어요" : view ? rangeText(view.range) : "";

  return (
    <aside
      data-pet-avoid
      aria-label="체다에게 물어보기"
      onKeyDown={(e) => e.key === "Escape" && !completions.length && onClose()}
      className={`${open ? "flex" : "hidden"} fixed inset-x-0 bottom-0 z-40 h-[85dvh] flex-col overflow-hidden rounded-t-2xl border border-sd-line bg-sd-surface shadow-xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:h-[min(640px,calc(100dvh-32px))] sm:w-[380px] sm:rounded-2xl sm:shadow-2xl`}
    >
      <header className="flex h-16 shrink-0 items-center gap-2.5 pl-4 pr-2">
        <PetSprite anim={busy ? "sniff" : info && !info.enabled ? "sleep" : "idle"} play={busy} />
        <div className="min-w-0 flex-1 leading-tight">
          <h2 className="text-[15px] font-bold text-sd-fg">
            체다
            {info?.version && <span className="ml-1.5 text-[12px] font-medium text-sd-fg-subtle tabular-nums">{info.version}</span>}
          </h2>
          <p className="flex items-center gap-1.5 truncate text-[12px] text-sd-fg-subtle" aria-live="polite">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ready ? "bg-cheese" : "bg-sd-gray-200"}`} aria-hidden />
            {status}
          </p>
        </div>
        {turns.length > 0 && (
          <HeadButton label="새로 묻기" onClick={() => setTurns([])} disabled={busy}>
            <SquarePenIcon className="h-[17px] w-[17px]" />
          </HeadButton>
        )}
        <HeadButton label="접기. 대화는 남아 있어요" onClick={onClose}>
          <ChevronDownIcon className="h-[19px] w-[19px]" />
        </HeadButton>
      </header>

      <div ref={bodyRef} className="flex flex-1 flex-col overflow-y-auto px-4 py-5">
        {infoError ? (
          <Empty anim="sad" title="체다를 부르지 못했어요" text={infoError}>
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="mt-3 text-[13px] font-semibold text-accent hover:underline">
              다시 부르기
            </button>
          </Empty>
        ) : info && !info.enabled ? (
          <Empty
            anim="sleep"
            title="체다가 아직 자고 있어요"
            text="Gemini 연결을 마치면 깨어나요. 설정 순서는 docs/metrics-chat.md 에 있어요. 개발 서버에서는 .env.local 에 CHAT_MOCK=1 을 넣고 서버를 다시 켜면 가짜 답으로 볼 수 있어요."
          />
        ) : turns.length === 0 ? (
          <div className="flex gap-2.5">
            <PetSprite anim="wave" className="mt-1" />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <Bubble>
                <p className="font-semibold">반가워요, 체다예요.</p>
                <p>궁금한 숫자는 편하게 물어보세요.</p>
              </Bubble>
              {ready && !closed && suggestions.length > 0 && (
                <ul className="flex flex-col items-start gap-1.5">
                  {suggestions.map((s) => (
                    <li key={s}>
                      <SuggestChip onClick={() => ask(s, "suggestion")} disabled={busy}>
                        {s}
                      </SuggestChip>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <ol className="flex flex-col gap-6">
            {turns.map((t, i) => (
              <li key={i} className="flex flex-col gap-3">
                <p className="max-w-[85%] self-end whitespace-pre-wrap rounded-[20px] rounded-br-md bg-sd-fill px-3.5 py-2 text-[14px] leading-relaxed text-sd-fg">{t.question}</p>
                <div className="flex gap-2.5">
                  <PetSprite anim={faceOf(t)} play={t.state === "loading"} className="mt-1" />
                  {t.state === "loading" && <Finding turn={t} now={now} />}
                  {t.state === "error" && (
                    <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
                      <Bubble>
                        <p>미안해요, 이번엔 답을 만들지 못했어요.</p>
                        <p className="text-[12px] text-sd-fg-subtle">{t.error}</p>
                      </Bubble>
                      <SuggestChip disabled={busy || closed} onClick={() => ask(t.question, t.source)}>
                        다시 물어보기
                      </SuggestChip>
                    </div>
                  )}
                  {t.state === "done" && t.result && (
                    <AnswerBody
                      result={t.result}
                      feedback={t.feedback}
                      onFeedback={(f) => feedback(i, f)}
                      onReask={busy || closed ? undefined : (period) => ask(`${t.question} (기간: ${period})`, "followup")}
                      onShow={(target) => {
                        onShow(target);
                        // 창을 접어 그래프가 다 보이게 한다. 대화는 남아 있어 치즈나 머리말 버튼으로 다시 연다
                        onClose();
                        petSay("이 기간을 열었어요", 4000);
                      }}
                    />
                  )}
                </div>
              </li>
            ))}
            {followUps.length > 0 && !busy && !closed && (
              <li className="pl-[38px]">
                <ul className="flex flex-col items-start gap-1.5">
                  {followUps.map((q) => (
                    <li key={q}>
                      <SuggestChip onClick={() => ask(q, "followup")}>{q}</SuggestChip>
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
            {info?.monthFull ? `이번 달 몫을 다 썼어요. ${resetText(info.usage)}에 다시 채워져요.` : "오늘 몫을 다 썼어요. 내일 다시 물어봐 주세요."}
          </p>
        ) : (
          <form
            className={`overflow-hidden rounded-[24px] border border-sd-line bg-sd-surface transition focus-within:border-sd-fg-subtle focus-within:shadow-sm ${ready ? "" : "opacity-60"}`}
            onSubmit={(e) => {
              e.preventDefault();
              ask(draft, "typed");
            }}
          >
            {completions.length > 0 && (
              <ul role="listbox" aria-label="이렇게 물어볼까요" className="border-b border-sd-hairline py-1">
                {completions.map((c, k) => (
                  <li key={c} role="option" aria-selected={k === active}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(k)}
                      onClick={() => ask(c, "autocomplete")}
                      className={`flex w-full items-center gap-2 px-3.5 py-1.5 text-left text-[13px] transition ${k === active ? "bg-sd-fill text-sd-fg" : "text-sd-fg-muted"}`}
                    >
                      <Highlight text={c} query={draft} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-end gap-2 py-1.5 pl-4 pr-1.5">
              <textarea
                ref={inputRef}
                value={draft}
                disabled={!ready}
                rows={1}
                maxLength={300}
                placeholder={ready ? "궁금한 점을 물어보세요" : ""}
                aria-label="체다에게 물어보기"
                aria-autocomplete="list"
                onChange={(e) => {
                  setDraft(e.target.value);
                  setActive(-1);
                  setHideCompletions(false);
                  petSignal("typing");
                  // 쓰는 만큼 늘어나다 다섯 줄쯤에서 멈춘다
                  e.target.style.height = "";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 132)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return;
                  if (completions.length && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                    e.preventDefault();
                    const n = completions.length;
                    setActive((a) => (e.key === "ArrowDown" ? (a + 1) % n : (a - 1 + n) % n));
                    return;
                  }
                  if (completions.length && e.key === "Tab" && !e.shiftKey) {
                    e.preventDefault();
                    setDraft(completions[Math.max(active, 0)]);
                    setActive(-1);
                    setHideCompletions(true);
                    return;
                  }
                  if (completions.length && e.key === "Escape") {
                    e.preventDefault();
                    setHideCompletions(true);
                    return;
                  }
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (active >= 0 && completions[active]) ask(completions[active], "autocomplete");
                    else ask(draft, "typed");
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
        {ready && !closed && info?.usage && <UsageLine u={info.usage} />}
      </div>
    </aside>
  );
}

/** 답 하나 값만큼 남은 한도를 줄여 둔다(다음에 창을 열면 서버 값으로 바뀐다) */
function spent(u: Usage, cost: number): Usage {
  const spentUsd = u.month.spentUsd + (cost || 0);
  return { ...u, remainingToday: Math.max(0, u.remainingToday - 1), month: { ...u.month, questions: u.month.questions + 1, mine: u.month.mine + 1, spentUsd, estLeft: Math.max(0, Math.floor((u.month.capUsd - spentUsd) / u.month.avgCostUsd)) } };
}

const resetText = (u: Usage | null) => (u ? `${Number(u.month.resetOn.slice(5, 7))}월 ${Number(u.month.resetOn.slice(8))}일` : "다음 달 1일");

/**
 * 남은 한도 한 줄. 평소엔 흐리게 "이번 달 약 N번 더", 달 예산 80% 를 넘거나 오늘 몫이 다섯 번 이하면 노랗게.
 * 자세한 숫자(팀 전체, 나, 오늘 몫, 다시 채워지는 날)는 마우스를 올리면 보인다
 */
function UsageLine({ u }: { u: Usage }) {
  const detail = `이번 달 팀이 ${u.month.questions}번 물었고 그중 ${u.month.mine}번이 내 질문이에요.${u.month.otherUsd > 0 ? ` 평가 실험에 쓴 몫도 같은 한도에서 빠져요.` : ""} 오늘 내 몫은 ${u.dailyLimit}번 중 ${u.remainingToday}번 남았어요. ${resetText(u)}에 다시 채워져요.`;
  const text = u.warn === "month" ? `이번 달 몫이 얼마 안 남았어요. 약 ${u.month.estLeft}번 더 물어볼 수 있어요` : u.warn === "today" ? `오늘은 ${u.remainingToday}번 더 물어볼 수 있어요` : `이번 달 약 ${u.month.estLeft}번 더 물어볼 수 있어요`;
  return (
    <p title={detail} className={`mt-1.5 px-1 text-right text-[12px] tabular-nums ${u.warn ? "text-sd-warning" : "text-sd-fg-subtle"}`}>
      {text}
    </p>
  );
}

/** 기다리는 동안: 치즈가 지금까지 꺼내 본 것을 한 줄씩. 오래 걸리면 그대로 알린다 */
function Finding({ turn, now }: { turn: Turn; now: number }) {
  const lines = progressLines(turn.progress);
  const wait = waitingLine(Math.round((now - turn.startedAt) / 1000));
  return (
    <div className="min-w-0 flex-1" aria-live="polite">
      <Bubble>
        <p>킁킁, 숫자를 찾고 있어요.</p>
      </Bubble>
      {lines.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 pl-1 text-[12px] text-sd-fg-subtle">
          {lines.map((l) => (
            <li key={l} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cheese" aria-hidden />
              {l}
            </li>
          ))}
        </ul>
      )}
      {wait && <p className="mt-2 pl-1 text-[12px] text-sd-fg-subtle">{wait}</p>}
    </div>
  );
}

/** 자동 완성 줄에서 쓴 말과 겹치는 앞부분을 진하게 */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  const at = q ? text.indexOf(q) : -1;
  if (at < 0) return <span className="min-w-0 truncate">{text}</span>;
  return (
    <span className="min-w-0 truncate">
      {text.slice(0, at)}
      <span className="font-semibold text-sd-fg">{text.slice(at, at + q.length)}</span>
      {text.slice(at + q.length)}
    </span>
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

/** 체다가 하는 말. 치즈색 말풍선(사용자 질문은 회색, 오른쪽). 답의 근거 그림은 말풍선 밖 아래에 붙는다 */
export function Bubble({ children }: { children: ReactNode }) {
  return <div className="w-fit max-w-full rounded-[20px] rounded-tl-md bg-cheese-weak px-3.5 py-2.5 text-[14px] leading-[1.6] text-sd-fg">{children}</div>;
}

/** 눌러서 바로 묻는 질문. 선으로 나눈 목록 대신 둥근 버튼으로 하나씩(딱딱해 보인다는 말을 듣고 바꿨다, 2026-10-11) */
function SuggestChip({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-2xl border border-sd-line bg-sd-surface px-3.5 py-2 text-left text-[13px] leading-snug text-sd-fg-muted transition hover:border-cheese hover:bg-cheese-weak hover:text-sd-fg disabled:opacity-40"
    >
      {children}
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
