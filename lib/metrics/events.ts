/**
 * 지표 일정(metrics_events)의 성격과 행사 게임 (#165).
 *
 * 일정은 "그날 무슨 일이 있었나"를 적는다. 성격마다 지표에서 하는 일이 다르다.
 * - 행사(event): 그날 게임 중 우리 행사 게임을 골라 성적표를 만든다. "평소"를 셀 때는 행사 날을 뺀다
 * - 홍보(promo), 출시(release), 기타(etc): 차트에 표시만 한다. 출시는 수집기가 자동으로 넣는다
 * - 테스트(test): 표시만 한다. 테스트 게임을 숫자에서 빼는 건 운영진 계정(gameServer.ts)이 한다.
 *   날짜로 빼면 같은 날의 실제 게임까지 버린다(10/2 는 실제 3판에 운영진 4판이 섞였다)
 *
 * 행사 게임은 사람이 고른다(metrics_event_games). 처음엔 장소 좌표와 반경으로 찾았는데, 근처의 남의 게임이 잡히고
 * 반경을 조금 벗어난 부스 게임은 빠지는 짐작이었다. 어느 게임이 우리 것인지는 팀이 안다.
 * 고르기 쉽게 행사 시간 안에 시작한 게임은 미리 체크하고(inEventTime), 그날 게임을 장소별로 묶어 보여 준다(eventReport.ts)
 */

export const CATEGORIES = ["event", "promo", "release", "test", "etc"] as const;
export type Category = (typeof CATEGORIES)[number];
export const CATEGORY_LABEL: Record<Category, string> = { event: "행사", promo: "홍보", release: "출시", test: "테스트", etc: "기타" };
export const isCategory = (v: unknown): v is Category => typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);

export type MetricsEvent = {
  id: number;
  day: string;
  label: string;
  category: Category;
  /** 행사 시간(한국 시각 HH:MM). 행사가 아니거나 모르면 null. 행사 게임을 미리 체크할 때 쓴다 */
  startsAt: string | null;
  endsAt: string | null;
};

export const EVENT_COLUMNS = "id, day, label, category, starts_at, ends_at";
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

/** DB 한 줄을 일정으로. 새 칸이 없는 줄(마이그레이션 전)도 받는다 */
export function toEvent(row: Record<string, unknown>): MetricsEvent {
  const label = String(row.label ?? "");
  return {
    id: Number(row.id),
    day: String(row.day),
    label,
    category: isCategory(row.category) ? row.category : guessCategory(label),
    startsAt: hhmm(row.starts_at),
    endsAt: hhmm(row.ends_at),
  };
}

/** 두 지점 사이 거리(미터). 그날 게임을 장소별로 묶을 때 쓴다 */
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

export const toMinutes = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
/** 행사 시작 전에 미리 연 방도 행사 게임일 수 있다. 부스를 열기 전에 방을 만들어 두는 일이 많다 */
export const EARLY_MINUTES = 30;

/**
 * 행사 시간 안(시작 30분 전부터 끝까지)에 같은 날 시작한 게임인가. 행사 게임을 고르는 화면에서 미리 체크할 때만 쓴다.
 * 시간을 모르는 행사는 미리 체크하지 않는다
 */
export function inEventTime(e: Pick<MetricsEvent, "day" | "startsAt" | "endsAt">, startedAt: string): boolean {
  if (!e.startsAt || !e.endsAt) return false;
  const at = seoulClock(startedAt);
  return at.day === e.day && at.minute >= toMinutes(e.startsAt) - EARLY_MINUTES && at.minute <= toMinutes(e.endsAt);
}
