"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { ErrorBlock, PageHeader, ScrollPage, SectionCard } from "@/components/admin/Parts";
import { Button } from "@/components/admin/Button";
import { Callout } from "@/components/admin/Callout";
import { ChangeDialog } from "@/components/admin/ChangeDialog";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
import { Pill } from "@/components/admin/StatusBadge";
import { useToast } from "@/components/admin/Toast";
import { CheckIcon } from "@/components/admin/icons";
import { PreviewPane } from "@/components/admin/ops/PreviewPane";
import { HttpsUrlInput } from "@/components/admin/appConfig/fields";
import { EventCalendar } from "@/components/admin/events/EventCalendar";
import { EventPreview, SCENE_LABEL, SCENE_OF, type PreviewScene } from "@/components/admin/events/EventPreview";
import { DateTimeInput, Field, TextInput, type Key } from "@/components/admin/events/fields";
import { EventConflict, fetchEvent, saveEvent, saveMinigame } from "@/lib/admin/eventsClient";
import { formatDateTime } from "@/lib/admin/format";
import type { EventDetail } from "@/lib/event/adminApi";
import {
  MAX,
  WHERE,
  boothState,
  dateLabelOf,
  diff,
  eventEnd,
  hourLabel,
  kstNow,
  popupWindow,
  readiness,
  shortTime,
  toMs,
  validate,
  type EventSettings,
  type HomeMinigame,
  type PopupMode,
  type StoryMode,
} from "@/lib/event/settings";

// 어드민 "행사" 하나 (#219, docs/admin-ui.md "행사").
// 탭은 셋. 개요(지금 상태, 달력, 준비 점검), 정보와 시간(부스 화면에 나가는 글과 운영 시간), 홈과 행사 페이지.
// 고친 값은 저장 전까지 이 화면에만 있고, 미리보기와 달력이 그 값으로 그려진다. 저장 전에 어디가 어떻게 바뀌는지 확인창을 연다.

type Tab = "overview" | "info" | "home";
const TABS: { value: Tab; label: string }[] = [
  { value: "overview", label: "개요" },
  { value: "info", label: "정보와 시간" },
  { value: "home", label: "홈과 행사 페이지" },
];

// 보고 있는 탭을 주소(?tab=)에 남긴다. 링크를 보내면 같은 탭이 열린다(지표 화면과 같은 방식)
const URL_EVENT = "admin-events-url";
const subscribe = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  window.addEventListener(URL_EVENT, cb);
  return () => {
    window.removeEventListener("popstate", cb);
    window.removeEventListener(URL_EVENT, cb);
  };
};
function useTab(): [Tab, (t: Tab) => void] {
  const search = useSyncExternalStore(subscribe, () => window.location.search, () => "");
  const raw = new URLSearchParams(search).get("tab");
  const tab: Tab = raw === "info" || raw === "home" ? raw : "overview";
  const set = (t: Tab) => {
    const url = new URL(window.location.href);
    if (t === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event(URL_EVENT));
  };
  return [tab, set];
}

