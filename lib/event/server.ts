/**
 * 행사 설정을 저장소에서 읽고 쓴다 (#219). 서버 전용이다.
 *
 * 포토부스, 홈 팝업, /event, 홈 미니게임 칸이 요청마다 "지금 행사"를 고른다. 같은 값을 30초 동안 나눠 쓰고,
 * 어드민이 저장하면 바로 버린다(EVENT_TAG). 저장소를 못 읽으면 마지막으로 코드에 있던 행사 값으로 돈다.
 */
import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "@/lib/metrics/db";
import { EVENT_COLUMNS, toEvent } from "@/lib/metrics/events";
import type { EventPopup } from "@/components/home/EventModal";
import {
  LEGACY_EVENT,
  LEGACY_SETTINGS,
  defaultSettings,
  normalize,
  pickBoothEvent,
  pickPopupEvent,
  pickStoryEvent,
  type Configured,
  type EventDay,
  type EventSettings,
  type HomeMinigame,
  type KstTime,
  type StoryState,
  minigameOn,
  popupWindow,
  storyState,
  toMs,
} from "@/lib/event/settings";

export const EVENT_TAG = "event-settings";
const LEGACY: Configured = { event: LEGACY_EVENT, settings: LEGACY_SETTINGS };

const isKstTime = (v: unknown): v is KstTime => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v);

/** 설정을 저장한 행사 전부(일정이 지워지면 설정도 같이 지워진다) */
async function readConfigured(): Promise<Configured[]> {
  const res = await db().from("event_settings").select(`settings, metrics_events!inner(${EVENT_COLUMNS})`);
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []).map((row) => {
    const raw = row as unknown as { settings: unknown; metrics_events: Record<string, unknown> };
    const e = toEvent(raw.metrics_events);
    const event: EventDay = { id: e.id, day: e.day, label: e.label, startsAt: e.startsAt, endsAt: e.endsAt };
    return { event, settings: normalize(raw.settings, defaultSettings(event)) };
  });
}

async function readMinigame(): Promise<HomeMinigame> {
  const res = await db().from("site_settings").select("value").eq("key", "home_minigame").maybeSingle();
  if (res.error) throw new Error(res.error.message);
  const v = (res.data?.value ?? null) as { from?: unknown; until?: unknown } | null;
  return v && isKstTime(v.from) && isKstTime(v.until) ? { from: v.from, until: v.until } : null;
}

const cachedConfigured = unstable_cache(readConfigured, ["event-settings-all"], { tags: [EVENT_TAG], revalidate: 30 });
const cachedMinigame = unstable_cache(readMinigame, ["event-home-minigame"], { tags: [EVENT_TAG], revalidate: 30 });

/** 저장소가 멈춰도 화면은 서야 한다. 못 읽으면 null */
async function configuredOrNull(): Promise<Configured[] | null> {
  try {
    return await cachedConfigured();
  } catch (e) {
    console.error("[event] 설정을 읽지 못했어요", e);
    return null;
  }
}

/** 포토부스가 따를 행사. 설정한 행사가 없거나 못 읽으면 마지막으로 코드에 있던 행사 */
export async function boothEvent(nowMs = Date.now()): Promise<Configured> {
  const list = await configuredOrNull();
  return (list && pickBoothEvent(list, nowMs)) ?? LEGACY;
}

/** 지금 홈에 띄울 행사 팝업. 없으면 null */
export async function popupEvent(nowMs = Date.now()): Promise<Configured | null> {
  const list = await configuredOrNull();
  return list ? pickPopupEvent(list, nowMs) : null;
}

/** 행사 이야기 페이지(/event)가 따를 행사. 이야기 페이지를 쓰는 행사가 없으면 지난 행사(황금 치즈 사건) */
export async function storyEvent(nowMs = Date.now()): Promise<Configured> {
  const list = await configuredOrNull();
  return (list && pickStoryEvent(list, nowMs)) ?? LEGACY;
}

/** 홈 미니게임 칸 기간. 못 읽으면 숨김 */
export async function homeMinigame(): Promise<HomeMinigame> {
  try {
    return await cachedMinigame();
  } catch (e) {
    console.error("[event] 미니게임 기간을 읽지 못했어요", e);
    return null;
  }
}

// ── 화면이 바로 쓰는 값. 지금 시각은 여기서 읽는다(컴포넌트가 그리는 중에 시각을 읽지 않게) ──

/** 홈에 띄울 팝업 카드 값. 없으면 null */
export async function homePopup(): Promise<EventPopup | null> {
  const c = await popupEvent(Date.now());
  const w = c && popupWindow(c.event, c.settings);
  if (!c || !w) return null;
  const { name, dateLabel, location, popupUrl } = c.settings;
  return { eventId: c.event.id, name, dateLabel, location, url: popupUrl, until: toMs(w.until) };
}

