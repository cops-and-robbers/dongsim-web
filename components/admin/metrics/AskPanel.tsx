"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/admin/Button";
import { Callout } from "@/components/admin/Callout";
import { SURFACE } from "@/components/admin/Parts";
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import { petSignal } from "@/lib/admin/pet/signal";
import { showPet } from "@/components/admin/pet/CheesePet";

/**
 * 지표 챗봇 질문 탭 (#163). 서버(/api/admin/metrics/chat)가 도구로 숫자를 찾고, 답의 숫자를 도구 결과와 대조한 뒤 돌려준다.
 * 화면은 확인한 사실과 확인 안 된 추측을 다른 모양으로 두고, 끝내 대조를 통과 못 한 문장에는 표시를 붙인다(숨기지 않는다).
 * 질문마다 따로 묻는다(대화를 이어 보내지 않는다). 토큰을 아끼고, 이어 묻기는 기간이 들어간 후속 질문으로 한다
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

export function AskPanel() {
  const [info, setInfo] = useState<Info | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const busy = turns.some((t) => t.state === "loading");

  useEffect(() => {
    let alive = true;
    authed("/api/admin/metrics/chat")
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as Info & { error?: string };
        if (!alive) return;
        if (!res.ok) setInfoError(body.error ?? `HTTP ${res.status}`);
        else setInfo(body);
      })
      .catch((e: unknown) => alive && setInfoError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [turns.length]);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setDraft("");
    petSignal("asking");
    const i = turns.length;
    setTurns((t) => [...t, { question, state: "loading" }]);
    const patch = (p: Partial<Turn>) => setTurns((t) => t.map((x, j) => (j === i ? { ...x, ...p } : x)));
    try {
      const res = await authed("/api/admin/metrics/chat", { method: "POST", body: JSON.stringify({ question }) });
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

  if (infoError) return <Callout variant="danger" title="챗봇을 불러오지 못했어요">{infoError}</Callout>;
  if (info && !info.enabled)
    return (
      <Callout variant="info" title="아직 연결 전이에요">
        지표 챗봇은 Gemini 연결 설정을 마치면 열려요. 설정 순서는 docs/metrics-chat.md 에 있어요.
      </Callout>
    );

  const closed = !!info && (info.remainingToday === 0 || info.monthFull);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] leading-relaxed text-sd-fg-muted">
        지표를 말로 물어보면 숫자를 찾아 답해요. 숫자는 모두 지표 화면과 같은 집계에서 가져오고, 답에 쓴 숫자가 그 결과와 맞는지 확인한 뒤 보여 줘요.
      </p>

      {turns.map((t, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="self-end rounded-2xl bg-sd-fill px-4 py-2.5 text-[14px] text-sd-fg">{t.question}</div>
          {t.state === "loading" && <div className={`${SURFACE} px-5 py-4 text-[14px] text-sd-fg-subtle`}>숫자를 찾고 있어요</div>}
          {t.state === "error" && <Callout variant="danger" title="답을 만들지 못했어요">{t.error}</Callout>}
          {t.state === "done" && t.result && (
            <AnswerCard result={t.result} feedback={t.feedback} onFeedback={(v) => feedback(i, v)} onAsk={ask} disabled={busy || closed} />
          )}
        </div>
      ))}
      <div ref={endRef} />

      {info && !closed && (
        <div className="flex flex-wrap gap-2">
          {(turns.length ? [] : info.suggestions).map((s) => (
            <Chip key={s} onClick={() => ask(s)} disabled={busy}>
              {s}
            </Chip>
          ))}
        </div>
      )}
      {closed ? (
        <Callout variant="neutral" title={info?.monthFull ? "이번 달 예산을 다 썼어요" : "오늘 질문을 다 썼어요"}>
          {info?.monthFull ? "다음 달 1일에 다시 열려요." : "내일 다시 물어봐 주세요."}
        </Callout>
      ) : (
        <form
          className={`${SURFACE} flex items-end gap-2 p-2`}
          onSubmit={(e) => {
            e.preventDefault();
            ask(draft);
          }}
        >
          <textarea
            value={draft}
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
            placeholder="예: 지난주 iOS 설치가 왜 늘었어?"
            aria-label="지표에 대해 물어보기"
            className="min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2 text-[14px] text-sd-fg outline-none placeholder:text-sd-fg-subtle"
          />
          <Button type="submit" disabled={busy || !draft.trim()}>
            물어보기
          </Button>
        </form>
      )}
      {info && !closed && (
        <p className="flex items-center gap-2 text-[12px] text-sd-fg-subtle">
          오늘 {info.remainingToday}개 더 물어볼 수 있어요.
          <button type="button" className="underline-offset-2 hover:underline" onClick={showPet}>
            치즈 부르기
          </button>
        </p>
      )}
    </div>
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
