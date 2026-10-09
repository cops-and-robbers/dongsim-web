"use client";

import { useState } from "react";
import { countryName } from "@/components/admin/metrics/countryName";
import { ArrowRightIcon, ChevronDownIcon, ThumbsDownIcon, ThumbsUpIcon } from "@/components/admin/icons";
import { evidenceOf, type Evidence, type Range, type Target, type Trace } from "@/lib/metrics/chat/evidence";

/**
 * 챗봇 답 하나 (#163). 글보다 숫자가 먼저 보이게 한다.
 *
 * - 답 글은 말풍선이나 카드 없이 치즈 얼굴 옆에 바로 둔다. 첫 문장(headline)이 질문에 대한 답이고, 이어지는 사실은 같은 단락으로 잇는다
 * - 그 아래 근거는 도구 결과를 그대로 그린 것이다(evidence.ts). 지표 화면의 숫자 칸, 증감 화살표와 같은 모양이라 화면과 바로 대조된다
 * - 근거마다 "지표 화면에서 보기"로 같은 기간, 같은 탭을 연다(Mixpanel Spark, Metabase Metabot 의 "보고서로 열기")
 * - 확인하지 못한 문장은 숨기지 않고 물결 밑줄과 한 줄 안내로 표시한다. 큰 경고 딱지는 붙이지 않는다
 * - 추측(hypotheses)은 접어 둔다. 확인한 것과 같은 무게로 보이지 않게
 * - 평가는 글 대신 엄지 아이콘 둘
 */

export type Claim = { text: string; refs: string[] };
export type Answer = { headline: Claim; facts: Claim[]; hypotheses: string[]; caveats: string[]; followUps: string[] };
export type Result = { id: number | null; answer: Answer; unverified: string[]; retried: boolean; tools: Trace[]; costUsd: number };

const md = (ymd: string) => `${Number(ymd.slice(5, 7))}월 ${Number(ymd.slice(8))}일`;
/** "9월 21일~27일", 달이 바뀌면 "9월 28일~10월 4일" */
export const rangeText = (r: Range) =>
  r.start === r.end ? md(r.start) : r.start.slice(0, 7) === r.end.slice(0, 7) ? `${md(r.start)}~${Number(r.end.slice(8))}일` : `${md(r.start)}~${md(r.end)}`;
const fmt = (v: number | null) => (v === null ? "-" : v.toLocaleString("ko-KR", { maximumFractionDigits: 1 }));

export function AnswerBody({
  result,
  feedback,
  onFeedback,
  onShow,
}: {
  result: Result;
  feedback?: "good" | "bad";
  onFeedback: (v: "good" | "bad") => void;
  onShow: (t: Target) => void;
}) {
  const { answer, unverified } = result;
  const evidence = evidenceOf(result.tools, answer);
  const unchecked = (where: string) => unverified.includes(where);
  const notes = [...new Set([...answer.caveats, ...evidence.flatMap((e) => e.notes)])];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <p className="text-[14px] leading-[1.65] text-sd-fg">
        <Sentence text={answer.headline.text} unchecked={unchecked("headline")} strong />
        {answer.facts.map((f, i) => (
          <span key={i}>
            {" "}
            <Sentence text={f.text} unchecked={unchecked(`facts[${i}]`)} />
          </span>
        ))}
      </p>
      {unverified.length > 0 && <p className="-mt-1 text-[12px] text-sd-warning">물결 밑줄 친 문장은 숫자를 확인하지 못했어요. 지표 화면에서 한 번 더 봐 주세요.</p>}

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

      {answer.hypotheses.length > 0 && <Guesses items={answer.hypotheses} />}

      <div className="flex items-center gap-1 text-sd-fg-subtle">
        <IconToggle label="도움이 됐어요" on={feedback === "good"} disabled={!!feedback || result.id === null} onClick={() => onFeedback("good")}>
          <ThumbsUpIcon className="h-[15px] w-[15px]" />
        </IconToggle>
        <IconToggle label="아쉬워요" on={feedback === "bad"} disabled={!!feedback || result.id === null} onClick={() => onFeedback("bad")}>
          <ThumbsDownIcon className="h-[15px] w-[15px]" />
        </IconToggle>
        {feedback && <span className="ml-1 text-[12px]">{feedback === "good" ? "고마워요" : "더 나은 답을 찾아볼게요"}</span>}
      </div>
    </div>
  );
}