/** 지금 홈에 미니게임 칸을 보이는지 */
export async function showHomeMinigame(): Promise<boolean> {
  return minigameOn(await homeMinigame(), Date.now());
}

/** /event 가 지금 보일 화면. 로컬 개발에선 늘 본문(로컬 테스트가 막히지 않게) */
export async function storyNow(): Promise<{ settings: EventSettings; state: StoryState }> {
  const { settings } = await storyEvent();
  return { settings, state: process.env.NODE_ENV !== "production" ? "open" : storyState(settings, Date.now()) };
}

// ── 어드민 ──

export type Stored = { settings: EventSettings; version: number; updatedBy: string | null; updatedAt: string | null };
export type HistoryRow = { version: number; settings: EventSettings; updatedBy: string; updatedAt: string };

export class ConflictError extends Error {}

/** 어드민이 여는 행사 하나. 저장한 적이 없으면 일정에서 만든 기본값(version 0) */
export async function readStored(event: EventDay): Promise<Stored> {
  const res = await db().from("event_settings").select("settings, version, updated_by, updated_at").eq("event_id", event.id).maybeSingle();
  if (res.error) throw new Error(res.error.message);
  const base = defaultSettings(event);
  if (!res.data) return { settings: base, version: 0, updatedBy: null, updatedAt: null };
  return { settings: normalize(res.data.settings, base), version: res.data.version, updatedBy: res.data.updated_by, updatedAt: res.data.updated_at };
}

export async function readHistory(eventId: number, event: EventDay): Promise<HistoryRow[]> {
  const res = await db()
    .from("event_settings_history")
    .select("version, settings, updated_by, updated_at")
    .eq("event_id", eventId)
    .order("version", { ascending: false })
    .limit(20);
  if (res.error) throw new Error(res.error.message);
  const base = defaultSettings(event);
  return (res.data ?? []).map((r) => ({ version: r.version, settings: normalize(r.settings, base), updatedBy: r.updated_by, updatedAt: r.updated_at }));
}

/**
 * 저장. 연 뒤에 남이 먼저 저장했으면(version 이 달라졌으면) 덮지 않고 ConflictError.
 * 저장하면 화면들이 들고 있던 값을 바로 버린다
 */
export async function writeStored(eventId: number, settings: EventSettings, version: number, by: string): Promise<number> {
  const next = version + 1;
  const now = new Date().toISOString();
  if (version === 0) {
    const res = await db().from("event_settings").insert({ event_id: eventId, settings, version: next, updated_by: by, updated_at: now });
    if (res.error) {
      if (res.error.code === "23505") throw new ConflictError("먼저 저장한 사람이 있어요.");
      throw new Error(res.error.message);
    }
  } else {
    const res = await db()
      .from("event_settings")
      .update({ settings, version: next, updated_by: by, updated_at: now })
      .eq("event_id", eventId)
      .eq("version", version)
      .select("event_id");
    if (res.error) throw new Error(res.error.message);
    if (!res.data?.length) throw new ConflictError("먼저 저장한 사람이 있어요.");
  }
  const h = await db().from("event_settings_history").insert({ event_id: eventId, version: next, settings, updated_by: by, updated_at: now });
  if (h.error) console.error("[event] 저장본 기록 실패", h.error.message);
  revalidateTag(EVENT_TAG, { expire: 0 });
  return next;
}

export async function writeMinigame(value: HomeMinigame, by: string): Promise<void> {
  const res = await db()
    .from("site_settings")
    .upsert({ key: "home_minigame", value, updated_by: by, updated_at: new Date().toISOString() });
  if (res.error) throw new Error(res.error.message);
  revalidateTag(EVENT_TAG, { expire: 0 });
}

/** 어드민 목록과 개요가 쓰는 행사 일정(성격 = 행사) */
export async function readEventDays(): Promise<EventDay[]> {
  const res = await db().from("metrics_events").select(EVENT_COLUMNS).eq("category", "event").order("day", { ascending: false });
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []).map((row) => {
    const e = toEvent(row as Record<string, unknown>);
    return { id: e.id, day: e.day, label: e.label, startsAt: e.startsAt, endsAt: e.endsAt };
  });
}

/** 저장한 행사의 설정(목록에서 준비 상태를 보여 줄 때). 모양은 읽는 쪽이 normalize 로 맞춘다 */
export async function readSettingsIndex(): Promise<Map<number, unknown>> {
  const res = await db().from("event_settings").select("event_id, settings");
  if (res.error) throw new Error(res.error.message);
  return new Map((res.data ?? []).map((r) => [r.event_id as number, r.settings as unknown]));
}

export async function readMinigameStored(): Promise<HomeMinigame> {
  return readMinigame();
}
