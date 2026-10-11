"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/admin/Button";
import { SectionCard } from "@/components/admin/Parts";
import { useKeyboardInset } from "@/components/admin/useKeyboardInset";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/admin/icons";
import { getAccessToken } from "@/lib/admin/auth/tokens";
import { reissue } from "@/lib/admin/auth/session";
import { WEEK, addMonths, dayLabel, monthEnd, monthStart, shiftMonth, weekday } from "@/lib/metrics/dashboard/calendar";
import { addDays, ymdRange } from "@/lib/metrics/dates";
import { CATEGORY_LABEL, DEFAULT_RADIUS_M, parsePlace, type Category, type MetricsEvent } from "@/lib/metrics/events";
import { CATEGORY_DOT, CATEGORY_HINT, PICKABLE } from "./eventStyle";

/**
 * 일정 달력 (#145, #165). 지표 화면 요약 탭 맨 아래.
 *
 * 일정은 차트에 마름모로 겹쳐 "그날 왜 숫자가 바뀌었나"를 설명한다. 넣고 보는 곳은 이 달력이다.
 * - 한 달씩 본다. 처음엔 지금 보는 기간의 마지막 달
 * - 일정은 성격(행사, 홍보, 테스트, 기타)을 골라 넣는다. 성격마다 점 색이 다르고 이름도 같이 적는다(색만으로 구분하지 않는다).
 *   행사는 시간과 장소(지도에서 복사한 좌표)를 넣으면 그 자리의 게임을 찾아 성적표를 만든다(EventReport)
 * - 사람이 넣은 일정은 칩, 앱 업데이트(지금 배포 중인 버전을 매일 보고 자동)는 작은 회색 점과 글씨.
 *   업데이트는 켜고 끌 수 있다. 목록에서 행사를 묻지 않게
 * - 날짜를 누르면 그날 일정과 입력 칸이 열린다. 넓은 화면은 달력 오른쪽 칸, 폰은 아래에서 올라오는 시트.
 *   (처음엔 달력 아래에 열었는데, 달력을 보던 위치에서는 화면 밖이라 눌러도 반응이 없는 것처럼 보였다)
 * - 앞으로 있을 행사도 미리 넣을 수 있다(1년 뒤까지). 장소를 나중에 알게 되면 "고치기"로 넣는다
 * - 폰에서는 칸이 좁아 이름 대신 점만 찍고, 내용은 날짜를 눌러 아래에서 본다
 * - 일정이 있는 지난 날을 누르면 "이날부터 7일을 그 전 7일과 비교"로 바로 넘어간다(#152). 행사를 적어 두는 이유가
 *   "그 뒤 숫자가 어땠나"를 보려는 것이라, 기간과 비교를 따로 맞추지 않아도 되게 했다
 * - 키보드: 화살표 하루, 위아래 한 주, PageUp/PageDown 한 달, Enter 로 그날 열기, Esc 로 닫기
 *
 * 일정은 전부 한 번에 읽는다(GET /api/admin/metrics/events). 넣거나 고치거나 지우면 다시 읽고,
 * 지표 화면도 다시 불러 차트의 마름모를 맞춘다(onChanged).
 */

type Event = MetricsEvent;

/** 자동으로 들어온 출시(App Store Connect 버전 목록, Play 프로덕션 트랙, #147) */
const isRelease = (e: Event) => e.category === "release";
const shortRelease = (label: string) => label.replace(/ 출시$/, "");

