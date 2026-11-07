/**
 * 같은 순간이 우리 사용자들에게 몇 시인지 (#217).
 *
 * 사용자 절반이 해외다. 한국 밤은 유럽 오후, 미국 아침이라 점검이나 출시 시각을 한국 시간만 보고 고르면
 * 해외 사용자가 한창 놀 때 막는다. 그래서 시각을 고르는 화면은 사용자가 많은 지역의 현지 시각을 말(새벽, 낮, 저녁)로 보여 주고,
 * 그 시각이 주요 지역의 노는 시간과 겹치는지 한 줄로 말해 준다. 서머타임은 Intl 이 시간대 이름으로 계산한다.
 */

/** 사람들이 깨어 있는 시간(아침 7시 ~ 밤 11시). 밖이면 달, 안이면 해 */
export const AWAKE_HOURS = { from: 7, to: 23 } as const;

/**
 * 주로 노는 시간(현지). 2026-08 ~ 11 실제 게임 55판(운영진만 한 판, 행사 날 제외)에서
 * 한국 판은 12 ~ 21시에만, 해외 판은 현지 13 ~ 19시에 몰렸다. 끝을 22시로 넉넉히 둔다
 */
export const ACTIVE_HOURS = { from: 12, to: 22 } as const;

/** 결론 문장에 이름을 올리는 지역의 최소 비율. 작은 지역이 전체 판단을 흔들지 않게 한다 */
export const MAJOR_SHARE = 0.05;

export const isAwake = (hour: number) => hour >= AWAKE_HOURS.from && hour < AWAKE_HOURS.to;
export const isActive = (hour: number) => hour >= ACTIVE_HOURS.from && hour < ACTIVE_HOURS.to;

/** 시각을 부르는 말. 새벽 0 ~ 6, 아침 6 ~ 9, 오전 9 ~ 12, 낮 12 ~ 17, 저녁 17 ~ 21, 밤 21 ~ 24 */
export function timeWord(hour: number): string {
  if (hour < 6) return "새벽";
  if (hour < 9) return "아침";
  if (hour < 12) return "오전";
  if (hour < 17) return "낮";
  if (hour < 21) return "저녁";
  return "밤";
}

const fmt = new Map<string, Intl.DateTimeFormat>();
const formatter = (timeZone: string) => {
  let f = fmt.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    fmt.set(timeZone, f);
  }
  return f;
};

