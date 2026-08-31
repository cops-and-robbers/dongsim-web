import tzlookup from "tz-lookup";

import type { Locale } from "@/lib/i18n/config";

// 모집글 날짜·인원 표기. 화면 여러 곳에서 같은 모양이어야 해서 한곳에 모은다.
//
// Intl 로만 뽑지 않는다. "오후 6:00" 보다 "저녁 6시" 가 우리 말투에 맞고(docs/copy-guide.md),
// 일본어도 "夕方6時" 가 자연스럽다. 대신 요일·월일 표기는 언어마다 형식이 달라 표로 둔다.

const WEEKDAY: Record<Locale, readonly string[]> = {
  ko: ["일", "월", "화", "수", "목", "금", "토"],
  ja: ["日", "月", "火", "水", "木", "金", "土"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

const MONTH_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** 모임 장소의 시간대. 좌표에서 얻고, 못 얻으면 한국 시간대로 둔다. */
export function zoneOf(location: { latitude: number; longitude: number }): string {
  try {
    return tzlookup(location.latitude, location.longitude);
  } catch {
    return "Asia/Seoul";
  }
}

/**
 * 모임은 그 동네 벽시계 시각으로 읽어야 한다. BE 가 모든 시각을 KST 오프셋으로
 * 직렬화하므로 문자열의 오프셋은 장소와 무관하고, 좌표에서 얻은 시간대로 환산한다.
 * 서머타임 계산은 Intl 에 맡긴다.
 */
const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function partsIn(iso: string, zone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 0,
  };
}

/** "9월 10일 (목)" / "9月10日 (木)" / "Sep 10 (Thu)" */
export function dayLabel(iso: string, locale: Locale, zone = "Asia/Seoul"): string {
  const d = partsIn(iso, zone);
  const day = WEEKDAY[locale][d.weekday];
  if (locale === "en") return `${MONTH_EN[d.month - 1]} ${d.day} (${day})`;
  if (locale === "ja") return `${d.month}月${d.day}日 (${day})`;
  return `${d.month}월 ${d.day}일 (${day})`;
}

/** "저녁 6시" / "夕方6時" / "6 PM" */
export function timeLabel(iso: string, locale: Locale, zone = "Asia/Seoul"): string {
  const d = partsIn(iso, zone);
  const hour = d.hour;
  const minute = d.minute;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;

  if (locale === "en") {
    const suffix = hour < 12 ? "AM" : "PM";
    return minute ? `${h12}:${String(minute).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
  }

  const part =
    locale === "ja"
      ? hour < 6 ? "深夜" : hour < 12 ? "朝" : hour < 18 ? "昼" : "夜"
      : hour < 6 ? "새벽" : hour < 12 ? "오전" : hour < 18 ? "낮" : "저녁";

  if (locale === "ja") {
    return minute ? `${part}${h12}時${minute}分` : `${part}${h12}時`;
  }
  return minute ? `${part} ${h12}시 ${minute}분` : `${part} ${h12}시`;
}

/** 한 줄로 붙여 쓸 때 */
export function meetingLabel(iso: string, locale: Locale, zone = "Asia/Seoul"): string {
  return `${dayLabel(iso, locale, zone)} ${timeLabel(iso, locale, zone)}`;
}

/** 며칠 남았는지. 2주가 넘으면 급한 정도를 말할 게 없어 표시하지 않는다 */
export function daysUntil(iso: string, now: number = Date.now()): number | null {
  const diff = Math.ceil((new Date(iso).getTime() - now) / 86_400_000);
  if (diff < 0 || diff > 14) return null;
  return diff;
}