/** 입력 칸. 행사가 아니면 시간과 장소는 보내지 않는다 */
type Draft = { label: string; category: Category | null; startsAt: string; endsAt: string; placeText: string; radius: number };
const EMPTY: Draft = { label: "", category: null, startsAt: "", endsAt: "", placeText: "", radius: DEFAULT_RADIUS_M };
const RADII = [300, 500, 1000];
const draftOf = (e: Event): Draft => ({
  label: e.label,
  category: e.category,
  startsAt: e.startsAt ?? "",
  endsAt: e.endsAt ?? "",
  placeText: e.place ? `${e.place.lat}, ${e.place.lng}` : "",
  radius: e.place?.radiusM ?? DEFAULT_RADIUS_M,
});
/** 행사의 시간과 장소 한 줄. "14:00~16:00, 장소 반경 500m" */
const eventDetail = (e: Event) =>
  [e.startsAt && e.endsAt ? `${e.startsAt}~${e.endsAt}` : "시간 없음", e.place ? `장소 반경 ${e.place.radiusM}m` : "장소 없음"].join(", ");

async function call(url: string, init: RequestInit = {}): Promise<Response> {
  const send = () => fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${getAccessToken() ?? ""}` }, cache: "no-store" });
  let res = await send();
  if (res.status === 401 && (await reissue())) res = await send();
  return res;
}

const inputClass = "h-9 min-w-0 rounded-xl border border-sd-line bg-sd-surface px-3 text-[13px] text-sd-fg outline-none placeholder:text-sd-placeholder focus:border-accent";

export function EventsCalendar({
  initialMonth,
  today,
  onChanged,
  onCompare,
}: {
  initialMonth: string;
  today: string;
  onChanged: () => void;
  /** 그날부터 7일을 그 전 7일과 비교하는 화면으로 바꾼다(#152). 행사 효과를 한 번에 보려고 */
  onCompare?: (day: string) => void;
}) {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState(monthStart(initialMonth));
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState(initialMonth);
  const [showUpdates, setShowUpdates] = useState(true);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const keyboard = useRef(false);
  // 폰 시트가 열려 있을 때 키보드가 가린 높이 (#155)
  const kb = useKeyboardInset(selected !== null);
  const max = addDays(today, 365);

  useEffect(() => {
    let alive = true;
    call("/api/admin/metrics/events")
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as Event[] | { error?: string } | null;
        if (!alive) return;
        if (!res.ok || !Array.isArray(body)) setLoadError((body as { error?: string } | null)?.error ?? "일정을 못 불러왔어요.");
        else {
          setEvents(body);
          setLoadError(null);
        }
      })
      .catch(() => alive && setLoadError("일정을 못 불러왔어요."));
    return () => {
      alive = false;
    };
  }, [reload]);

  // 키보드로 옮긴 날로 초점을 따라 보낸다(마우스로 누를 때는 초점을 옮기지 않는다)
  useEffect(() => {
    if (!keyboard.current) return;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus();
  }, [focus, view]);

  const byDay = new Map<string, Event[]>();
  for (const e of events ?? []) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e]);
  const visible = (list: Event[]) => (showUpdates ? list : list.filter((e) => !isRelease(e)));
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const changed = () => {
    setReload((n) => n + 1);
    onChanged();
  };
  const save = async () => {
    const text = draft.label.trim();
    if (!selected || !text || !draft.category) return;
    const isEvent = draft.category === "event";
    const place = isEvent && draft.placeText.trim() ? parsePlace(draft.placeText) : null;
    if (isEvent && draft.placeText.trim() && !place) return setError("좌표를 읽지 못했어요. 지도에서 복사한 37.5498, 127.0799 같은 값을 넣어 주세요.");
    if (isEvent && Boolean(draft.startsAt) !== Boolean(draft.endsAt)) return setError("시작과 끝 시간을 둘 다 넣거나 둘 다 비워 주세요.");
    setBusy(true);
    setError(null);
    const body = {
      label: text,
      category: draft.category,
      startsAt: isEvent && draft.startsAt ? draft.startsAt : null,
      endsAt: isEvent && draft.endsAt ? draft.endsAt : null,
      place: place ? { ...place, radiusM: draft.radius } : null,
    };
    const res = await call(editing ? `/api/admin/metrics/events?id=${editing}` : "/api/admin/metrics/events", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing ? body : { day: selected, ...body }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const b = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
      return setError(b?.error ?? (editing ? "일정을 고치지 못했어요. 잠시 뒤 다시 해 주세요." : "일정을 넣지 못했어요. 잠시 뒤 다시 해 주세요."));
    }
    setDraft(EMPTY);
    setEditing(null);
    changed();
  };
  const remove = async (id: number) => {
    setError(null);
    const res = await call(`/api/admin/metrics/events?id=${id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return setError("일정을 지우지 못했어요. 잠시 뒤 다시 해 주세요.");
    if (editing === id) {
      setEditing(null);
      setDraft(EMPTY);
    }
    changed();
  };

  const open = (d: string) => {
    setSelected(d);
    setFocus(d);
    setError(null);
    if (d !== selected) {
      setDraft(EMPTY);
      setEditing(null);
    }
    // 넓은 화면은 옆 칸, 폰은 아래 시트의 입력 칸 중 보이는 쪽에 초점을 둔다(그려진 뒤에)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const inputs = rootRef.current?.querySelectorAll<HTMLInputElement>("[data-day-input]") ?? [];
        [...inputs].find((el) => el.offsetParent !== null)?.focus({ preventScroll: true });
      }),
    );
  };
  const move = (next: string) => {
    keyboard.current = true;
    setFocus(next);
    if (monthStart(next) !== view) setView(monthStart(next));
  };
  const onKey = (e: KeyboardEvent) => {
    const map: Record<string, () => string> = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      PageUp: () => shiftMonth(focus, -1),
      PageDown: () => shiftMonth(focus, 1),
    };
    if (map[e.key]) {
      e.preventDefault();
      move(map[e.key]());
    } else if (e.key === "Escape") {
      setSelected(null);
    }
  };

  const days = ymdRange(view, monthEnd(view));
  const blanks = weekday(view);
  const [y, m] = view.split("-").map(Number);
  const monthEvents = (events ?? []).filter((e) => e.day >= view && e.day <= monthEnd(view));
  const monthManual = monthEvents.filter((e) => !isRelease(e));
  const monthReleases = monthEvents.filter((e) => isRelease(e));
  const dayEvents = selected ? (byDay.get(selected) ?? []) : [];

  // 날짜 칸: 넓은 화면에서는 달력 오른쪽에 늘 붙어 있고, 폰에서는 날짜를 누르면 아래에서 올라온다.
  // 달력 아래에 열면 달력을 다 보던 위치에서는 화면 밖이라 눌러도 반응이 없는 것처럼 보였다
  const panel = selected ? (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[15px] font-bold text-sd-fg">{dayLabel(selected, true)}</p>
        <button type="button" onClick={() => setSelected(null)} className="rounded-lg px-2 py-1 text-[12px] text-sd-fg-subtle hover:bg-sd-gray-200">
          닫기
        </button>
      </div>
      <form
        className="flex flex-col gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <input
          data-day-input
          value={draft.label}
          onChange={(e) => set({ label: e.target.value })}
          onKeyDown={(e) => e.key === "Escape" && setSelected(null)}
          maxLength={40}
          placeholder="예: OO대학교 대항전"
          aria-label={`${dayLabel(selected)} 일정 이름`}
          className={inputClass}
        />
        <div role="radiogroup" aria-label="일정 성격" className="flex flex-wrap gap-1.5">
          {PICKABLE.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={draft.category === c}
              onClick={() => set({ category: c })}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                draft.category === c ? "border-sd-fg bg-sd-fill text-sd-fg" : "border-sd-line text-sd-fg-muted hover:bg-sd-gray-200"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${CATEGORY_DOT[c]}`} aria-hidden />
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
        {draft.category && <p className="text-[12px] leading-relaxed text-sd-fg-subtle">{CATEGORY_HINT[draft.category]}</p>}
        {draft.category === "event" && (
          <div className="flex flex-col gap-2 rounded-xl bg-sd-fill p-3">
            <div className="flex items-center gap-2 text-[13px]">
              <input type="time" value={draft.startsAt} onChange={(e) => set({ startsAt: e.target.value })} aria-label="행사 시작 시간" className={`${inputClass} flex-1 px-2`} />
              <span className="text-sd-fg-subtle">~</span>
              <input type="time" value={draft.endsAt} onChange={(e) => set({ endsAt: e.target.value })} aria-label="행사 끝 시간" className={`${inputClass} flex-1 px-2`} />
            </div>
            <div className="flex gap-2">
              <input
                value={draft.placeText}
                onChange={(e) => set({ placeText: e.target.value })}
                placeholder="지도에서 복사한 좌표"
                aria-label="행사 장소 좌표"
                className={`${inputClass} flex-1`}
              />
              <select value={draft.radius} onChange={(e) => set({ radius: Number(e.target.value) })} aria-label="장소 반경" className={`${inputClass} shrink-0 px-2`}>
                {RADII.map((r) => (
                  <option key={r} value={r}>
                    {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[12px] leading-relaxed text-sd-fg-subtle">
              지도에서 장소를 길게 누르거나 오른쪽 클릭하면 좌표를 복사할 수 있어요. 시작 30분 전부터 끝날 때까지 이 반경 안에서 시작한 게임을 행사 게임으로 봐요.
            </p>
          </div>
        )}
        <div className="flex gap-2">
          <Button size="sm" type="submit" disabled={busy || !draft.label.trim() || !draft.category} className="h-9 flex-1">
            {editing ? "고치기" : "넣기"}
          </Button>
          {editing && (
            <Button
              size="sm"
              type="button"
              variant="neutral"
              onClick={() => {
                setEditing(null);
                setDraft(EMPTY);
              }}
              className="h-9 shrink-0"
            >
              그만두기
            </Button>
          )}
        </div>
      </form>
      {error && <p className="text-[13px] text-sd-critical">{error}</p>}
      {onCompare && dayEvents.length > 0 && selected < today && (
        <button
          type="button"
          onClick={() => onCompare(selected)}
          className="flex items-center justify-between gap-2 rounded-xl bg-accent-weak px-3 py-2.5 text-left text-[13px] font-semibold text-sd-fg transition-colors hover:brightness-95"
        >
          <span>
            이날부터 7일을 그 전 7일과 비교
            <span className="mt-0.5 block text-[12px] font-normal text-sd-fg-muted">행사나 업데이트 뒤 숫자가 어떻게 바뀌었는지 봐요</span>
          </span>
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-sd-fg-subtle" />
        </button>
      )}
      {dayEvents.length === 0 ? (
        <p className="text-[13px] text-sd-fg-subtle">이날 적어 둔 일정이 없어요.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-sd-hairline">
          {dayEvents.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 py-2 text-[13px]">
              <span className="flex min-w-0 items-start gap-2">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${CATEGORY_DOT[e.category]}`} aria-hidden />
                <span className="min-w-0">
                  <span className="break-words text-sd-fg">{e.label}</span>
                  <span className="block text-[12px] text-sd-fg-subtle">
                    {CATEGORY_LABEL[e.category]}
                    {isRelease(e) ? ", 자동" : ""}
                    {e.category === "event" ? `, ${eventDetail(e)}` : ""}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 gap-1">
                {!isRelease(e) && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(e.id);
                      setDraft(draftOf(e));
                      setError(null);
                    }}
                    className="rounded-lg px-2 py-1 text-sd-fg-subtle transition-colors hover:bg-sd-gray-200 hover:text-sd-fg"
                  >
                    고치기
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void remove(e.id)}
                  className="rounded-lg px-2 py-1 text-sd-fg-subtle transition-colors hover:bg-sd-gray-200 hover:text-sd-critical"
                >
                  지우기
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  ) : (
    <div className="flex flex-col gap-2">
      <p className="text-[14px] font-bold text-sd-fg">{m}월 일정</p>
      <p className="text-[12px] text-sd-fg-subtle">날짜를 누르면 여기서 바로 넣을 수 있어요.</p>
      {monthManual.length === 0 && (!showUpdates || monthReleases.length === 0) ? (
        <p className="mt-1 text-[13px] text-sd-fg-subtle">이 달에 적어 둔 일정이 없어요.</p>
      ) : (
        <ul className="mt-1 flex flex-col gap-1 text-[13px]">
          {monthManual.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => open(e.day)} className="flex w-full min-w-0 items-start gap-2 rounded-lg px-1 py-1 text-left hover:bg-sd-gray-200">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${CATEGORY_DOT[e.category]}`} aria-hidden />
                <span className="w-10 shrink-0 tabular-nums text-sd-fg-muted">{dayLabel(e.day).replace(/^\d+월 /, "")}</span>
                <span className="min-w-0 break-words text-sd-fg">
                  {e.label}
                  <span className="ml-1.5 text-[12px] text-sd-fg-subtle">{CATEGORY_LABEL[e.category]}</span>
                </span>
              </button>
            </li>
          ))}
          {showUpdates && monthReleases.length > 0 && (
            <li>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-1 py-1 text-sd-fg-subtle hover:bg-sd-gray-200">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-sd-fg-subtle" aria-hidden />
                  앱 업데이트 {monthReleases.length}개
                  <ChevronRightIcon className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                </summary>
                <ul className="mt-1 flex flex-col gap-1 pl-4">
                  {monthReleases.map((e) => (
                    <li key={e.id} className="flex items-center gap-2 text-sd-fg-subtle">
                      <span className="w-10 shrink-0 tabular-nums">{dayLabel(e.day).replace(/^\d+월 /, "")}</span>
                      {shortRelease(e.label)}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          )}
        </ul>
      )}
    </div>
  );

  return (
    <SectionCard
      title="일정"
      right={
        <button
          type="button"
          aria-pressed={showUpdates}
          onClick={() => setShowUpdates((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-semibold transition-colors ${
            showUpdates ? "bg-sd-gray-200 text-sd-fg" : "text-sd-fg-subtle hover:text-sd-fg-muted"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${showUpdates ? "bg-sd-fg-subtle" : "bg-sd-gray-400"}`} />
          앱 업데이트 보기
        </button>
      }
    >
      {loadError ? (
        <p className="text-[13px] text-sd-fg-subtle">{loadError}</p>
      ) : (
        <div ref={rootRef} className="flex flex-col gap-4">
          <p className="text-[13px] leading-relaxed text-sd-fg-muted">
            날짜를 누르고 일정 이름과 성격을 넣으면 모든 차트에 성격별 색 마름모로 표시돼서, 숫자가 왜 바뀌었는지 같이 볼 수 있어요. 앱 업데이트 날짜는 자동으로 들어와요.
          </p>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  aria-label="이전 달"
                  onClick={() => setView((v) => addMonths(v, -1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sd-fg-muted transition-colors hover:bg-sd-gray-200"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <span className="text-[15px] font-bold text-sd-fg">
                  {y}년 {m}월
                </span>
                <button
                  type="button"
                  aria-label="다음 달"
                  disabled={view >= monthStart(max)}
                  onClick={() => setView((v) => addMonths(v, 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sd-fg-muted transition-colors hover:bg-sd-gray-200 disabled:opacity-30"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 border-b border-sd-hairline pb-1 text-center text-[11px] font-medium text-sd-fg-subtle" aria-hidden>
                {WEEK.map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>
              <div ref={gridRef} role="grid" aria-label={`${y}년 ${m}월 일정`} onKeyDown={onKey} className="grid grid-cols-7">
                {Array.from({ length: blanks }, (_, i) => (
                  <span key={`b${i}`} className="border-b border-sd-hairline" />
                ))}
                {days.map((d) => {
                  const list = visible(byDay.get(d) ?? []);
                  const manual = list.filter((e) => !isRelease(e));
                  const releases = list.filter((e) => isRelease(e));
                  const shownReleases = manual.length >= 2 ? 0 : Math.min(1, releases.length);
                  const more = list.length - Math.min(2, manual.length) - shownReleases;
                  const isSel = d === selected;
                  const isToday = d === today;
                  const future = d > today;
                  const summary = list.length ? `, 일정 ${list.length}개: ${list.map((e) => `${CATEGORY_LABEL[e.category]} ${e.label}`).join(", ")}` : "";
                  return (
                    <button
                      key={d}
                      type="button"
                      data-day={d}
                      tabIndex={d === focus ? 0 : -1}
                      disabled={d > max}
                      aria-pressed={isSel}
                      aria-label={`${dayLabel(d, true)}${isToday ? ", 오늘" : ""}${summary}`}
                      onClick={() => {
                        keyboard.current = false;
                        open(d);
                      }}
                      className={`flex h-14 min-w-0 flex-col items-stretch gap-0.5 border-b border-sd-hairline p-1 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:h-24 sm:p-1.5 ${
                        isSel ? "bg-accent-weak" : "hover:bg-sd-gray-200"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center self-start rounded-full text-[12px] tabular-nums ${
                          isToday ? "bg-sd-fg font-bold text-sd-surface" : future ? "text-sd-fg-subtle" : "text-sd-fg"
                        }`}
                      >
                        {Number(d.slice(8))}
                      </span>
                      {/* 넓은 화면: 사람이 넣은 일정은 성격 색 점이 붙은 칩, 업데이트는 회색 글씨. 칸이 넘치면 "+N" */}
                      <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                        {manual.slice(0, 2).map((e) => (
                          <span key={e.id} className="flex min-w-0 items-center gap-1 rounded bg-sd-fill px-1 py-px text-[11px] font-medium text-sd-fg">
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${CATEGORY_DOT[e.category]}`} />
                            <span className="truncate">{e.label}</span>
                          </span>
                        ))}
                        {releases.slice(0, shownReleases).map((e) => (
                          <span key={e.id} className="flex min-w-0 items-center gap-1 text-[10px] text-sd-fg-subtle">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sd-fg-subtle" />
                            <span className="truncate">{shortRelease(e.label)}</span>
                          </span>
                        ))}
                        {more > 0 && <span className="text-[10px] text-sd-fg-subtle">+{more}</span>}
                      </span>
                      {/* 폰: 점만. 성격마다 한 점, 업데이트는 회색 */}
                      <span className="flex gap-0.5 sm:hidden" aria-hidden>
                        {[...new Set(manual.map((e) => e.category))].map((c) => (
                          <span key={c} className={`h-1.5 w-1.5 rounded-full ${CATEGORY_DOT[c]}`} />
                        ))}
                        {releases.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-sd-fg-subtle" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 넓은 화면: 달력 오른쪽에 늘 붙은 날짜 칸 */}
            <aside className="hidden rounded-xl border border-sd-line p-4 lg:block" aria-live="polite">
              {panel}
            </aside>
            {/* 좁은 화면: 날짜를 고르지 않았을 때는 달력 아래에 이 달 목록 */}
            {!selected && <div className="lg:hidden">{panel}</div>}
          </div>

          {/* 좁은 화면: 날짜를 누르면 아래에서 올라오는 시트 */}
          {selected && (
            <div className="lg:hidden">
              <div className="fixed inset-0 z-40 bg-black/30" aria-hidden onClick={() => setSelected(null)} />
              {/* 키보드가 뜨면 시트를 키보드 바로 위로 올리고 보이는 영역 안으로 줄인다(useKeyboardInset, #155) */}
              <div
                role="dialog"
                aria-modal="true"
                aria-label={`${dayLabel(selected)} 일정`}
                style={kb.height ? { bottom: kb.inset, maxHeight: Math.round(kb.height * 0.85) } : undefined}
                className={`fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto rounded-t-2xl border border-sd-line bg-sd-surface p-5 shadow-xl ${
                  kb.inset > 0 ? "pb-5" : "pb-8"
                }`}
              >
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-sd-gray-400" aria-hidden />
                {panel}
              </div>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}
