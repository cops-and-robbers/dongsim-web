"use client";

import { useState } from "react";
import { countryName } from "@/components/admin/metrics/countryName";
import { ArrowRightIcon, ArrowUpIcon, CalendarIcon, ChevronDownIcon } from "@/components/admin/icons";
import { evidenceOf, interpretationOf, type Chip, type Evidence, type Range, type Target, type Trace } from "@/lib/metrics/chat/evidence";
import { changeText, magnitude, valueText } from "@/lib/metrics/chat/format";
import { emphasize } from "@/lib/metrics/chat/emphasis";
import { FEEDBACK_FACES, FEEDBACK_REASONS, type Feedback } from "@/lib/metrics/chat/feedback";

/**
 * 챗봇 답 하나 (#163). 글보다 숫자가 먼저 보이게 한다.
 *
 * - 답 글은 말풍선이나 카드 없이 치즈 얼굴 옆에 바로 둔다. 첫 문장(headline)이 질문에 대한 답이고, 이어지는 사실은 같은 단락으로 잇는다
 * - 그 아래 근거는 도구 결과를 그대로 그린 것이다(evidence.ts). 지표 화면의 숫자 칸, 증감 화살표와 같은 모양이라 화면과 바로 대조된다
 * - 근거마다 "지표 화면에서 보기"로 같은 기간, 같은 탭을 연다(Mixpanel Spark, Metabase Metabot 의 "보고서로 열기")
 * - 확인하지 못한 문장은 숨기지 않고 손으로 그은 형광펜과 한 줄 안내로 표시한다. 큰 경고 딱지는 붙이지 않는다.
 *   물결 밑줄은 맞춤법 검사처럼 보이고 AI 도구 같아서 바꿨다(2026-10-11)
 * - 값(59명, 75.6%)은 화면이 굵게 한다(emphasis.ts). 모델에게 마크다운을 쓰게 하지 않는다
 * - 추측(hypotheses)은 접어 둔다. 확인한 것과 같은 무게로 보이지 않게. 모델이 확인하려고 비교를 돌린 추측은 그 비교 그림을 같이 펼친다
 * - 평가는 엄지 대신 치즈 신선도 그림 셋(노랑, 갈색, 곰팡이 초록)에 만족도 말(만족해요, 보통이에요, 아쉬워요). 색만 봐도 좋고 나쁨이 보인다.
 *   보통이에요, 아쉬워요는 이유를 하나 고르고 한 줄 남길 수 있다(feedback.ts).
 *   돌아다니는 체다도 같은 기분을 짓는다(하트, 갸웃, 시무룩)
 */

export type Claim = { text: string; refs: string[] };
// 예전 답(가설이 글자만이던 때)도 그릴 수 있게 string 을 받는다
export type Answer = { headline: Claim; facts: Claim[]; hypotheses: (Claim | string)[]; caveats: string[]; followUps: string[]; show?: { ref: string; metrics: string[] }[] };
export type Result = { id: number | null; answer: Answer; unverified: string[]; retried: boolean; tools: Trace[]; costUsd: number };

const md = (ymd: string) => `${Number(ymd.slice(5, 7))}월 ${Number(ymd.slice(8))}일`;
/** "9월 21일~27일", 달이 바뀌면 "9월 28일~10월 4일" */
export const rangeText = (r: Range) =>
  r.start === r.end ? md(r.start) : r.start.slice(0, 7) === r.end.slice(0, 7) ? `${md(r.start)}~${Number(r.end.slice(8))}일` : `${md(r.start)}~${md(r.end)}`;
const fmt = (v: number | null) => (v === null ? "-" : v.toLocaleString("ko-KR", { maximumFractionDigits: 1 }));

export type FeedbackState = { value: Feedback; reason?: string; note?: string; sent?: boolean };

