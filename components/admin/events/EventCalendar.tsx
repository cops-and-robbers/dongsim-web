"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/admin/icons";
import { WEEK, addMonths, dayLabel, monthEnd, monthStart, weekday } from "@/lib/metrics/dashboard/calendar";
import { addDays } from "@/lib/metrics/dates";
import {
  boothState,
  hourLabel,
  minigameOn,
  momentsOn,
  popupOn,
  popupWindow,
  storyState,
  toMs,
  type EventDay,
  type EventSettings,
  type HomeMinigame,
  type KstTime,
} from "@/lib/event/settings";
import { EventPreview, type PreviewScene } from "./EventPreview";

// "언제 무엇이 보이나" 달력 (#219, docs/admin-ui.md "행사").
// 지표 일정 달력과 같은 모양(일요일 시작, 칸 높이)에 기간 막대를 얹는다. 날짜를 누르면 오른쪽에 그날 바뀌는 시각이,
// 시각을 누르면 그 순간 홈과 부스 화면이 아래에 뜬다. 시간 칸을 읽고 머릿속으로 맞춰 보지 않아도 되게.

type Bar = { key: string; lane: number; from: string; to: string; label: string; tone: string };

const TONE = {
  event: "bg-ev-event text-white",
  popup: "bg-sd-info-weak text-sd-info",
  minigame: "bg-sd-positive-weak text-sd-positive",
};

/** 구간의 마지막 날. 자정에 끝나면 그 전날까지 */
const lastDay = (until: KstTime) => (until.slice(11) === "00:00" ? addDays(until.slice(0, 10), -1) : until.slice(0, 10));

function barsOf(e: EventDay, s: EventSettings, m: HomeMinigame, today: string): Bar[] {
  const bars: Bar[] = [];
  // 칸 하나 폭이라 시작 시각만. 끝 시각은 오른쪽 고른 날 칸이 말한다
  bars.push({ key: "event", lane: 0, from: e.day, to: e.day, label: e.startsAt ? `행사 ${e.startsAt}` : "행사", tone: TONE.event });
  const w = popupWindow(e, s);
  if (w) {
    const from = w.from ? w.from.slice(0, 10) : today < e.day ? today : e.day;
    bars.push({ key: "popup", lane: 1, from, to: lastDay(w.until), label: "홈 팝업", tone: TONE.popup });
  }
  if (m) bars.push({ key: "minigame", lane: 2, from: m.from.slice(0, 10), to: lastDay(m.until), label: "홈 미니게임", tone: TONE.minigame });
  return bars;
}

/** 그 순간 사용자에게 보이는 것 */
export function statesAt(e: EventDay, s: EventSettings, m: HomeMinigame, t: number) {
  const b = boothState(s, t);
  const after = toMs(s.boothUntil) < t;
  const booth: PreviewScene = b === "open" ? "booth-open" : b === "after" || (b === "closed" && after) ? "booth-after" : "booth-before";
  return {
    booth,
    boothText: b === "open" ? "열림 · 손님이 찍어요" : b === "closed" ? "닫아 둠" : b === "before" ? "준비 중 화면" : "감사 인사 화면",
    home: (popupOn(e, s, t) ? "popup" : "home") as PreviewScene,
    story: s.story === "booth" ? ({ teaser: "곧 공개", open: "본문 공개", done: "사건 종결" } as const)[storyState(s, t)] : null,
    minigame: minigameOn(m, t),
  };
}

