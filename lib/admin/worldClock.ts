/**
 * 같은 순간이 나라마다 몇 시인지 (#217).
 *
 * 사용자 절반이 해외다(2026-08 ~ 11 첫 실행 기준 한국 52%, 미국 14%, 일본 8%, 호주 5%). 한국 밤이 유럽 오후,
 * 미국 아침이라 점검이나 출시 시각을 한국 시간만 보고 고르면 해외 사용자가 한창 쓸 때 막힌다.
 * 그래서 시각을 고르는 화면은 이 도시들의 시각을 같이 보여 준다. 서머타임은 Intl 이 시간대 이름으로 계산한다.
 */

export type WorldCity = { id: string; label: string; timeZone: string };

/** 서울을 맨 앞에 둔다. 나머지는 사용자가 많은 나라와 그 반대편 시간대를 고루 넣었다 */
export const WORLD_CITIES: readonly WorldCity[] = [
  { id: "seoul", label: "서울", timeZone: "Asia/Seoul" },
  { id: "tokyo", label: "도쿄", timeZone: "Asia/Tokyo" },
  { id: "london", label: "런던", timeZone: "Europe/London" },
  { id: "new-york", label: "뉴욕", timeZone: "America/New_York" },
  { id: "los-angeles", label: "LA", timeZone: "America/Los_Angeles" },
  { id: "sydney", label: "시드니", timeZone: "Australia/Sydney" },
];

export type CityTime = {
  id: string;
  label: string;
  /** "09:05" */
  time: string;
  hour: number;
  /** 서울 날짜보다 하루 앞(-1)인지 뒤(1)인지 */
  dayShift: -1 | 0 | 1;
  /** 사람들이 대개 자는 시간(밤 11시 ~ 아침 7시) */
  night: boolean;
};

const parts = (atMs: number, timeZone: string) => {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(atMs));
  const get = (type: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")), minute: get("minute") };
};

export function cityTimes(atMs: number, cities: readonly WorldCity[] = WORLD_CITIES): CityTime[] {
  const seoulDate = parts(atMs, "Asia/Seoul").date;
  return cities.map((city) => {
    const { date, hour, minute } = parts(atMs, city.timeZone);
    const dayShift = date === seoulDate ? 0 : date < seoulDate ? -1 : 1;
    return {
      id: city.id,
      label: city.label,
      time: `${String(hour).padStart(2, "0")}:${minute}`,
      hour,
      dayShift,
      night: hour >= 23 || hour < 7,
    };
  });
}

export const DAY_SHIFT_LABEL: Record<CityTime["dayShift"], string> = { [-1]: "전날", 0: "", 1: "다음 날" };