export function AnswerBody({
  result,
  feedback,
  onFeedback,
  onShow,
  onReask,
}: {
  result: Result;
  feedback?: FeedbackState;
  onFeedback: (f: FeedbackState) => void;
  onShow: (t: Target) => void;
  /** 기간을 바꿔 같은 질문을 다시 묻기("최근 28일" 같은 기간 이름) */
  onReask?: (period: string) => void;
}) {
  const { answer, unverified } = result;
  const evidence = evidenceOf(result.tools, answer);
  const chips = interpretationOf(result.tools, answer);
  const unchecked = (where: string) => unverified.includes(where);
  const notes = [...new Set([...answer.caveats, ...evidence.flatMap((e) => e.notes)])];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <Understood chips={chips} onReask={onReask} />
      {/* 결론 한 줄을 따로, 사실은 짧은 단락으로 나눈다. 좁은 창에서 한 단락으로 이으면 글 벽이 된다(2026-10-11 로컬 확인) */}
      <div className="flex w-fit max-w-full flex-col gap-1.5 rounded-[20px] rounded-tl-md bg-cheese-weak px-3.5 py-2.5 text-[14px] leading-[1.6] text-sd-fg">
        <p>
          <Sentence text={answer.headline.text} unchecked={unchecked("headline")} strong />
        </p>
        {answer.facts.map((f, i) => (
          <p key={i}>
            <Sentence text={f.text} unchecked={unchecked(`facts[${i}]`)} />
          </p>
        ))}
      </div>
      {unverified.length > 0 && <p className="-mt-1 pl-1 text-[12px] text-sd-fg-muted"><span className="chat-marker">형광펜 칠한 문장</span>은 숫자를 확인하지 못했어요. 지표 화면에서 한 번 더 봐 주세요.</p>}

      {evidence.map((e) => (
        <EvidenceBlock key={e.id} e={e} onShow={onShow} />
      ))}

      {notes.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-[12px] leading-relaxed text-sd-fg-subtle">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      {answer.hypotheses.length > 0 && (
        <Guesses
          items={answer.hypotheses.map((h, i) => {
            const c = typeof h === "string" ? { text: h, refs: [] } : h;
            const shown = new Set(evidence.map((e) => e.id));
            const checks = c.refs.length ? evidenceOf(result.tools, { headline: c, facts: [] }).filter((e) => !shown.has(e.id)) : [];
            return { ...c, checked: c.refs.length > 0, unchecked: unchecked(`hypotheses[${i}]`), checks };
          })}
          onShow={onShow}
        />
      )}

      {result.id !== null && <Faces state={feedback} onChange={onFeedback} />}
    </div>
  );
}

/** 기간을 바꿔 다시 물을 때 고르는 기간. 이름은 지시문의 기간 표와 같아서 체다가 그대로 푼다 */
const REASK_PERIODS: { label: string; name: string }[] = [
  { label: "최근 7일", name: "최근 7일" },
  { label: "최근 28일", name: "최근 28일" },
  { label: "이번 달", name: "이번 달(1일~어제)" },
  { label: "지난달", name: "지난달" },
  { label: "전체", name: "전체(수집 시작부터, 지금까지, 누적)" },
];

/**
 * "이렇게 봤어요" 칩. 체다가 도구에 넘긴 기간, 행사, 나눠 본 기준을 그대로 보여 준다(evidence.ts interpretationOf).
 * 기간이 틀렸으면 칩을 눌러 다른 기간으로 같은 질문을 다시 묻는다. 질문을 다시 쓸 필요가 없다(HAX G9 쉬운 고치기, ThoughtSpot 토큰)
 */
function Understood({ chips, onReask }: { chips: Chip[]; onReask?: (period: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-sd-fg-subtle">
      <span>이렇게 봤어요</span>
      {chips.map((c, i) =>
        c.kind === "period" && c.range ? (
          <span key={i} className="relative">
            <button
              type="button"
              disabled={!onReask}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-sd-line bg-sd-surface px-2 py-0.5 text-sd-fg-muted tabular-nums transition hover:border-sd-fg-subtle hover:text-sd-fg disabled:pointer-events-none"
            >
              <CalendarIcon className="h-3 w-3" />
              {rangeText(c.range)}
              {c.compare && <span className="text-sd-fg-subtle">, 비교 {rangeText(c.compare)}</span>}
              {onReask && <ChevronDownIcon className="h-3 w-3" />}
            </button>
            {open && onReask && (
              <span className="absolute left-0 top-full z-10 mt-1 flex w-36 flex-col rounded-xl border border-sd-line bg-sd-surface p-1 shadow-lg">
                <span className="px-2.5 pb-1 pt-1.5 text-[11px] text-sd-fg-subtle">이 기간으로 다시 묻기</span>
                {REASK_PERIODS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onReask(p.name);
                    }}
                    className="rounded-lg px-2.5 py-1.5 text-left text-[12px] text-sd-fg-muted transition hover:bg-sd-fill hover:text-sd-fg"
                  >
                    {p.label}
                  </button>
                ))}
              </span>
            )}
          </span>
        ) : (
          <span key={i} className="rounded-lg bg-sd-fill px-2 py-0.5 text-sd-fg-muted">
            {c.text}
          </span>
        ),
      )}
    </div>
  );
}

