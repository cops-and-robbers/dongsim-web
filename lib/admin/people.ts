/**
 * 유저와 게임 두 칸 화면(#315)에서 같이 쓰는 표시 규칙. 화면 밖에서 테스트할 수 있게 계산만 모아 둔다.
 * 시각은 모두 한국 시각(KST)으로 읽는다. 운영진이 한국에 있고, 지표와 일정도 KST 로 날을 나눈다
 */

const KST = 9 * 3600_000;
const MIN = 60_000;
const HOUR = 3600_000;
const DAY = 86_400_000;

const shift = (iso: string) => new Date(Date.parse(iso) + KST);

/** KST 날짜 "2026-11-10" */
export const kstDay = (iso: string) => shift(iso).toISOString().slice(0, 10);

/** KST 시각 "14:08" */
export const kstClock = (iso: string) => shift(iso).toISOString().slice(11, 16);

/** "오후 2:42" */
export function kstTimeOfDay(iso: string): string {
  const d = shift(iso);
  const h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${m}`;
}

/** 날 묶음 제목. 오늘, 어제, 올해면 "11월 8일", 지난해면 "2025년 11월 8일" */
export function dayName(iso: string, now: number = Date.now()): string {
  const day = kstDay(iso);
  const today = kstDay(new Date(now).toISOString());
  if (day === today) return "오늘";
  if (day === kstDay(new Date(now - DAY).toISOString())) return "어제";
  const [y, m, d] = day.split("-").map(Number);
  return y === Number(today.slice(0, 4)) ? `${m}월 ${d}일` : `${y}년 ${m}월 ${d}일`;
}

/** 지난 시간. 1분 안이면 "방금", 하루 안은 분과 시간, 그 뒤는 날, 두 달이 넘으면 날짜 */
export function ago(iso: string, now: number = Date.now()): string {
  const d = Math.max(0, now - Date.parse(iso));
  if (d < MIN) return "방금";
  if (d < HOUR) return `${Math.floor(d / MIN)}분 전`;
  if (d < DAY) return `${Math.floor(d / HOUR)}시간 전`;
  if (d < 60 * DAY) return `${Math.floor(d / DAY)}일 전`;
  return dayName(iso, now);
}

/** 가입한 지. 오늘 가입했으면 "오늘", 아니면 달력 날짜 차이로 "10일 전" */
export function sinceDay(iso: string, now: number = Date.now()): string {
  const a = Date.parse(`${kstDay(iso)}T00:00:00Z`);
  const b = Date.parse(`${kstDay(new Date(now).toISOString())}T00:00:00Z`);
  const days = Math.round((b - a) / DAY);
  return days <= 0 ? "오늘" : days === 1 ? "어제" : `${days}일 전`;
}

/**
 * 진행 시간. "7:00" 처럼 쓰면 옆의 끝난 시각("13:27")과 같은 모양이라 시각으로 읽혀서 분으로 쓴다.
 * 목록은 "7분"(1분 안이면 "40초"), 판 상세처럼 정확히 볼 곳은 precise 로 "14분 21초"
 */
export function durationText(seconds: number, precise = false): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const minutes = h > 0 ? `${h}시간${mm ? ` ${mm}분` : ""}` : `${m}분`;
  return precise && r > 0 ? `${minutes} ${r}초` : minutes;
}

/** 순서를 지키며 같은 열쇠끼리 묶는다(이미 정렬된 목록을 날로 나눌 때) */
export function groupInOrder<T>(items: readonly T[], keyOf: (item: T) => string): { key: string; items: T[] }[] {
  const out: { key: string; items: T[] }[] = [];
  for (const item of items) {
    const key = keyOf(item);
    const last = out[out.length - 1];
    if (last && last.key === key) last.items.push(item);
    else out.push({ key, items: [item] });
  }
  return out;
}

/** 앱에 있는 프로필 그림 번호(앱 lib/features/user/presentation/providers/profile_icon_provider.dart 와 같다) */
export const PROFILE_ICON_IDS = [1, 2] as const;

/**
 * 사람 그림(꾸밈). 앱의 프로필 그림(public/app-icons/profile_*.svg, 체험하기 홈과 같은 앱 그림)을 앱과 같은 모양으로 쓰고,
 * 유저 번호로 둘 중 하나를 정한다. 같은 사람은 어디서나 같은 그림이라 목록에서 다시 찾기 쉽다.
 * 앱에서 실제로 고른 그림과는 상관없는 재미 요소다(어드민에 그 값을 따로 받지 않는다)
 */
export function profileIconSrc(userId: string | null | undefined): string {
  if (!userId) return `/app-icons/profile_${PROFILE_ICON_IDS[0]}.svg`;
  let h = 2166136261;
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `/app-icons/profile_${PROFILE_ICON_IDS[(h >>> 0) % PROFILE_ICON_IDS.length]}.svg`;
}