export function EventCalendar({ event, settings, minigame, today }: { event: EventDay; settings: EventSettings; minigame: HomeMinigame; today: string }) {
  const [view, setView] = useState(monthStart(event.day));
  const [selected, setSelected] = useState(event.day);
  const [at, setAt] = useState<KstTime | null>(null);

  const bars = useMemo(() => barsOf(event, settings, minigame, today), [event, settings, minigame, today]);
  const first = view;
  const last = monthEnd(first);
  const blanks = weekday(first);
  const days: (string | null)[] = [...Array<null>(blanks).fill(null)];
  for (let d = first; d <= last; d = addDays(d, 1)) days.push(d);
  while (days.length % 7) days.push(null);
  const weeks = Array.from({ length: days.length / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7));

  const moments = momentsOn(selected, event, settings, minigame);
  // 고른 시각, 아니면 그날 첫 변화, 아니면 낮 12시. 바뀌는 시각 바로 뒤를 보여 준다(바뀐 모습)
  const shownAt: KstTime = at && at.slice(0, 10) === selected ? at : (moments[0]?.at ?? `${selected}T12:00`);
  const st = statesAt(event, settings, minigame, toMs(shownAt) + 60_000);
  const [y, mo] = first.split("-").map(Number);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" aria-label="이전 달" onClick={() => setView(addMonths(view, -1))} className="flex h-8 w-8 items-center justify-center rounded-lg text-sd-fg-muted hover:bg-sd-gray-200">
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <span className="text-[15px] font-bold text-sd-fg">
            {y}년 {mo}월
          </span>
          <button type="button" aria-label="다음 달" onClick={() => setView(addMonths(view, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg text-sd-fg-muted hover:bg-sd-gray-200">
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
        <Legend />
        <div className="mt-2 grid grid-cols-7 border-b border-sd-hairline pb-1 text-center text-[11px] font-medium text-sd-fg-subtle" aria-hidden>
          {WEEK.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div role="grid" aria-label={`${y}년 ${mo}월 행사 달력`}>
          {weeks.map((week, wi) => {
            const inWeek = week.filter(Boolean) as string[];
            const ws = inWeek[0];
            const we = inWeek[inWeek.length - 1];
            return (
              <div key={wi} role="row" className="relative grid grid-cols-7">
                {week.map((d, i) =>
                  d ? (
                    <button
                      key={d}
                      type="button"
                      role="gridcell"
                      aria-selected={d === selected}
                      aria-label={`${dayLabel(d, true)}${d === today ? ", 오늘" : ""}${d === event.day ? ", 행사 날" : ""}`}
                      onClick={() => {
                        setSelected(d);
                        setAt(null);
                      }}
                      className={`flex h-[72px] flex-col border-b border-sd-hairline p-1 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:h-[92px] sm:p-1.5 ${
                        d === selected ? "bg-accent-weak" : "hover:bg-sd-gray-200"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[12px] tabular-nums ${
                          d === today ? "bg-sd-fg font-bold text-sd-surface" : d < today ? "text-sd-fg-subtle" : "text-sd-fg"
                        }`}
                      >
                        {Number(d.slice(8))}
                      </span>
                    </button>
                  ) : (
                    <span key={`b${i}`} className="border-b border-sd-hairline" />
                  ),
                )}
                {/* 기간 막대. 날짜 숫자 아래 줄마다 하나. 누르는 건 날짜 칸이 받는다 */}
                {ws &&
                  bars
                    .filter((b) => b.from <= we && b.to >= ws)
                    .map((b) => {
                      const from = b.from < ws ? ws : b.from;
                      const to = b.to > we ? we : b.to;
                      const col = week.indexOf(from);
                      const span = week.indexOf(to) - col + 1;
                      const startsHere = b.from >= ws;
                      const endsHere = b.to <= we;
                      return (
                        <span
                          key={b.key}
                          aria-hidden
                          // 폰은 칸이 좁아 막대를 얇게, 글자는 빼고 색으로만(아래 범례와 고른 날 칸이 글로 말한다)
                          className={`pointer-events-none absolute top-[calc(24px+var(--lane)*14px)] flex h-[11px] items-center overflow-hidden whitespace-nowrap px-1.5 text-[11px] font-semibold max-sm:text-transparent sm:top-[calc(26px+var(--lane)*21px)] sm:h-[19px] ${b.tone} ${startsHere ? "rounded-l-md" : ""} ${endsHere ? "rounded-r-md" : ""}`}
                          style={
                            {
                              left: `calc(${(col / 7) * 100}% + ${startsHere ? 3 : 0}px)`,
                              width: `calc(${(span / 7) * 100}% - ${(startsHere ? 3 : 0) + (endsHere ? 3 : 0)}px)`,
                              "--lane": b.lane,
                            } as CSSProperties
                          }
                        >
                          {startsHere || col === 0 ? b.label : ""}
                        </span>
                      );
                    })}
              </div>
            );
          })}
        </div>
      </div>

      {/* 고른 날 */}
      <aside className="rounded-xl border border-sd-line p-4" aria-live="polite">
        <p className="text-[15px] font-bold text-sd-fg">
          {dayLabel(selected, true)}
          {selected === event.day && <span className="ml-2 rounded-md bg-ev-event px-1.5 py-0.5 align-middle text-[11px] font-semibold text-white">행사 날</span>}
          {selected === today && <span className="ml-2 rounded-md bg-sd-gray-200 px-1.5 py-0.5 align-middle text-[11px] font-semibold text-sd-fg-muted">오늘</span>}
        </p>
        {moments.length > 0 ? (
          <>
            <p className="mt-1 text-[12px] text-sd-fg-subtle">이날 바뀌는 때예요. 누르면 그 뒤 화면이 아래에 떠요.</p>
            <ol className="mt-3 space-y-1">
              {moments.map((m) => {
                const on = m.at === shownAt;
                return (
                  <li key={m.at}>
                    <button
                      type="button"
                      onClick={() => setAt(m.at)}
                      aria-pressed={on}
                      className={`flex w-full gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${on ? "bg-accent-weak" : "hover:bg-sd-gray-200"}`}
                    >
                      <span className={`w-[68px] shrink-0 text-[13px] font-semibold tabular-nums ${on ? "text-accent" : "text-sd-fg"}`}>{hourLabel(m.at.slice(11))}</span>
                      <span className="min-w-0 text-[13px] leading-relaxed text-sd-fg-muted">{m.what.join(", ")}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </>
        ) : (
          <p className="mt-1 text-[12px] text-sd-fg-subtle">이날은 하루 종일 같은 화면이에요.</p>
        )}

        <div className="mt-4 border-t border-sd-hairline pt-4">
          <p className="text-[12px] font-semibold text-sd-fg-subtle">{moments.length ? `${hourLabel(shownAt.slice(11))} 뒤` : "이날"} 사용자에게는</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
            <dt className="text-sd-fg-subtle">홈 팝업</dt>
            <dd className="text-sd-fg">{st.home === "popup" ? "떠 있어요" : "안 떠요"}</dd>
            <dt className="text-sd-fg-subtle">홈 미니게임</dt>
            <dd className="text-sd-fg">{st.minigame ? "보여요" : "숨겨요"}</dd>
            <dt className="text-sd-fg-subtle">포토부스</dt>
            <dd className="text-sd-fg">{st.boothText}</dd>
            {st.story && (
              <>
                <dt className="text-sd-fg-subtle">행사 페이지</dt>
                <dd className="text-sd-fg">{st.story}</dd>
              </>
            )}
          </dl>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <figure className="m-0">
              <EventPreview settings={settings} scene={st.home} spot={null} theme="light" />
              <figcaption className="mt-1 text-center text-[11px] text-sd-fg-subtle">홈</figcaption>
            </figure>
            <figure className="m-0">
              <EventPreview settings={settings} scene={st.booth} spot={null} theme="light" />
              <figcaption className="mt-1 text-center text-[11px] text-sd-fg-subtle">포토부스</figcaption>
            </figure>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Legend() {
  const items = [
    { label: "행사 날", tone: TONE.event },
    { label: "홈 팝업", tone: TONE.popup },
    { label: "홈 미니게임", tone: TONE.minigame },
  ];
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-sd-fg-muted">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={`h-2.5 w-4 rounded-sm ${i.tone}`} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