/** 신선도 얼굴 한 칸. freshness.png(28x28 셋)를 정수 배로 키워 픽셀이 번지지 않게 */
function FreshFace({ frame, scale = 2 }: { frame: number; scale?: number }) {
  return (
    <span
      aria-hidden
      className="block shrink-0"
      style={{
        width: 28 * scale,
        height: 28 * scale,
        backgroundImage: "url(/admin/pet/freshness.png)",
        backgroundSize: `${84 * scale}px ${28 * scale}px`,
        backgroundPosition: `${-frame * 28 * scale}px 0`,
        imageRendering: "pixelated",
      }}
    />
  );
}

const TONE = {
  fresh: { on: "bg-fresh-weak ring-fresh text-fresh" },
  ripe: { on: "bg-ripe-weak ring-ripe text-ripe" },
  mold: { on: "bg-mold-weak ring-mold text-mold" },
} as const;

/**
 * 만족도 평가(feedback.ts). 그림은 치즈 신선도(노랑 만족해요, 갈색 보통이에요, 곰팡이 초록 아쉬워요), 글자는 만족도 말.
 * 고르면 그 칸만 색 바탕과 테두리가 생기고 나머지는 흐려진다. 보통이에요, 아쉬워요는 이유를 고르면 바로 보낸다. 한 줄 메모는 쓰고 싶은 사람만
 */
