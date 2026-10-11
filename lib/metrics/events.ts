/**
 * 지표 일정(metrics_events)의 성격과 행사 게임 찾기 (#165).
 *
 * 일정은 "그날 무슨 일이 있었나"를 적는다. 성격마다 지표에서 하는 일이 다르다.
 * - 행사(event): 시간과 장소에 맞는 게임을 행사 게임으로 보고 성적표를 만든다. "평소"를 셀 때는 행사 날을 뺀다
 * - 홍보(promo), 출시(release), 기타(etc): 차트에 표시만 한다. 출시는 수집기가 자동으로 넣는다
 * - 테스트(test): 표시만 한다. 테스트 게임을 숫자에서 빼는 건 운영진 계정(staff.ts)이 한다.
 *   날짜로 빼면 같은 날의 실제 게임까지 버린다(10/2 는 실제 3판에 운영진 4판이 섞였다)
 */

export const CATEGORIES = ["event", "promo", "release", "test", "etc"] as const;
export type Category = (typeof CATEGORIES)[number];
export const CATEGORY_LABEL: Record<Category, string> = { event: "행사", promo: "홍보", release: "출시", test: "테스트", etc: "기타" };
export const isCategory = (v: unknown): v is Category => typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);

export type Place = { lat: number; lng: number; radiusM: number };
export type MetricsEvent = {
  id: number;
  day: string;
  label: string;
  category: Category;
  /** 행사 시간(한국 시각 HH:MM). 행사가 아니거나 모르면 null */
  startsAt: string | null;
  endsAt: string | null;
  place: Place | null;
};

export const DEFAULT_RADIUS_M = 500;
export const EVENT_COLUMNS = "id, day, label, category, starts_at, ends_at, lat, lng, radius_m";
/** 0007 마이그레이션 전 칸. 새 칸을 못 읽으면 이것만 읽고 성격은 이름으로 짐작한다 */
export const BASE_COLUMNS = "id, day, label";

/** 이름으로 성격 짐작. 0007 마이그레이션이 지금 있는 일정을 옮길 때와 같은 규칙이다(순서도 같다) */
export function guessCategory(label: string): Category {
  if (/^(iOS|Android) .+ 출시$/.test(label)) return "release";
  if (/(QA|테스트|시험)/.test(label)) return "test";
  if (/(부스|축제| vs )/.test(label)) return "event";
  if (/(홍보|포스터|광고)/.test(label)) return "promo";
  return "etc";
}

const hhmm = (v: unknown): string | null => (typeof v === "string" && /^\d{2}:\d{2}/.test(v) ? v.slice(0, 5) : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);

/** DB 한 줄을 일정으로. 새 칸이 없는 줄(마이그레이션 전)도 받는다 */
export function toEvent(row: Record<string, unknown>): MetricsEvent {
  const label = String(row.label ?? "");
  const lat = num(row.lat);
  const lng = num(row.lng);
  return {
    id: Number(row.id),
    day: String(row.day),
    label,
    category: isCategory(row.category) ? row.category : guessCategory(label),
    startsAt: hhmm(row.starts_at),
    endsAt: hhmm(row.ends_at),
    place: lat !== null && lng !== null ? { lat, lng, radiusM: num(row.radius_m) ?? DEFAULT_RADIUS_M } : null,
  };
}

/**
 * 지도에서 복사한 좌표를 읽는다. "37.5498, 127.0799", 구글 지도 주소의 "@37.5498,127.0799,17z",
 * 네이버, 카카오 주소의 lat=..&lng=.. 를 받는다
 */
export function parsePlace(text: string): { lat: number; lng: number } | null {
  const t = text.trim();
  const pair = (a: string, b: string) => {
    const lat = Number(a);
    const lng = Number(b);
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
  };
  const at = t.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) return pair(at[1], at[2]);
  const q = t.match(/[?&]lat=(-?\d+(?:\.\d+)?)/);
  const q2 = t.match(/[?&](?:lng|lon)=(-?\d+(?:\.\d+)?)/);
  if (q && q2) return pair(q[1], q2[1]);
  const plain = t.match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
  return plain ? pair(plain[1], plain[2]) : null;
}

/** 두 지점 사이 거리(미터) */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toR = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(toR(b.lat - a.lat) / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(toR(b.lng - a.lng) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/** 시각(ISO)의 한국 날짜와 하루 중 분 */
export function seoulClock(iso: string): { day: string; minute: number } {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return { day: `${v("year")}-${v("month")}-${v("day")}`, minute: Number(v("hour")) * 60 + Number(v("minute")) };
}

const minutes = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
/** 행사 시작 전에 미리 연 방도 행사 게임이다. 부스를 열기 전에 방을 만들어 두는 일이 많다 */
export const EARLY_MINUTES = 30;

/**
 * 게임이 이 행사의 게임인가. 같은 날, 행사 시간(시작 30분 전부터 끝까지) 안에 시작했고,
 * 게임 구역 가운데가 행사 장소 반경 안이다. 시간이나 장소를 모르는 행사는 그 조건을 보지 않고,
 * 둘 다 모르면 찾지 않는다(그날 모든 게임이 행사 게임이 되어 버린다)
 */
export function isEventGame(e: MetricsEvent, g: { startedAt: string; center: { lat: number; lng: number } | null }): boolean {
  if (e.category !== "event" || (!e.place && !(e.startsAt && e.endsAt))) return false;
  const at = seoulClock(g.startedAt);
  if (at.day !== e.day) return false;
  if (e.startsAt && e.endsAt && (at.minute < minutes(e.startsAt) - EARLY_MINUTES || at.minute > minutes(e.endsAt))) return false;
  if (e.place && (!g.center || distanceM(e.place, g.center) > e.place.radiusM)) return false;
  return true;
}
