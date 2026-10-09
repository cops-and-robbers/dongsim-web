"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/admin/Button";
import { Callout } from "@/components/admin/Callout";
import { SURFACE } from "@/components/admin/Parts";
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import { petSignal } from "@/lib/admin/pet/signal";
import { setPetBoxed, usePetBoxed } from "@/components/admin/pet/CheesePet";
import { TAB_SUGGESTIONS } from "@/lib/metrics/chat/suggest";
import type { View } from "@/lib/metrics/chat/instructions";

/**
 * 지표 챗봇 패널 (#163). 서버(/api/admin/metrics/chat)가 도구로 숫자를 찾고, 답의 숫자를 도구 결과와 대조한 뒤 돌려준다.
 * 화면은 확인한 사실과 확인 안 된 추측을 다른 모양으로 두고, 끝내 대조를 통과 못 한 문장에는 표시를 붙인다(숨기지 않는다).
 * 질문마다 따로 묻는다(대화를 이어 보내지 않는다). 토큰을 아끼고, 이어 묻기는 기간이 들어간 후속 질문으로 한다
 *
 * 처음엔 지표 화면의 여섯째 탭이었다. 질문은 그래프를 보다 생기는데 탭이면 그래프를 떠나야 물을 수 있고,
 * 답의 숫자를 그래프에서 다시 찾으려면 탭을 오가야 해서 오른쪽 패널로 옮겼다(2026-10-10).
 * - 넓은 화면(xl)은 본문 옆에 붙어 그래프를 가리지 않고, 그보다 좁으면 오른쪽에 겹쳐 열리고, 휴대폰은 아래에서 올라온다
 * - 질문할 때 화면에 걸린 탭과 기간(view)을 같이 보내 "이 기간"을 그 날짜로 푼다. 추천 질문도 탭마다 바뀐다
 * - 닫아도 대화는 남는다(언마운트하지 않고 숨긴다). 서버 상태(남은 질문 수, 추천)는 처음 열 때 한 번 받는다
 * - data-pet-avoid: 치즈 펫이 이 패널을 피해 다닌다(옆 패널이면 왼쪽까지만, 아래 시트면 그 위에 선다)
 */

type Claim = { text: string; refs: string[] };
type Answer = { headline: Claim; facts: Claim[]; hypotheses: string[]; caveats: string[]; followUps: string[] };
type Trace = { id: string; name: string; input: Record<string, unknown>; output: Record<string, unknown> };
type Result = { id: number | null; answer: Answer; unverified: string[]; retried: boolean; tools: Trace[]; costUsd: number };
type Turn = { question: string; state: "loading" | "done" | "error"; result?: Result; error?: string; feedback?: "good" | "bad" };
type Info = { enabled: boolean; remainingToday: number; monthFull: boolean; suggestions: string[] };

async function authed(url: string, init: RequestInit = {}): Promise<Response> {
  const send = () => fetch(url, { ...init, headers: { ...(init.headers ?? {}), "Content-Type": "application/json", Authorization: `Bearer ${getAccessToken() ?? ""}` }, cache: "no-store" });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  return res;
}

const TOOL_LABEL: Record<string, string> = {
  metrics_summary: "기간 합계",
  metrics_compare: "두 기간 비교",
  metrics_daily: "날짜별 값",
  metrics_breakdown: "나눠 보기",
  events_list: "일정 찾기",
  event_window: "행사 전후 비교",
};
const md = (ymd: unknown) => (typeof ymd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? `${Number(ymd.slice(5, 7))}월 ${Number(ymd.slice(8))}일` : "");
const range = (r: unknown) => {
  const x = r as { start?: string; end?: string } | undefined;
  return x?.start ? (x.start === x.end ? md(x.start) : `${md(x.start)}~${md(x.end)}`) : "";
};
const num = (v: unknown) => (typeof v === "number" ? v.toLocaleString("ko-KR") : "-");
// 탭 질문 둘에 서버가 만든 질문(크게 움직인 지표, 최근 행사, 고정 질문)을 더해 다섯까지
const MAX_CHIPS = 5;