function Faces({ state, onChange }: { state?: FeedbackState; onChange: (f: FeedbackState) => void }) {
  const [note, setNote] = useState("");
  const picked = state?.value;
  const needsReason = picked === "meh" || picked === "bad";
  return (
    <div className="flex flex-col gap-2.5 border-t border-sd-hairline pt-3">
      <p className="text-[12px] text-sd-fg-subtle">{!picked ? "이 답, 만족스러웠어요?" : state?.sent ? "알려 줘서 고마워요. 모아 보고 다음 체다에 반영할게요" : "어떤 점이 아쉬웠어요?"}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {FEEDBACK_FACES.map((f) => {
          const on = picked === f.key;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={on}
              title={f.meaning}
              onClick={() => onChange({ value: f.key, sent: f.key === "good" })}
              className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 transition ${on ? `ring-1 ${TONE[f.tone].on}` : picked ? "opacity-35 hover:opacity-100" : "hover:bg-sd-fill"}`}
            >
              <FreshFace frame={f.frame} />
              <span className={`text-[12px] ${on ? "font-bold" : "text-sd-fg-muted"}`}>{f.label}</span>
            </button>
          );
        })}
      </div>
      {needsReason && !state?.sent && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            {FEEDBACK_REASONS.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => onChange({ value: picked!, reason: r.key, note: note.trim() || undefined, sent: true })}
                className="rounded-lg border border-sd-line px-2.5 py-1 text-[12px] text-sd-fg-muted transition hover:border-sd-fg-subtle hover:text-sd-fg"
              >
                {r.label}
              </button>
            ))}
          </div>
          <form
            className="flex items-center gap-1.5 rounded-lg border border-sd-line px-2.5 focus-within:border-accent"
            onSubmit={(e) => {
              e.preventDefault();
              if (note.trim()) onChange({ value: picked!, reason: "other", note: note.trim(), sent: true });
            }}
          >
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              placeholder="한 줄로 남겨도 돼요"
              aria-label="평가 메모"
              className="min-w-0 flex-1 bg-transparent py-1.5 text-[12px] text-sd-fg outline-none placeholder:text-sd-placeholder"
            />
            <button type="submit" aria-label="메모 보내기" disabled={!note.trim()} className="text-sd-fg-subtle transition hover:text-sd-fg disabled:opacity-30">
              <ArrowUpIcon className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * 답 문장 하나. 값(59명, 75.6%)은 굵게(emphasis.ts), 확인하지 못한 문장은 손으로 그은 형광펜(globals.css .chat-marker).
 * 모델에게 마크다운을 쓰게 하지 않고 화면이 정해진 규칙으로 강조해서, 답마다 모양이 같다
 */
function Sentence({ text, unchecked, strong }: { text: string; unchecked: boolean; strong?: boolean }) {
  return (
    <span className={`${strong ? "font-semibold" : ""} ${unchecked ? "chat-marker" : ""}`} title={unchecked ? "숫자를 확인하지 못했어요" : undefined}>
      {emphasize(text).map((p, i) =>
        p.num ? (
          <span key={i} className="font-bold text-sd-fg tabular-nums">
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </span>
  );
}

/**
 * 추측. 접어 두고 몇 개를 데이터로 비교해 봤는지 먼저 말한다.
 * 비교해 본 추측도 "확인한 사실"이 아니다. 같은 시기에 함께 움직였다는 것까지라 사실 단락과 떼어 둔다
 */
function Guesses({ items, onShow }: { items: { text: string; checked: boolean; unchecked: boolean; checks: Evidence[] }[]; onShow: (t: Target) => void }) {
  const [open, setOpen] = useState(false);
  const checked = items.filter((h) => h.checked).length;
  return (
    <div className="text-[13px]">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-sd-fg-muted transition hover:text-sd-fg">
        왜 그랬을지 추측 {items.length}개{checked > 0 && `, ${checked}개는 데이터로 비교해 봤어요`}
        <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-3 border-l-2 border-sd-line pl-3 leading-relaxed text-sd-fg-muted">
          {items.map((h, i) => (
            <li key={i} className="flex flex-col gap-2">
              <p>
                <span className="mr-1.5 text-[11px] font-semibold text-sd-fg-subtle">{h.checked ? "비교해 봄" : "확인 못 함"}</span>
                <Sentence text={h.text} unchecked={h.unchecked} />
              </p>
              {h.checks.map((e) => (
                <EvidenceBlock key={e.id} e={e} onShow={onShow} />
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** 근거 한 덩어리. 머리에 기간, 몸에 숫자나 작은 그림, 끝에 지표 화면으로 가는 길 */
function EvidenceBlock({ e, onShow }: { e: Evidence; onShow: (t: Target) => void }) {
  const head =
    e.kind === "compare"
      ? `${e.title ? `${e.title}, ` : ""}${rangeText(e.b)} → ${rangeText(e.a)}`
      : e.kind === "bars"
        ? `${e.title}, ${rangeText(e.range)}`
        : e.kind === "weekly"
          ? `${e.unit === "week" ? "주마다" : "달마다"} 더한 값, ${rangeText(e.range)}`
          : e.kind === "event"
            ? `행사 성적표, ${md(e.day)}${e.time ? ` ${e.time}` : ""}`
            : e.kind === "posts"
              ? `올린 게시물, ${rangeText(e.range)}`
              : rangeText(e.range);
  return (
    <figure className="overflow-hidden rounded-xl bg-sd-fill">
      <figcaption className="px-3.5 pt-3 text-[12px] text-sd-fg-subtle tabular-nums">{head}</figcaption>
      <div className="px-3.5 pb-3 pt-2">
        {e.kind === "compare" && <CompareRows rows={e.rows} />}
        {e.kind === "summary" && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {e.rows.map((r) => (
              <div key={r.key}>
                <dt className="text-[12px] text-sd-fg-muted">{r.label}</dt>
                <dd className="text-[18px] font-bold text-sd-fg">
                  {fmt(r.value)}
                  <span className="ml-0.5 text-[12px] font-semibold text-sd-fg-muted">{r.unit}</span>
                  {r.of && <span className="ml-1.5 text-[11px] font-normal text-sd-fg-subtle">{fmt(r.of.den)} 중 {fmt(r.of.num)}</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {e.kind === "weekly" && (
          <div className="flex flex-col gap-4">
            {e.rows.map((r) => (
              <WeeklyBars key={r.key} row={r} buckets={e.buckets} events={e.events} unit={e.unit} />
            ))}
          </div>
        )}
        {e.kind === "daily" && <Spark label={e.label} unit={e.unit} series={e.series} peak={e.peak} total={e.total} />}
        {e.kind === "bars" && <Bars rows={e.rows.map((r) => ({ label: e.country ? countryName(r.label) : r.label, value: r.value }))} unit={e.unit} />}
        {e.kind === "event" && <EventCard e={e} />}
        {e.kind === "posts" && (
          <ul className="flex flex-col gap-1.5 text-[13px] text-sd-fg">
            {e.posts.map((x, i) => (
              <li key={`${x.day}-${i}`} className="flex items-baseline gap-3">
                <span className="w-14 shrink-0 text-sd-fg-subtle tabular-nums">{md(x.day)}</span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="mr-1.5 text-[12px] text-sd-fg-subtle">{x.type}</span>
                  {x.caption || "글 없음"}
                </span>
                {x.views !== null && <span className="shrink-0 text-[12px] text-sd-fg-muted tabular-nums">조회 {fmt(x.views)}</span>}
              </li>
            ))}
          </ul>
        )}
        {e.kind === "events" && (
          <ul className="flex flex-col gap-1 text-[13px] text-sd-fg">
            {e.events.map((x) => (
              <li key={`${x.day}-${x.label}`} className="flex gap-3">
                <span className="w-14 shrink-0 text-sd-fg-subtle tabular-nums">{md(x.day)}</span>
                <span className="min-w-0">{x.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {e.target && (
        <button
          type="button"
          onClick={() => onShow(e.target!)}
          className="flex w-full items-center justify-between border-t border-sd-hairline px-3.5 py-2.5 text-[12px] font-semibold text-sd-fg-muted transition hover:bg-sd-pressed hover:text-sd-fg"
        >
          지표 화면에서 이 기간 보기
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </figure>
  );
}

/**
 * 행사 성적표 한 장. 위에 행사 이름, 큰 숫자 둘(행사 게임, 만난 방문객), 아래에 그날과 평소(앞선 같은 요일).
 * 만난 방문객은 여러 판에 나온 사람을 한 번만 센 수다. 판마다 더한 연인원은 작게 곁들인다
 */
function EventCard({ e }: { e: Extract<Evidence, { kind: "event" }> }) {
  const people = e.totals.uniqueVisitors;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] font-semibold text-sd-fg">{e.label.replace(/\s*\d{1,2}~\d{1,2}시.*$/, "")}</p>
      {e.totals.games > 0 ? (
        <dl className="grid grid-cols-2 gap-x-4">
          <div>
            <dt className="text-[12px] text-sd-fg-muted">행사 게임</dt>
            <dd className="text-[18px] font-bold text-sd-fg tabular-nums">
              {e.totals.games}
              <span className="ml-0.5 text-[12px] font-semibold text-sd-fg-muted">판</span>
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-sd-fg-muted">만난 방문객</dt>
            <dd className="text-[18px] font-bold text-sd-fg tabular-nums">
              {fmt(people ?? e.totals.visitorsSum)}
              <span className="ml-0.5 text-[12px] font-semibold text-sd-fg-muted">명</span>
              <span className="ml-1.5 text-[11px] font-normal text-sd-fg-subtle">{people === null ? "끝까지 남은 인원" : `판마다 더하면 ${fmt(e.totals.visitorsSum)}명`}</span>
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-[12px] text-sd-fg-subtle">행사 게임을 아직 고르지 않았어요</p>
      )}
      {e.rows.length > 0 && (
        <ul className="flex flex-col gap-2 border-t border-sd-hairline pt-2.5">
          {e.rows.map((r) => (
            <li key={r.key} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-[13px] text-sd-fg-muted">{r.label}</span>
              <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                <span className="text-[12px] text-sd-fg-subtle">평소 {fmt(r.usual)} →</span>
                <span className="text-[16px] font-bold text-sd-fg">
                  {fmt(r.value)}
                  <span className="ml-0.5 text-[12px] font-semibold text-sd-fg-muted">{r.unit}</span>
                </span>
                {r.pending && <span className="text-[11px] text-sd-fg-subtle">덜 들어옴</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type CompareRow = Extract<Evidence, { kind: "compare" }>["rows"][number];

/**
 * 비교 카드. 늘어난 것과 줄어든 것이 섞여 있고 세 줄이 넘으면 둘로 나눠 많이 바뀐 순으로 둔다(Tableau Pulse 의 오른 것, 내린 것).
 * 숫자 표기는 format.ts 한 곳(정수 %, 2배 넘으면 N배, 비율은 %p, 표본이 적으면 %를 감춘다).
 * 지표 화면의 증감과 같은 규칙: 화살표와 색을 같이, 줄면 빨강 대신 회색
 */
function CompareRows({ rows }: { rows: CompareRow[] }) {
  const items = rows.map((r) => ({ r, c: changeText({ a: r.a, b: r.b, changePct: r.changePct, points: r.points, lowSample: r.lowSample }), m: magnitude({ a: r.a, b: r.b, points: r.points, lowSample: r.lowSample }) }));
  const ups = items.filter((x) => x.c?.dir === "up").sort((x, y) => y.m - x.m);
  const downs = items.filter((x) => x.c?.dir === "down").sort((x, y) => y.m - x.m);
  const rest = items.filter((x) => !x.c || x.c.dir === "flat");
  const grouped = ups.length > 0 && downs.length > 0 && rows.length >= 3;
  const list = (xs: typeof items) => (
    <ul className="flex flex-col gap-2.5">
      {xs.map(({ r, c }) => (
        <li key={r.key} className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 text-[13px] text-sd-fg-muted">
            {r.label}
            {r.aOf && (
              <span className="block text-[11px] text-sd-fg-subtle tabular-nums">
                {valueText(r.aOf.den)} 중 {valueText(r.aOf.num)}
              </span>
            )}
          </span>
          <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
            {/* 비교 기간에서 이번 기간으로: "30 → 42건" */}
            <span className="text-[12px] text-sd-fg-subtle">{valueText(r.b)} →</span>
            <span className="text-[16px] font-bold text-sd-fg">
              {valueText(r.a)}
              <span className="ml-0.5 text-[12px] font-semibold text-sd-fg-muted">{r.unit}</span>
            </span>
            {c && c.dir !== "flat" && (
              <span className={`inline-flex items-center text-[12px] font-bold ${c.dir === "up" ? "text-chart-up" : "text-sd-fg-muted"}`}>
                <svg viewBox="0 0 24 24" className={`h-3 w-3 ${c.dir === "up" ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 19V6M6 12l6-6 6 6" />
                </svg>
                <span className="sr-only">{c.dir === "up" ? "늘어남" : "줄어듦"}</span>
                {c.text}
              </span>
            )}
            {c?.dir === "flat" && <span className="text-[12px] text-sd-fg-subtle">그대로</span>}
            {r.lowSample && <span className="text-[11px] text-sd-fg-subtle">숫자가 적어요</span>}
          </span>
        </li>
      ))}
    </ul>
  );
  // 한쪽으로만 움직였거나 두 줄 이하면 체다가 고른 순서 그대로
  if (!grouped) return list(items);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-chart-up">늘어난 것</p>
        {list(ups)}
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-sd-fg-subtle">줄어든 것</p>
        {list(downs)}
      </div>
      {rest.length > 0 && <div>{list(rest)}</div>}
    </div>
  );
}

