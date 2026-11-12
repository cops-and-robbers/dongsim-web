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

/** 진행 시간 "5:37", 한 시간이 넘으면 "1:02:03" */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
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

/**
 * 사람 그림(꾸밈). 유저 번호로 그림(냥파, 도둥이)과 바탕색 여섯 가지 중 하나를 정한다.
 * 같은 사람은 어디서나 같은 모양이라 목록에서 다시 찾기 쉽다. 앱 프로필이나 팀과는 상관없다
 */
export function avatarFor(id: string): { character: "police" | "robber"; tone: number } {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h >>>= 0;
  return { character: h % 2 === 0 ? "police" : "robber", tone: Math.floor(h / 2) % 6 };
}