/** 30초마다 다시 그려 "지금"을 따라간다(부스 열림, D-n) */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<EventSettings | null>(null);

  const load = useCallback(() => {
    fetchEvent(Number(id))
      .then((d) => {
        setError(null);
        setDetail(d);
        setDraft(d.settings);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);

  return (
    <ScrollPage>
      {error ? (
        <>
          <PageHeader title="행사" back={{ href: "/admin/events", label: "행사" }} />
          <ErrorBlock message={error} onRetry={load} />
        </>
      ) : !detail || !draft ? (
        <Skeleton />
      ) : (
        <Loaded
          detail={detail}
          draft={draft}
          setDraft={setDraft}
          onSaved={(d) => {
            setDetail(d);
            setDraft(d.settings);
          }}
          onReload={load}
        />
      )}
    </ScrollPage>
  );
}

function Skeleton() {
  return (
    <div aria-busy className="animate-pulse space-y-4">
      <div className="h-4 w-16 rounded bg-sd-gray-200" />
      <div className="h-7 w-56 rounded-lg bg-sd-gray-200" />
      <div className="h-9 w-80 rounded-xl bg-sd-gray-200" />
      <div className="h-28 rounded-2xl bg-sd-gray-200" />
      <div className="h-96 rounded-2xl bg-sd-gray-200" />
    </div>
  );
}

function Loaded({
  detail,
  draft,
  setDraft,
  onSaved,
  onReload,
}: {
  detail: EventDetail;
  draft: EventSettings;
  setDraft: (s: EventSettings) => void;
  onSaved: (d: EventDetail) => void;
  onReload: () => void;
}) {
  const [tab, setTabRaw] = useTab();
  const now = useNow();
  const toast = useToast();
  const { event, writable } = detail;
  const changes = useMemo(() => diff(detail.settings, draft), [detail.settings, draft]);
  const problems = useMemo(() => validate(draft), [draft]);
  const dirty = changes.length > 0;
  const [review, setReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | undefined>();
  const [conflict, setConflict] = useState(false);
  const [spot, setSpot] = useState<Key | null>(null);
  const [scene, setScene] = useState<PreviewScene>(tab === "home" ? "popup" : "booth-before");
  const [focusKey, setFocusKey] = useState<Key | null>(null);
  // 탭마다 처음 보일 장면. 홈 탭은 팝업부터
  const setTab = (t: Tab) => {
    setTabRaw(t);
    setSpot(null);
    setScene(t === "home" ? "popup" : "booth-before");
  };

  // 저장하지 않은 채 떠나면 묻는다
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  // 점검표의 "고치기"가 다른 탭의 칸을 가리키면, 탭을 바꾼 뒤 그 칸으로 내려가 초점을 둔다
  useEffect(() => {
    if (!focusKey) return;
    const el = document.getElementById(`field-${focusKey}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.querySelector<HTMLElement>("input, button")?.focus({ preventScroll: true });
    // 한 번 옮기고 나면 지운다. 다른 탭을 눌러도 다시 끌려가지 않게
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFocusKey(null);
  }, [focusKey, tab]);

  const onSpot = (k: Key) => {
    setSpot(k);
    const s = SCENE_OF[k];
    if (s) setScene(s);
  };
  const patch = (p: Partial<EventSettings>) => setDraft({ ...draft, ...p });
  const set = <K extends keyof EventSettings>(k: K, v: EventSettings[K]) => patch({ [k]: v } as Partial<EventSettings>);

  const save = async (next: EventSettings, message: string) => {
    setSaving(true);
    setSaveError(undefined);
    try {
      onSaved(await saveEvent(event.id, next, detail.version));
      setReview(false);
      toast(message);
    } catch (e) {
      if (e instanceof EventConflict) setConflict(true);
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const savedState = boothState(detail.settings, now);
  const boothChanged = changes.some((c) => c.key.startsWith("booth"));

  return (
    <>
      <PageHeader
        back={{ href: "/admin/events", label: "행사" }}
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            {detail.settings.name}
            <PhasePill event={event} settings={detail.settings} now={now} />
          </span>
        }
        description={`${dateLabelOf(event)} · 지표 일정 "${event.label}"`}
      />

      <div className="mb-5 space-y-3">
        {!writable && <Callout variant="warning">이 환경에서는 볼 수만 있어요. 저장소는 실제 부스, 홈과 같이 쓰여서 운영 어드민에서만 바꿔요.</Callout>}
        {detail.version === 0 && (
          <Callout variant="info" title="아직 저장한 적 없는 행사예요">
            지표 일정에서 이름과 날짜를 가져와 채워 두었어요. 저장해야 부스와 홈에 나가요.
          </Callout>
        )}
        {conflict && (
          <Callout variant="danger" title="다른 분이 먼저 저장했어요">
            <span className="flex flex-wrap items-center gap-2">
              새로 불러와 바뀐 값을 본 뒤 다시 고쳐 주세요. 지금 고친 값은 새로 불러오면 사라져요.
              <Button size="sm" variant="neutral" onClick={() => (setConflict(false), onReload())}>
                새로 불러오기
              </Button>
            </span>
          </Callout>
        )}
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div role="tablist" aria-label="행사 화면" className="inline-flex rounded-xl bg-sd-gray-200 p-1">
          {TABS.map((t) => {
            const on = t.value === tab;
            const n = changes.filter((c) => TAB_OF[c.key as Key] === t.value).length;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.value)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${on ? "bg-sd-surface text-sd-fg shadow-sm" : "text-sd-fg-subtle hover:text-sd-fg-muted"}`}
              >
                {t.label}
                {n > 0 && (
                  <span aria-label={`고친 것 ${n}개`} className="h-1.5 w-1.5 rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "overview" && (
        <Overview
          detail={detail}
          draft={draft}
          dirty={dirty}
          now={now}
          writable={writable}
          saving={saving}
          onBooth={(closed) => save({ ...detail.settings, boothClosed: closed }, closed ? "부스를 닫았어요. 손님이 끝나면 닫힘 화면으로 바뀌어요." : "부스를 다시 열었어요.")}
          onFix={(k) => {
            setTab(TAB_OF[k]);
            setFocusKey(k);
          }}
          onRestore={(s) => {
            setDraft(s);
            toast("그 저장본 값을 불러왔어요. 확인한 뒤 저장해 주세요.");
          }}
        />
      )}

      {tab !== "overview" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-5">
            {tab === "info" ? (
              <InfoTab draft={draft} set={set} problems={problems} spot={spot} onSpot={onSpot} disabled={!writable} event={detail.event} />
            ) : (
              <HomeTab draft={draft} set={set} patch={patch} problems={problems} spot={spot} onSpot={onSpot} disabled={!writable} detail={detail} now={now} />
            )}
          </div>
          <Preview draft={draft} scene={scene} onScene={setScene} spot={spot} />
        </div>
      )}

      {dirty && (
        <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-sd-line bg-sd-canvas/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
          <p className="mr-auto text-[13px] text-sd-fg-muted">
            고친 것 {changes.length}개
            {Object.keys(problems).length > 0 && <span className="ml-2 text-sd-critical">고칠 칸이 있어요</span>}
          </p>
          <Button variant="neutral" size="sm" onClick={() => setDraft(detail.settings)}>
            되돌리기
          </Button>
          <Button size="sm" disabled={!writable || Object.keys(problems).length > 0} onClick={() => setReview(true)}>
            변경 내용 확인
          </Button>
        </div>
      )}

      {review && (
        <ChangeDialog
          title="행사 설정 저장"
          items={changes}
          note={
            <>
              저장하면 부스는 바로, 사이트 홈은 1분 안에 바뀌어요.
              {boothChanged && savedState === "open" && " 부스는 지금 찍고 있는 손님이 끝나면 바뀌어요."}
            </>
          }
          confirmText="저장"
          pending={saving}
          error={saveError}
          onConfirm={() => save(draft, "저장했어요.")}
          onClose={() => {
            setReview(false);
            setSaveError(undefined);
          }}
        />
      )}
    </>
  );
}

const TAB_OF: Record<Key, Tab> = {
  name: "info",
  dateLabel: "info",
  location: "info",
  boothFrom: "info",
  boothUntil: "info",
  boothClosed: "overview",
  popup: "home",
  popupFrom: "home",
  popupUntil: "home",
  popupUrl: "home",
  story: "home",
};

/** 행사가 지금 어느 때인지 */
function phaseOf(event: EventDetail["event"], s: EventSettings, now: number) {
  const today = kstNow(now).slice(0, 10);
  const days = Math.round((Date.parse(`${event.day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  const state = boothState(s, now);
  return { days, state };
}

function PhasePill({ event, settings, now }: { event: EventDetail["event"]; settings: EventSettings; now: number }) {
  const { days, state } = phaseOf(event, settings, now);
  if (state === "open") return <Pill tone="green">부스 열림</Pill>;
  if (state === "closed") return <Pill tone="red">부스 닫아 둠</Pill>;
  if (state === "after") return <Pill tone="slate">끝</Pill>;
  return <Pill tone="blue">{days > 0 ? `D-${days}` : "오늘"}</Pill>;
}

// ── 개요 ──

function Overview({
  detail,
  draft,
  dirty,
  now,
  writable,
  saving,
  onBooth,
  onFix,
  onRestore,
}: {
  detail: EventDetail;
  draft: EventSettings;
  dirty: boolean;
  now: number;
  writable: boolean;
  saving: boolean;
  onBooth: (closed: boolean) => void;
  onFix: (k: Key) => void;
  onRestore: (s: EventSettings) => void;
}) {
  const { event } = detail;
  const saved = detail.settings;
  const checks = readiness(event, draft);
  const left = checks.filter((c) => c.level !== "ok").length;
  const { days, state } = phaseOf(event, saved, now);
  const [confirm, setConfirm] = useState<"close" | "open" | null>(null);
  const today = kstNow(now).slice(0, 10);

  // 지금 상태와 할 일 하나. 때마다 다르다
  const hero: { dot: string; title: string; sub: string; action?: ReactNode } =
    state === "open"
      ? { dot: "bg-sd-positive", title: "부스 열려 있어요", sub: `${shortTime(saved.boothUntil)}에 저절로 닫혀요.`, action: <Button variant="danger" disabled={!writable || dirty || saving} onClick={() => setConfirm("close")}>부스 지금 닫기</Button> }
      : state === "closed"
        ? { dot: "bg-sd-critical", title: "부스를 닫아 두었어요", sub: "운영 시간이 와도 열리지 않아요. 손님에게는 준비 중 화면이 보여요.", action: <Button disabled={!writable || dirty || saving} onClick={() => setConfirm("open")}>부스 다시 열기</Button> }
        : state === "after"
          ? { dot: "bg-sd-gray-400", title: "행사가 끝났어요", sub: "부스는 감사 인사를 보여요. 행사 게임 성적표는 지표 화면 아래에 있어요.", action: <Link href="/admin/metrics" className="inline-flex h-10 items-center rounded-xl bg-sd-gray-200 px-4 text-[14px] font-semibold text-sd-fg-muted hover:bg-sd-gray-300">성적표 보기</Link> }
          : {
              dot: left ? "bg-sd-warning" : "bg-sd-info",
              title: left ? `준비할 것 ${left}개가 남았어요` : days > 0 ? `${days}일 남았어요, 준비는 다 됐어요` : "오늘이에요, 준비는 다 됐어요",
              sub: `부스는 ${shortTime(saved.boothFrom)}에 저절로 열려요.`,
              action: left ? <Button onClick={() => document.getElementById("readiness")?.scrollIntoView({ behavior: "smooth" })}>남은 것 보기</Button> : undefined,
            };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-sd-line bg-sd-surface px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span aria-hidden className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${hero.dot}`} />
          <div className="min-w-0">
            <p className="text-[18px] font-bold text-sd-fg">{hero.title}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-sd-fg-subtle">
              {hero.sub}
              {dirty && (state === "open" || state === "closed") && " 고친 것을 먼저 저장하거나 되돌려야 누를 수 있어요."}
            </p>
          </div>
        </div>
        {hero.action}
      </div>

      <SectionCard title="언제 무엇이 보이나" right={dirty ? <span className="text-[12px] font-semibold text-accent">저장 전 값으로 보여요</span> : undefined}>
        <EventCalendar event={event} settings={draft} minigame={detail.minigame} today={today} />
      </SectionCard>

      <div id="readiness" className="scroll-mt-6">
        <SectionCard title="행사 준비" right={<span className="text-[12px] text-sd-fg-subtle">{left ? `${checks.length}개 중 ${checks.length - left}개 끝` : "다 끝"}</span>} flush>
          <ul>
            {checks.map((c) => (
              <li key={c.id} className={`flex items-start gap-3 border-b border-sd-hairline px-5 py-3.5 last:border-b-0 ${c.level === "warn" ? "bg-sd-warning-weak" : ""}`}>
                {c.level === "ok" ? (
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-sd-positive" />
                ) : (
                  <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${c.level === "warn" ? "bg-sd-warning" : "bg-sd-gray-400"}`} />
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-[14px] font-semibold ${c.level === "ok" ? "text-sd-fg-muted" : "text-sd-fg"}`}>{c.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-sd-fg-subtle">{c.detail}</p>
                </div>
                {c.level !== "ok" && (
                  <Button size="sm" variant="neutral" className="shrink-0" onClick={() => onFix(FIX_KEY[c.id] ?? (c.tab === "home" ? "popup" : "name"))}>
                    고치기
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <History detail={detail} onRestore={onRestore} />

      {confirm && (
        <ChangeDialog
          title={confirm === "close" ? "부스를 지금 닫을까요?" : "부스를 다시 열까요?"}
          danger={confirm === "close"}
          items={[
            {
              key: "boothClosed",
              label: `${WHERE.boothClosed.label} · 포토부스`,
              before: confirm === "close" ? "운영 시간대로" : "닫음",
              after: confirm === "close" ? "닫음" : "운영 시간대로",
            },
          ]}
          note={confirm === "close" ? "찍고 있던 손님이 끝나면 준비 중 화면으로 바뀌고, 새 촬영과 사진 올리기가 막혀요. 다시 열 때까지 운영 시간이 와도 열리지 않아요." : "운영 시간 안이면 바로 촬영 화면이 열려요."}
          confirmText={confirm === "close" ? "부스 닫기" : "다시 열기"}
          pending={saving}
          onConfirm={() => {
            onBooth(confirm === "close");
            setConfirm(null);
          }}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

const FIX_KEY: Record<string, Key> = {
  date: "dateLabel",
  location: "location",
  boothLate: "boothFrom",
  boothEarly: "boothUntil",
  closed: "boothClosed",
  popupLong: "popupUntil",
  popupUrl: "popupUrl",
};

function History({ detail, onRestore }: { detail: EventDetail; onRestore: (s: EventSettings) => void }) {
  if (detail.history.length === 0) return null;
  return (
    <SectionCard title="저장 기록" right={<span className="text-[12px] text-sd-fg-subtle">최근 {detail.history.length}번</span>} flush>
      <ul>
        {detail.history.map((h, i) => {
          const changed = i + 1 < detail.history.length ? diff(detail.history[i + 1].settings, h.settings) : [];
          return (
            <li key={h.version} className="flex items-start gap-3 border-b border-sd-hairline px-5 py-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-sd-fg">
                  <span className="font-semibold">{h.updatedBy}</span>
                  <span className="ml-2 text-sd-fg-subtle">{formatDateTime(h.updatedAt)}</span>
                  {i === 0 && <span className="ml-2 rounded bg-sd-gray-200 px-1.5 py-0.5 text-[11px] font-semibold text-sd-fg-muted">지금 나가는 값</span>}
                </p>
                <p className="mt-0.5 truncate text-[12px] text-sd-fg-subtle">{i + 1 === detail.history.length ? "처음 저장" : changed.length ? changed.map((c) => WHERE[c.key as Key].label).join(", ") : "바뀐 값 없음"}</p>
              </div>
              {i > 0 && (
                <Button size="sm" variant="neutral" className="shrink-0" onClick={() => onRestore(h.settings)}>
                  이 값으로 되돌리기
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

// ── 미리보기 ──

function Preview({ draft, scene, onScene, spot }: { draft: EventSettings; scene: PreviewScene; onScene: (s: PreviewScene) => void; spot: Key | null }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [big, setBig] = useState(false);
  useEffect(() => {
    if (!big) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setBig(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [big]);
  const scenes: PreviewScene[] = ["booth-before", "booth-after", "popup"];
  const shown = spot && SCENE_OF[spot] === scene ? spot : null;
  return (
    <PreviewPane>
      <div className="mb-2.5 flex flex-wrap items-center justify-center gap-2">
        <SegmentedControl options={scenes.map((s) => ({ value: s, label: SCENE_LABEL[s] }))} value={scene} onChange={onScene} />
      </div>
      <button type="button" onClick={() => setBig(true)} aria-label="미리보기 크게 보기" className="group relative block w-full cursor-zoom-in rounded-xl text-left">
        <EventPreview settings={draft} scene={scene} spot={shown} theme={theme} />
        <span className="absolute right-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          크게 보기
        </span>
      </button>
      {big && (
        <div role="dialog" aria-modal="true" aria-label={`${SCENE_LABEL[scene]} 크게 보기`} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-6" onClick={() => setBig(false)}>
          <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <EventPreview settings={draft} scene={scene} spot={shown} theme={theme} />
            <div className="mt-3 flex items-center justify-between text-[13px] text-white/80">
              <span>{SCENE_LABEL[scene]} · 실제 크기 1280 x 800을 줄여 보여요</span>
              <button type="button" onClick={() => setBig(false)} className="rounded-lg bg-white/15 px-3 py-1.5 font-semibold text-white hover:bg-white/25">
                닫기 (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="min-w-0 text-[12px] leading-relaxed text-sd-fg-subtle" aria-live="polite">
          {shown ? (
            <>
              <span className="font-semibold text-accent">파란 테두리</span>가 {WHERE[shown].label} 자리예요
            </>
          ) : (
            "칸을 누르면 바뀌는 자리를 짚어 줘요"
          )}
        </p>
        <SegmentedControl
          options={[
            { value: "light", label: "밝게" },
            { value: "dark", label: "어둡게" },
          ]}
          value={theme}
          onChange={setTheme}
        />
      </div>
    </PreviewPane>
  );
}

// ── 정보와 시간 ──

type TabProps = {
  draft: EventSettings;
  set: <K extends keyof EventSettings>(k: K, v: EventSettings[K]) => void;
  problems: ReturnType<typeof validate>;
  spot: Key | null;
  onSpot: (k: Key) => void;
  disabled: boolean;
};

function InfoTab({ draft, set, problems, spot, onSpot, disabled, event }: TabProps & { event: EventDetail["event"] }) {
  const auto = dateLabelOf(event);
  return (
    <>
      <SectionCard title="보이는 정보">
        <div className="space-y-5">
          <Field k="name" spot={spot} onSpot={onSpot} error={problems.name} hint="부스와 홈 팝업에 “OO에서 만나요”로 들어가요. 행사 공식 이름 그대로 짧게.">
            <TextInput k="name" value={draft.name} max={MAX.name} onChange={(v) => set("name", v)} disabled={disabled} invalid={Boolean(problems.name)} />
          </Field>
          <Field
            k="dateLabel"
            spot={spot}
            onSpot={onSpot}
            error={problems.dateLabel}
            hint={
              draft.dateLabel === auto ? (
                "지표 일정의 날짜와 시간으로 만들었어요. 비우면 그 줄을 빼요."
              ) : (
                <span className="inline-flex flex-wrap items-center gap-x-2">
                  일정으로 만들면 “{auto}”이에요.
                  <button type="button" disabled={disabled} onClick={() => set("dateLabel", auto)} className="font-semibold text-accent hover:underline disabled:opacity-40">
                    일정에서 다시 만들기
                  </button>
                </span>
              )
            }
          >
            <TextInput k="dateLabel" value={draft.dateLabel} max={MAX.dateLabel} onChange={(v) => set("dateLabel", v)} disabled={disabled} invalid={Boolean(problems.dateLabel)} />
          </Field>
          <Field k="location" spot={spot} onSpot={onSpot} error={problems.location} hint="건물과 층까지. 비우면 그 줄을 빼요.">
            <TextInput k="location" value={draft.location} max={MAX.location} onChange={(v) => set("location", v)} placeholder="예: 판교 투썸월드 B1" disabled={disabled} invalid={Boolean(problems.location)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="부스 운영 시간">
        <div className="space-y-5">
          <Field k="boothFrom" spot={spot} onSpot={onSpot} error={problems.boothFrom} hint="이 시각 전에는 준비 중 화면이에요. 설치하고 시험 인쇄할 시간을 두어요(기본 행사 3시간 전).">
            <DateTimeInput value={draft.boothFrom} onChange={(v) => set("boothFrom", v)} around={event.day} label="부스 여는 시각" disabled={disabled} />
          </Field>
          <Field k="boothUntil" spot={spot} onSpot={onSpot} error={problems.boothUntil} hint="이 시각 뒤에는 감사 인사 화면이에요. 사진 올리기도 막혀요.">
            <DateTimeInput value={draft.boothUntil} onChange={(v) => set("boothUntil", v)} around={event.day} label="부스 닫는 시각" disabled={disabled} />
          </Field>
          <p className="rounded-xl bg-sd-fill px-4 py-3 text-[13px] leading-relaxed text-sd-fg-muted">
            {event.startsAt ? `행사는 ${hourLabel(event.startsAt)}${event.endsAt ? `부터 ${hourLabel(event.endsAt)}까지` : "에 시작"}예요. ` : ""}
            부스는 {shortTime(draft.boothFrom)}에 열리고 {shortTime(draft.boothUntil)}에 닫혀요. 로컬 개발 서버에서는 시간과 상관없이 열려요.
          </p>
        </div>
      </SectionCard>
    </>
  );
}

// ── 홈과 행사 페이지 ──

function HomeTab({ draft, set, patch, problems, spot, onSpot, disabled, detail, now }: TabProps & { patch: (p: Partial<EventSettings>) => void; detail: EventDetail; now: number }) {
  const { event } = detail;
  const w = popupWindow(event, draft);
  const nowKst = kstNow(now);
  return (
    <>
      <SectionCard title="홈 팝업">
        <div className="space-y-5">
          <Field
            k="popup"
            label="언제까지 띄울까요"
            spot={spot}
            onSpot={onSpot}
            error={problems.popupUntil ?? problems.popupFrom}
            hint={
              w
                ? `${w.from ? `${shortTime(w.from)}부터` : "저장한 때부터"} ${shortTime(w.until)}까지 사이트 홈에 떠요. 한 사람에게 들어올 때마다 한 번, “다시 보지 않기”를 누르면 이 행사 동안 다시 안 떠요.`
                : "띄우지 않아요."
            }
          >
            <SegmentedControl<PopupMode>
              value={draft.popup}
              onChange={(v) =>
                // 직접 고르기로 처음 바꾸면 오늘부터 행사 끝까지로 채워 둔다(빈 칸에서 시작하지 않게)
                v === "custom" && !draft.popupUntil
                  ? patch({ popup: v, popupFrom: `${nowKst.slice(0, 10)}T00:00`, popupUntil: eventEnd(event, draft) })
                  : set("popup", v)
              }
              options={[
                { value: "off", label: "안 띄우기" },
                { value: "untilEnd", label: "행사 끝날 때까지" },
                { value: "custom", label: "직접 고르기" },
              ]}
            />
          </Field>
          {draft.popup === "custom" && (
            <div className="grid gap-4 rounded-xl bg-sd-fill p-4 sm:grid-cols-2">
              <Field k="popupFrom" label="띄우는 때" spot={spot} onSpot={onSpot} right={<span />}>
                <DateTimeInput value={draft.popupFrom ?? `${nowKst.slice(0, 10)}T00:00`} onChange={(v) => set("popupFrom", v)} around={event.day} label="팝업 띄우는 시각" disabled={disabled} />
              </Field>
              <Field k="popupUntil" label="내리는 때" spot={spot} onSpot={onSpot} right={<span />}>
                <DateTimeInput value={draft.popupUntil ?? eventEnd(event, draft)} onChange={(v) => set("popupUntil", v)} around={event.day} label="팝업 내리는 시각" disabled={disabled} />
              </Field>
            </div>
          )}
          <Field k="popupUrl" spot={spot} onSpot={onSpot} error={problems.popupUrl} hint="행사 공식 페이지. 비우면 팝업에 닫기 버튼만 있어요.">
            <HttpsUrlInput id="input-popupUrl" value={draft.popupUrl} onChange={(v) => set("popupUrl", v)} disabled={disabled} invalid={Boolean(problems.popupUrl)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="행사 이야기 페이지 (/event)">
        <Field
          k="story"
          label="공개"
          spot={spot}
          onSpot={onSpot}
          hint="“황금 치즈 도난 사건” 이야기 페이지예요. 행사마다 새로 쓰는 글이라 내용은 코드에 있고, 여기서는 이 행사 때 열지만 정해요. 열면 부스 운영 시간에 본문, 그 전엔 곧 공개, 끝나면 사건 종결이 보여요."
        >
          <SegmentedControl<StoryMode>
            value={draft.story}
            onChange={(v) => set("story", v)}
            options={[
              { value: "off", label: "안 씀" },
              { value: "booth", label: "부스 시간에 공개" },
            ]}
          />
        </Field>
      </SectionCard>

      <MinigameCard detail={detail} disabled={disabled} />
    </>
  );
}

/** 홈 미니게임 칸 기간. 행사가 아니라 사이트에 하나라 따로 저장한다 */
function MinigameCard({ detail, disabled }: { detail: EventDetail; disabled: boolean }) {
  const toast = useToast();
  const { event } = detail;
  const suggested: NonNullable<HomeMinigame> = { from: `${dayBefore(event.day, 7)}T00:00`, until: eventEnd(event, detail.settings) };
  const [saved, setSaved] = useState<HomeMinigame>(detail.minigame);
  const [value, setValue] = useState<HomeMinigame>(detail.minigame);
  const [review, setReview] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const dirty = JSON.stringify(saved) !== JSON.stringify(value);
  const invalid = value !== null && toMs(value.until) <= toMs(value.from);
  const label = (m: HomeMinigame) => (m ? `${shortTime(m.from)} ~ ${shortTime(m.until)}` : "숨김");

  return (
    <SectionCard title="홈 미니게임 칸" right={<span className="text-[12px] text-sd-fg-subtle">모든 행사가 같이 써요</span>}>
      <div className="space-y-4">
        <p className="text-[13px] leading-relaxed text-sd-fg-subtle">
          홈의 “치즈 도둑 검거 작전” 소개 칸이에요. 평소엔 숨기고 정한 기간에만 보여요. /play 주소는 늘 열려 있어서 부스나 QR 로는 들어올 수 있어요.
        </p>
        <div className={disabled ? "pointer-events-none opacity-50" : ""}>
          <SegmentedControl<"off" | "range">
            value={value ? "range" : "off"}
            onChange={(v) => setValue(v === "off" ? null : (saved ?? suggested))}
            options={[
              { value: "off", label: "숨기기" },
              { value: "range", label: "기간 정하기" },
            ]}
          />
        </div>
        {value && (
          <div className="space-y-3 rounded-xl bg-sd-fill p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[13px] font-semibold text-sd-fg-subtle">보이기 시작</p>
                <DateTimeInput value={value.from} onChange={(from) => setValue({ ...value, from })} around={event.day} label="미니게임 보이기 시작" disabled={disabled} />
              </div>
              <div>
                <p className="mb-1.5 text-[13px] font-semibold text-sd-fg-subtle">숨기기</p>
                <DateTimeInput value={value.until} onChange={(until) => setValue({ ...value, until })} around={event.day} label="미니게임 숨기는 시각" disabled={disabled} />
              </div>
            </div>
            {invalid && <p className="text-[13px] text-sd-critical">숨기는 때가 보이기 시작보다 뒤여야 해요.</p>}
            <button type="button" disabled={disabled} onClick={() => setValue(suggested)} className="text-[13px] font-semibold text-accent hover:underline disabled:opacity-40">
              이 행사 때로 채우기 ({label(suggested)})
            </button>
          </div>
        )}
        {dirty && (
          <div className="flex justify-end gap-2 border-t border-sd-hairline pt-4">
            <Button size="sm" variant="neutral" onClick={() => setValue(saved)}>
              되돌리기
            </Button>
            <Button size="sm" disabled={disabled || invalid} onClick={() => setReview(true)}>
              변경 내용 확인
            </Button>
          </div>
        )}
      </div>
      {review && (
        <ChangeDialog
          title="홈 미니게임 칸 기간"
          items={[{ key: "minigame", label: "홈 미니게임 칸 · 사이트 홈(한국어, 영어, 일본어)", before: label(saved), after: label(value) }]}
          note="저장하면 1분 안에 사이트 홈에 반영돼요."
          confirmText="저장"
          pending={pending}
          error={error}
          onConfirm={async () => {
            setPending(true);
            setError(undefined);
            try {
              const r = await saveMinigame(value);
              setSaved(r.value);
              setValue(r.value);
              setReview(false);
              toast("홈 미니게임 기간을 저장했어요.");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setPending(false);
            }
          }}
          onClose={() => setReview(false)}
        />
      )}
    </SectionCard>
  );
}

const dayBefore = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);
