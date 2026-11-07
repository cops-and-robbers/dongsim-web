// 로컬에서 행사 화면을 만져 보는 가짜 저장소(#219). dev 에서는 MSW 가 이 값으로 답해 실제 부스와 홈에 닿지 않는다.
import type { EventDetail, EventsList } from "@/lib/event/adminApi";
import { defaultSettings, normalize, validate, type EventDay, type EventSettings, type HomeMinigame } from "@/lib/event/settings";

// 한 행사는 지난 행사 날짜 문구가 남아 있어 개요의 준비 점검이 무엇을 잡는지 바로 보인다
const DAYS: EventDay[] = [
  { id: 9, day: "2026-12-06", label: "대학 축제 부스", startsAt: null, endsAt: null },
  { id: 7, day: "2026-11-22", label: "서울 게임 타운", startsAt: "12:00", endsAt: "17:00" },
  { id: 3, day: "2026-07-04", label: "서울 게임 타운", startsAt: "12:00", endsAt: "17:00" },
];

type Row = { settings: EventSettings; version: number; history: EventDetail["history"] };
const stored = new Map<number, Row>();
const at = (iso: string) => new Date(iso).toISOString();
{
  const s7: EventSettings = { ...defaultSettings(DAYS[1]), dateLabel: "7월 4일 (토) 낮 12시-오후 5시", location: "판교 투썸월드 B1", popupUrl: "https://seoulgametown.com/", story: "booth" };
  stored.set(7, {
    settings: s7,
    version: 2,
    history: [
      { version: 2, settings: s7, updatedBy: "테스트 관리자", updatedAt: at("2026-11-07T09:12:00Z") },
      { version: 1, settings: { ...s7, story: "off", location: "" }, updatedBy: "테스트 관리자", updatedAt: at("2026-11-02T11:00:00Z") },
    ],
  });
  const s3: EventSettings = { ...defaultSettings(DAYS[2]), dateLabel: "7월 4일 (토) 낮 12시-오후 5시", location: "판교 투썸월드 B1", story: "booth" };
  stored.set(3, { settings: s3, version: 1, history: [{ version: 1, settings: s3, updatedBy: "테스트 관리자", updatedAt: at("2026-06-28T02:00:00Z") }] });
}
let minigame: HomeMinigame = { from: "2026-11-15T00:00", until: "2026-11-22T17:00" };

export function mockEvents(): EventsList {
  return {
    items: DAYS.map((event) => ({ event, settings: stored.get(event.id)?.settings ?? defaultSettings(event), configured: stored.has(event.id) })),
    minigame,
    writable: true,
  };
}

export function mockEvent(id: number): { status: number; body: unknown } {
  const event = DAYS.find((e) => e.id === id);
  if (!event) return { status: 404, body: { error: "행사를 찾지 못했어요." } };
  const row = stored.get(id);
  const body: EventDetail = {
    event,
    settings: row?.settings ?? defaultSettings(event),
    version: row?.version ?? 0,
    updatedBy: row ? "테스트 관리자" : null,
    updatedAt: row ? row.history[0].updatedAt : null,
    history: row?.history ?? [],
    minigame,
    writable: true,
  };
  return { status: 200, body };
}

export function mockSaveEvent(id: number, raw: { settings?: unknown; version?: number }): { status: number; body: unknown } {
  const event = DAYS.find((e) => e.id === id);
  if (!event) return { status: 404, body: { error: "행사를 찾지 못했어요." } };
  const row = stored.get(id);
  if ((row?.version ?? 0) !== raw.version) return { status: 409, body: { error: "다른 분이 먼저 저장했어요. 새로 불러온 값을 보고 다시 고쳐 주세요." } };
  const settings = normalize(raw.settings, row?.settings ?? defaultSettings(event));
  const first = Object.values(validate(settings))[0];
  if (first) return { status: 400, body: { error: first } };
  const version = (row?.version ?? 0) + 1;
  stored.set(id, { settings, version, history: [{ version, settings, updatedBy: "테스트 관리자", updatedAt: new Date().toISOString() }, ...(row?.history ?? [])] });
  return mockEvent(id);
}

export function mockSaveMinigame(value: HomeMinigame) {
  minigame = value;
  return { value };
}