/** 날짜별 값의 작은 선. 숫자가 없는 날은 선을 끊는다(지표 화면 차트와 같은 규칙). 가장 많은 날에 점 */
function Spark({ label, unit, series, peak, total }: { label: string; unit: string; series: { day: string; value: number | null }[]; peak: { day: string; value: number } | null; total: number | null }) {
  const W = 300;
  const H = 56;
  const max = Math.max(1, ...series.map((p) => p.value ?? 0));
  const x = (i: number) => (series.length < 2 ? W / 2 : (i / (series.length - 1)) * W);
  const y = (v: number) => H - 4 - (v / max) * (H - 10);
  let d = "";
  series.forEach((p, i) => {
    if (p.value === null) return;
    d += `${i > 0 && series[i - 1].value !== null ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`;
  });
  const pi = peak ? series.findIndex((p) => p.day === peak.day) : -1;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
        <span className="text-sd-fg-muted">{label}</span>
        {total !== null && (
          <span className="font-bold text-sd-fg tabular-nums">
            합계 {fmt(total)}
            {unit}
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-14 w-full" role="img" aria-label={`${label} 날짜별${peak ? `, 가장 많은 날 ${md(peak.day)} ${peak.value}${unit}` : ""}`}>
        <path d={d} fill="none" stroke="var(--chart-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {pi >= 0 && peak && <circle cx={x(pi)} cy={y(peak.value)} r={3.5} fill="var(--chart-1)" />}
      </svg>
      {peak && (
        <p className="mt-1 text-[12px] text-sd-fg-subtle tabular-nums">
          가장 많은 날 {md(peak.day)}, {fmt(peak.value)}
          {unit}
        </p>
      )}
    </div>
  );
}

/**
 * 주(또는 달)마다 더한 막대. 가장 큰 칸에 값을 적고, 일정이 있던 칸 밑에 점을 찍는다(지표 화면 차트의 일정 점과 같은 뜻).
 * 칸이 30개를 넘지 않아(tools.ts WEEKLY_UNTIL) 막대 폭이 너무 얇아지지 않는다
 */
function WeeklyBars({
  row,
  buckets,
  events,
  unit,
}: {
  row: { label: string; unit: string; total: number | null; values: (number | null)[] };
  buckets: Range[];
  events: { day: string; label: string }[];
  unit: "week" | "month";
}) {
  const max = Math.max(1, ...row.values.map((v) => v ?? 0));
  const peak = row.values.reduce<number>((best, v, i) => ((v ?? -1) > (row.values[best] ?? -1) ? i : best), 0);
  const hasEvent = buckets.map((b) => events.filter((x) => x.day >= b.start && x.day <= b.end));
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
        <span className="text-sd-fg-muted">{row.label}</span>
        {row.total !== null && (
          <span className="font-bold text-sd-fg tabular-nums">
            모두 {fmt(row.total)}
            {row.unit}
          </span>
        )}
      </div>
      <div className="flex h-14 items-end gap-[2px]" role="img" aria-label={`${row.label} ${unit === "week" ? "주별" : "달별"}, 가장 많은 칸 ${rangeText(buckets[peak])} ${fmt(row.values[peak] ?? null)}${row.unit}`}>
        {row.values.map((v, i) => (
          <span
            key={buckets[i].start}
            title={`${rangeText(buckets[i])} ${fmt(v)}${row.unit}${hasEvent[i].length ? `, ${hasEvent[i].map((x) => x.label).join(", ")}` : ""}`}
            className={`min-w-0 flex-1 rounded-t-[3px] ${v === null ? "bg-sd-gray-200" : i === peak ? "bg-chart-1" : "bg-chart-1/45"}`}
            style={{ height: `${v === null ? 6 : Math.max(4, (v / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex gap-[2px]" aria-hidden>
        {buckets.map((b, i) => (
          <span key={b.start} className="flex min-w-0 flex-1 justify-center">
            {hasEvent[i].length > 0 && <span className="h-1 w-1 rounded-full bg-chart-2" />}
          </span>
        ))}
      </div>
      <p className="mt-1 text-[12px] text-sd-fg-subtle tabular-nums">
        가장 많은 {unit === "week" ? "주" : "달"} {rangeText(buckets[peak])}, {fmt(row.values[peak] ?? null)}
        {row.unit}
        {events.length > 0 && <span className="block">아래 점은 일정이 있던 {unit === "week" ? "주" : "달"}예요</span>}
      </p>
    </div>
  );
}

function Bars({ rows, unit }: { rows: { label: string; value: number }[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-[13px] text-sd-fg-subtle">이 기간엔 숫자가 없어요</p>;
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-2.5 text-[13px]">
          <span className="truncate text-sd-fg-muted">{r.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-sd-surface">
            <span className="block h-full rounded-full bg-chart-1" style={{ width: `${Math.max(3, (r.value / max) * 100)}%` }} />
          </span>
          <span className="font-semibold text-sd-fg tabular-nums">
            {fmt(r.value)}
            {unit}
          </span>
        </li>
      ))}
    </ul>
  );
}