function Sentence({ text, unchecked, strong }: { text: string; unchecked: boolean; strong?: boolean }) {
  return (
    <span
      className={`${strong ? "font-semibold" : ""} ${unchecked ? "underline decoration-sd-warning decoration-wavy decoration-1 underline-offset-4" : ""}`}
      title={unchecked ? "숫자를 확인하지 못했어요" : undefined}
    >
      {text}
    </span>
  );
}

function Guesses({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-[13px]">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-sd-fg-muted transition hover:text-sd-fg">
        확인하지 않은 추측 {items.length}개
        <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="mt-1.5 flex flex-col gap-1.5 border-l-2 border-sd-line pl-3 leading-relaxed text-sd-fg-muted">
          {items.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IconToggle({ label, on, disabled, onClick, children }: { label: string; on: boolean; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md p-1.5 transition hover:bg-sd-fill hover:text-sd-fg disabled:pointer-events-none ${on ? "text-accent" : ""} ${disabled && !on ? "opacity-40" : ""}`}
    >
      {children}
    </button>
  );
}

/** 근거 한 덩어리. 머리에 기간, 몸에 숫자나 작은 그림, 끝에 지표 화면으로 가는 길 */
function EvidenceBlock({ e, onShow }: { e: Evidence; onShow: (t: Target) => void }) {
  const head =
    e.kind === "compare" ? `${e.title ? `${e.title}, ` : ""}${rangeText(e.b)} → ${rangeText(e.a)}` : e.kind === "bars" ? `${e.title}, ${rangeText(e.range)}` : rangeText(e.range);
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
                </dd>
              </div>
            ))}
          </dl>
        )}
        {e.kind === "daily" && <Spark label={e.label} unit={e.unit} series={e.series} peak={e.peak} total={e.total} />}
        {e.kind === "bars" && <Bars rows={e.rows.map((r) => ({ label: e.country ? countryName(r.label) : r.label, value: r.value }))} unit={e.unit} />}
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

/** 지표 화면의 증감과 같은 규칙: 화살표와 색을 같이, 줄면 빨강 대신 회색, 표본이 적으면 %를 감춘다 */
function CompareRows({ rows }: { rows: Extract<Evidence, { kind: "compare" }>["rows"] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => {
        const up = r.changePct !== null && r.changePct > 0;
        const flat = r.changePct === 0;
        return (
          <li key={r.key} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 text-[13px] text-sd-fg-muted">{r.label}</span>
            <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
              {/* 비교 기간에서 이번 기간으로: "30 → 42건" */}
              <span className="text-[12px] text-sd-fg-subtle">{fmt(r.b)} →</span>
              <span className="text-[16px] font-bold text-sd-fg">
                {fmt(r.a)}
                <span className="ml-0.5 text-[12px] font-semibold text-sd-fg-muted">{r.unit}</span>
              </span>
              {r.changePct !== null && !r.lowSample && !flat && (
                <span className={`inline-flex items-center text-[12px] font-bold ${up ? "text-chart-up" : "text-sd-fg-muted"}`}>
                  <svg viewBox="0 0 24 24" className={`h-3 w-3 ${up ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 19V6M6 12l6-6 6 6" />
                  </svg>
                  <span className="sr-only">{up ? "늘어남" : "줄어듦"}</span>
                  {Math.abs(r.changePct)}%
                </span>
              )}
              {r.lowSample && <span className="text-[11px] text-sd-fg-subtle">숫자가 적어요</span>}
            </span>
          </li>
        );
      })}
    </ul>
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