export function AskPanel({ open, onClose, view }: { open: boolean; onClose: () => void; view: View | null }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const asked = useRef(false);
  const busy = turns.some((t) => t.state === "loading");
  const petBoxed = usePetBoxed();

  useEffect(() => {
    if (!open || asked.current) return;
    asked.current = true;
    authed("/api/admin/metrics/chat")
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as Info & { error?: string };
        if (!res.ok) setInfoError(body.error ?? `HTTP ${res.status}`);
        else setInfo(body);
      })
      .catch((e: unknown) => setInfoError(e instanceof Error ? e.message : String(e)));
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, info]);

  // 새 질문이 붙으면 패널 안만 맨 아래로. scrollIntoView 는 바깥 화면까지 움직이고,
  // 최근 Chrome 에선 Promise 를 돌려줘서 effect 에서 그대로 돌려주면 React 가 "destroy is not a function"으로 멈췄다(2026-10-10)
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns.length]);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setDraft("");
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

  const closed = !!info && (info.remainingToday === 0 || info.monthFull);
  const ready = !!info && info.enabled && !infoError;
  const chips = info ? [...new Set([...(view ? TAB_SUGGESTIONS[view.tab] : []), ...info.suggestions])].slice(0, MAX_CHIPS) : [];

  return (
    <aside
      data-pet-avoid
      aria-label="지표에 물어보기"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      className={`${open ? "flex" : "hidden"} fixed inset-x-0 bottom-0 z-40 h-[85dvh] flex-col rounded-t-2xl border border-sd-line bg-sd-surface shadow-xl sm:inset-y-0 sm:left-auto sm:right-0 sm:h-auto sm:w-[400px] sm:rounded-none sm:border-y-0 sm:border-r-0 xl:static xl:z-auto xl:h-full xl:shrink-0 xl:shadow-none`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-sd-hairline px-5 py-4">
        <div>
          <h2 className="text-[16px] font-bold text-sd-fg">물어보기</h2>
          <p className="mt-0.5 text-[12px] text-sd-fg-subtle tabular-nums">
            {view ? `지금 보는 ${range(view.range)}을 기준으로 답해요` : "지표를 말로 물어보면 숫자를 찾아 답해요"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg px-2 py-1 text-[13px] font-semibold text-sd-fg-subtle transition hover:bg-sd-fill hover:text-sd-fg"
        >
          닫기
        </button>
      </div>

      <div ref={bodyRef} className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
        {infoError ? (
          <Callout variant="danger" title="챗봇을 불러오지 못했어요">
            {infoError}
          </Callout>
        ) : info && !info.enabled ? (
          <Callout variant="info" title="아직 연결 전이에요">
            지표 챗봇은 Gemini 연결 설정을 마치면 열려요. 설정 순서는 docs/metrics-chat.md 에 있어요. 개발 서버에서 가짜 모델로 보려면 .env.local 에 CHAT_MOCK=1 을 넣고
            서버를 다시 켜 주세요.
          </Callout>
        ) : (
          <>
            {turns.length === 0 && (
              <p className="text-[13px] leading-relaxed text-sd-fg-muted">
                숫자는 모두 지표 화면과 같은 집계에서 가져오고, 답에 쓴 숫자가 그 결과와 맞는지 확인한 뒤 보여 줘요.
              </p>
            )}
            {turns.map((t, i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="self-end rounded-2xl bg-sd-fill px-4 py-2.5 text-[14px] text-sd-fg">{t.question}</div>
                {t.state === "loading" && <div className={`${SURFACE} px-5 py-4 text-[14px] text-sd-fg-subtle`}>숫자를 찾고 있어요</div>}
                {t.state === "error" && (
                  <Callout variant="danger" title="답을 만들지 못했어요">
                    {t.error}
                  </Callout>
                )}
                {t.state === "done" && t.result && (
                  <AnswerCard result={t.result} feedback={t.feedback} onFeedback={(v) => feedback(i, v)} onAsk={ask} disabled={busy || closed} />
                )}
              </div>
            ))}
            {ready && !closed && turns.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {chips.map((s) => (
                  <Chip key={s} onClick={() => ask(s)} disabled={busy}>
                    {s}
                  </Chip>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-sd-hairline px-4 py-3">
        {closed ? (
          <Callout variant="neutral" title={info?.monthFull ? "이번 달 예산을 다 썼어요" : "오늘 질문을 다 썼어요"}>
            {info?.monthFull ? "다음 달 1일에 다시 열려요." : "내일 다시 물어봐 주세요."}
          </Callout>
        ) : (
          <form
            className="flex items-end gap-2 rounded-xl border border-sd-line bg-sd-surface p-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              ask(draft);
            }}
          >
            <textarea
              ref={inputRef}
              value={draft}
              disabled={!ready}
              onChange={(e) => {
                setDraft(e.target.value);
                petSignal("typing");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  ask(draft);
                }
              }}
              maxLength={300}
              rows={2}
              placeholder="예: 이 기간 iOS 설치가 왜 늘었어?"
              aria-label="지표에 대해 물어보기"
              className="min-h-[44px] flex-1 resize-none bg-transparent px-2.5 py-2 text-[14px] text-sd-fg outline-none placeholder:text-sd-fg-subtle disabled:opacity-50"
            />
            <Button type="submit" size="sm" disabled={!ready || busy || !draft.trim()}>
              물어보기
            </Button>
          </form>
        )}
        <p className="flex items-center justify-between gap-2 text-[12px] text-sd-fg-subtle">
          <span>{ready && !closed ? `오늘 ${info.remainingToday}개 더 물어볼 수 있어요` : ""}</span>
          <button type="button" className="underline-offset-2 hover:underline" onClick={() => setPetBoxed(!petBoxed)}>
            {petBoxed ? "치즈 꺼내기" : "치즈 보관함에 넣기"}
          </button>
        </p>
      </div>
    </aside>
  );
}

function Chip({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-sd-line bg-sd-surface px-3 py-1.5 text-left text-[13px] text-sd-fg-muted transition hover:border-accent hover:text-sd-fg disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function AnswerCard({
  result,
  feedback,
  onFeedback,
  onAsk,
  disabled,
}: {
  result: Result;
  feedback?: "good" | "bad";
  onFeedback: (v: "good" | "bad") => void;
  onAsk: (q: string) => void;
  disabled: boolean;
}) {
  const { answer, unverified } = result;
  const unchecked = (where: string) => unverified.includes(where);
  return (
    <div className={`${SURFACE} flex flex-col gap-4 px-5 py-4`}>
      <ClaimLine text={answer.headline.text} unchecked={unchecked("headline")} strong />
      {answer.facts.length > 0 && (
        <Section title="데이터로 확인한 것">
          <ul className="flex flex-col gap-1.5">
            {answer.facts.map((f, i) => (
              <li key={i}>
                <ClaimLine text={f.text} unchecked={unchecked(`facts[${i}]`)} />
              </li>
            ))}
          </ul>
        </Section>
      )}
      {answer.hypotheses.length > 0 && (
        <div className="rounded-xl bg-sd-fill px-4 py-3">
          <p className="mb-1 text-[12px] font-semibold text-sd-fg-subtle">가능한 이유 (데이터로 확인하지 않은 추측이에요)</p>
          <ul className="flex flex-col gap-1 text-[13px] leading-relaxed text-sd-fg-muted">
            {answer.hypotheses.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      )}
      {answer.caveats.length > 0 && (
        <Section title="읽을 때 조심할 것">
          <ul className="flex flex-col gap-1 text-[13px] leading-relaxed text-sd-fg-muted">
            {answer.caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </Section>
      )}
      {result.tools.length > 0 && <HowCalculated tools={result.tools} />}
      {answer.followUps.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {answer.followUps.map((q) => (
            <Chip key={q} onClick={() => onAsk(q)} disabled={disabled}>
              {q}
            </Chip>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 border-t border-sd-hairline pt-3 text-[12px] text-sd-fg-subtle">
        {feedback ? (
          <span>{feedback === "good" ? "알려 줘서 고마워요" : "더 나아지게 이 답을 다시 볼게요"}</span>
        ) : (
          <>
            <span>이 답이 도움이 됐나요?</span>
            <button type="button" className="rounded-md px-2 py-1 hover:bg-sd-fill" onClick={() => onFeedback("good")}>
              도움이 됐어요
            </button>
            <button type="button" className="rounded-md px-2 py-1 hover:bg-sd-fill" onClick={() => onFeedback("bad")}>
              아니에요
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-semibold text-sd-fg-subtle">{title}</p>
      {children}
    </div>
  );
}

function ClaimLine({ text, unchecked, strong }: { text: string; unchecked: boolean; strong?: boolean }) {
  return (
    <p className={`leading-relaxed ${strong ? "text-[15px] font-semibold text-sd-fg" : "text-[14px] text-sd-fg"}`}>
      {text}
      {unchecked && (
        <span className="ml-2 inline-block rounded-md bg-sd-warning-weak px-1.5 py-0.5 align-middle text-[11px] font-semibold text-sd-warning">
          숫자를 확인하지 못했어요
        </span>
      )}
    </p>
  );
}

/** 어떤 도구로 어느 기간을 봤고 어떤 값이 나왔는지. 답의 숫자가 어디서 왔는지 팀원이 직접 따라가 볼 수 있게 */
function HowCalculated({ tools }: { tools: Trace[] }) {
  return (
    <details className="text-[13px]">
      <summary className="cursor-pointer select-none text-sd-fg-subtle hover:text-sd-fg-muted">어떻게 계산했나요</summary>
      <div className="mt-2 flex flex-col gap-3">
        {tools.map((t) => (
          <div key={t.id}>
            <p className="font-semibold text-sd-fg-muted">
              {TOOL_LABEL[t.name] ?? t.name}{" "}
              <span className="font-normal text-sd-fg-subtle">
                {[range(t.input.period ?? t.input.periodA), t.input.periodB ? `과 ${range(t.input.periodB)}` : "", t.input.day ? `${md(t.input.day)}부터 ${t.input.days}일` : ""].join(" ").trim()}
              </span>
            </p>
            <TraceTable output={t.output} />
          </div>
        ))}
      </div>
    </details>
  );
}

function TraceTable({ output }: { output: Record<string, unknown> }) {
  if (output.status !== "ok") return <p className="text-sd-fg-subtle">{String(output.message ?? "이 기간엔 숫자가 없어요")}</p>;
  const metrics = output.metrics as { label: string; value?: number | null; a?: number | null; b?: number | null; changePct?: number | null; unit: string }[] | undefined;
  if (metrics) {
    const rows = metrics.filter((m) => (m.value ?? m.a ?? m.b) !== null && (m.value ?? m.a ?? m.b) !== undefined).slice(0, 12);
    const cmp = rows.some((m) => m.a !== undefined);
    return (
      <table className="mt-1 w-full text-[12px] tabular-nums">
        <tbody>
          {rows.map((m) => (
            <tr key={m.label} className="border-b border-sd-hairline last:border-0">
              <td className="py-1 pr-2 text-sd-fg-muted">{m.label}</td>
              {cmp ? (
                <>
                  <td className="py-1 text-right text-sd-fg">{num(m.a)}</td>
                  <td className="py-1 text-right text-sd-fg-subtle">{num(m.b)}</td>
                  <td className="py-1 text-right text-sd-fg-subtle">{typeof m.changePct === "number" ? `${m.changePct > 0 ? "+" : ""}${m.changePct}%` : "-"}</td>
                </>
              ) : (
                <td className="py-1 text-right text-sd-fg">
                  {num(m.value)}
                  {m.unit}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (Array.isArray(output.events)) return <p className="text-sd-fg-subtle">{(output.events as { day: string; label: string }[]).map((e) => `${md(e.day)} ${e.label}`).join(", ")}</p>;
  if (output.peak) {
    const p = output.peak as { day: string; value: number };
    return <p className="text-sd-fg-subtle">합계 {num(output.total)}, 가장 높았던 날 {md(p.day)} {num(p.value)}</p>;
  }
  return <p className="text-sd-fg-subtle">{String(output.note ?? "")}</p>;
}