function parts(atMs: number, timeZone: string) {
  const p = formatter(timeZone).formatToParts(new Date(atMs));
  const get = (type: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")), minute: Number(get("minute")) };
}

export type LocalTime = {
  hour: number;
  /** "새벽 2:00", "낮 12:00", "저녁 7:30". 0시는 "새벽 0:10" 처럼 쓴다 */
  label: string;
  /** 서울 날짜보다 하루 앞(-1)인지 뒤(1)인지 */
  dayShift: -1 | 0 | 1;
  awake: boolean;
};

export function localTime(atMs: number, timeZone: string): LocalTime {
  const here = parts(atMs, timeZone);
  const seoul = parts(atMs, "Asia/Seoul").date;
  const h12 = here.hour > 12 ? here.hour - 12 : here.hour;
  return {
    hour: here.hour,
    label: `${timeWord(here.hour)} ${h12}:${String(here.minute).padStart(2, "0")}`,
    dayShift: here.date === seoul ? 0 : here.date < seoul ? -1 : 1,
    awake: isAwake(here.hour),
  };
}

export const DAY_SHIFT_LABEL: Record<LocalTime["dayShift"], string> = { [-1]: "전날", 0: "", 1: "다음 날" };

// ── 지역 ──

export type Region = { id: string; label: string; timeZone: string };
export type RegionShare = Region & { share: number };

/** 나라 코드를 대표 시간대로 묶는다. 사용자가 있는 나라 위주로, 시간대가 비슷한 나라는 하나로 */
const REGION_OF: Record<string, Region> = {};
const put = (codes: string[], region: Region) => codes.forEach((c) => (REGION_OF[c] = region));
put(["KR"], { id: "kr", label: "한국", timeZone: "Asia/Seoul" });
put(["JP"], { id: "jp", label: "일본", timeZone: "Asia/Tokyo" });
put(["AU", "NZ"], { id: "au", label: "호주", timeZone: "Australia/Sydney" });
put(["GB", "IE", "PT"], { id: "uk", label: "영국", timeZone: "Europe/London" });
put(["DE", "FR", "IT", "ES", "NL", "BE", "AT", "CH", "SE", "DK", "NO", "FI", "PL", "CZ", "HU", "GR", "RO"], { id: "eu", label: "유럽", timeZone: "Europe/Paris" });
put(["CA"], { id: "ca", label: "캐나다", timeZone: "America/Toronto" });
put(["MX", "CO", "PE"], { id: "latam", label: "중남미", timeZone: "America/Bogota" });
put(["BR", "AR", "CL"], { id: "br", label: "남미", timeZone: "America/Sao_Paulo" });
put(["IN"], { id: "in", label: "인도", timeZone: "Asia/Kolkata" });
put(["ZA", "ZW", "KE", "NG"], { id: "af", label: "아프리카", timeZone: "Africa/Johannesburg" });
put(["SG", "MY", "PH", "ID", "TH", "VN"], { id: "sea", label: "동남아", timeZone: "Asia/Singapore" });
put(["CN", "TW", "HK"], { id: "cn", label: "중화권", timeZone: "Asia/Shanghai" });
put(["AE", "SA", "IR", "TR", "IL"], { id: "me", label: "중동", timeZone: "Asia/Dubai" });
put(["RU"], { id: "ru", label: "러시아", timeZone: "Europe/Moscow" });

/** 미국은 동부와 서부가 3시간 차이라 둘로 나누고 사용자를 반씩 센다(나라 안 지역은 모른다) */
const US_EAST: Region = { id: "us-east", label: "미국 동부", timeZone: "America/New_York" };
const US_WEST: Region = { id: "us-west", label: "미국 서부", timeZone: "America/Los_Angeles" };

/** 비율을 모를 때 보여 주는 주요 지역 */
export const DEFAULT_REGIONS: readonly Region[] = [REGION_OF.KR, REGION_OF.JP, US_EAST, US_WEST, REGION_OF.GB, REGION_OF.AU];

/** 나라별 사용자 수를 지역 비율로, 많은 순으로. 한국은 기준이라 늘 맨 앞. 묶이지 않는 나라는 지역을 만들지 않는다 */
export function regionShares(countries: { country: string; count: number }[]): RegionShare[] {
  const total = countries.reduce((a, c) => a + c.count, 0);
  if (total <= 0) return [];
  const by = new Map<string, RegionShare>();
  const add = (region: Region, n: number) => {
    const o = by.get(region.id) ?? { ...region, share: 0 };
    o.share += n / total;
    by.set(region.id, o);
  };
  for (const { country, count } of countries) {
    if (country === "US") {
      add(US_EAST, count / 2);
      add(US_WEST, count / 2);
    } else if (REGION_OF[country]) add(REGION_OF[country], count);
  }
  const all = [...by.values()].sort((a, b) => b.share - a.share);
  const kr = all.find((r) => r.id === "kr");
  return kr ? [kr, ...all.filter((r) => r !== kr)] : all;
}

/**
 * 고른 시각(at), 또는 구간(from ~ at)이 그 지역의 노는 시간과 겹치는지.
 * 구간은 15분 간격으로 본다. 점검은 길어야 하루라 충분하다
 */
export function overlapsActive(timeZone: string, at: number, from?: number): boolean {
  if (from === undefined || from >= at) return isActive(parts(at, timeZone).hour);
  for (let t = from; t <= at; t += 15 * 60_000) if (isActive(parts(t, timeZone).hour)) return true;
  return isActive(parts(at, timeZone).hour);
}
