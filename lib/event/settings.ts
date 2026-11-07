/**
 * 행사 설정 (#219). 지표 일정의 행사(성격 = 행사) 하나에 매달리는 값.
 *
 * 행사 때 사용자가 보는 곳은 넷이다. 포토부스(/photobooth), 홈 팝업, 행사 이야기 페이지(/event), 홈 미니게임 칸.
 * 예전에는 값이 코드와 Vercel 환경 변수에 흩어져 행사마다 고치고 다시 배포했다.
 * 이제 어드민이 행사마다 이 값을 저장하고, 각 화면은 서버에서 "지금 행사"를 골라 읽는다(lib/event/server.ts).
 *
 * 시각은 한국 시각 "YYYY-MM-DDTHH:MM" 로 적는다. 어드민이 고르는 그대로이고, 비교할 때만 순간(ms)으로 바꾼다.
 * 이 파일은 순수 함수만 둔다(서버, 화면, 테스트가 같이 쓴다).
 */

export type KstTime = string;

export type PopupMode = "off" | "untilEnd" | "custom";
export type StoryMode = "off" | "booth";

export type EventSettings = {
  /** 화면에 보일 행사 이름. 부스 준비 중, 감사 화면, 홈 팝업 제목에 들어간다 */
  name: string;
  /** 날짜 문구. 비우면 그 줄을 숨긴다 */
  dateLabel: string;
  /** 장소. 비우면 그 줄을 숨긴다 */
  location: string;
  /** 부스가 열리는 때와 닫히는 때 */
  boothFrom: KstTime;
  boothUntil: KstTime;
  /** 시간과 상관없이 닫는다(현장에서 급할 때) */
  boothClosed: boolean;
  /** 홈 팝업: 안 띄우기, 행사 끝날 때까지, 직접 고르기 */
  popup: PopupMode;
  popupFrom: KstTime | null;
  popupUntil: KstTime | null;
  /** 홈 팝업 "행사 보기" 버튼 주소. 비우면 버튼을 빼고 닫기만 둔다 */
  popupUrl: string;
  /** 행사 이야기 페이지(/event): 안 씀, 부스 시간에 본문 공개 */
  story: StoryMode;
};

/** 설정이 매달리는 일정. lib/metrics/events.ts 의 MetricsEvent 중 필요한 칸 */
export type EventDay = { id: number; day: string; label: string; startsAt: string | null; endsAt: string | null };

/** 홈 미니게임 칸을 보이는 기간(사이트 전체 하나). null 이면 숨김 */
export type HomeMinigame = { from: KstTime; until: KstTime } | null;

export const MAX = { name: 20, dateLabel: 32, location: 24, popupUrl: 300 } as const;

// ── 시각 ──

export const toMs = (t: KstTime) => Date.parse(`${t}:00+09:00`);

export function kstNow(nowMs: number): KstTime {
  return new Date(nowMs + 9 * 3600_000).toISOString().slice(0, 16);
}

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

/** "11월 22일 (토)" */
export function dayLabel(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WEEKDAY[d.getUTCDay()]})`;
}

/** "오전 9시", "낮 12시", "오후 5시 30분" */
export function hourLabel(hm: string): string {
  const h = Number(hm.slice(0, 2));
  const m = Number(hm.slice(3, 5));
  const word = h < 12 ? "오전" : h === 12 ? "낮" : "오후";
  const h12 = h > 12 ? h - 12 : h;
  return `${word} ${h12}시${m ? ` ${m}분` : ""}`;
}

/** "11/22 (토) 오전 9시" 처럼 어드민 화면에 쓰는 짧은 시각 */
export function shortTime(t: KstTime): string {
  const d = new Date(`${t.slice(0, 10)}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} (${WEEKDAY[d.getUTCDay()]}) ${hourLabel(t.slice(11, 16))}`;
}

const addMinutes = (t: KstTime, min: number): KstTime => kstNow(toMs(t) + min * 60_000);

// ── 기본값 ──

/** 일정에서 날짜 문구를 만든다. "11월 22일 (토) 낮 12시 - 오후 5시" */
export function dateLabelOf(e: Pick<EventDay, "day" | "startsAt" | "endsAt">): string {
  const day = dayLabel(e.day);
  if (!e.startsAt) return day;
  return e.endsAt ? `${day} ${hourLabel(e.startsAt)} - ${hourLabel(e.endsAt)}` : `${day} ${hourLabel(e.startsAt)}`;
}

/**
 * 부스 기본 운영 시간. 행사 3시간 전부터(설치하고 시험 인쇄할 시간, 지난 행사 그대로) 끝나고 1시간 뒤까지.
 * 행사 시간을 모르면 오전 9시부터 오후 6시
 */
export function defaultBoothWindow(e: Pick<EventDay, "day" | "startsAt" | "endsAt">): { boothFrom: KstTime; boothUntil: KstTime } {
  const from = e.startsAt ? addMinutes(`${e.day}T${e.startsAt}`, -180) : `${e.day}T09:00`;
  const until = e.endsAt ? addMinutes(`${e.day}T${e.endsAt}`, 60) : `${e.day}T18:00`;
  return { boothFrom: from < `${e.day}T00:00` ? `${e.day}T00:00` : from, boothUntil: until };
}

/** 처음 여는 행사의 값. 이름과 날짜는 일정에서, 팝업은 행사 끝날 때까지, 이야기 페이지는 안 씀 */
export function defaultSettings(e: EventDay): EventSettings {
  return {
    name: e.label.slice(0, MAX.name),
    dateLabel: dateLabelOf(e),
    location: "",
    ...defaultBoothWindow(e),
    boothClosed: false,
    popup: "untilEnd",
    popupFrom: null,
    popupUntil: null,
    popupUrl: "",
    story: "off",
  };
}

/**
 * 저장소를 못 읽거나 설정한 행사가 하나도 없을 때 쓰는 값. 마지막으로 코드에 있던 행사(7/4 서울 게임 타운)다.
 * 행사 중에 저장소가 멈춰도 부스가 지금과 똑같이 돈다
 */
export const LEGACY_EVENT: EventDay = { id: 0, day: "2026-07-04", label: "서울 게임 타운", startsAt: "12:00", endsAt: "17:00" };
export const LEGACY_SETTINGS: EventSettings = {
  name: "서울 게임 타운",
  dateLabel: "7월 4일 (토) 낮 12시-오후 5시",
  location: "판교 투썸월드 B1",
  boothFrom: "2026-07-04T09:00",
  boothUntil: "2026-07-04T18:00",
  boothClosed: false,
  popup: "custom",
  popupFrom: null,
  popupUntil: "2026-07-05T00:00",
  popupUrl: "https://seoulgametown.com/",
  story: "booth",
};

// ── 검사 ──

const KST_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const isTime = (v: unknown): v is KstTime => typeof v === "string" && KST_TIME.test(v) && !Number.isNaN(toMs(v));
const LONG_DASH = /[–—]/;

export type Problems = Partial<Record<keyof EventSettings, string>>;

/** 저장하면 안 되는 값. 칸마다 쉬운 말 하나 */
export function validate(s: EventSettings): Problems {
  const p: Problems = {};
  const text = (k: "name" | "dateLabel" | "location", max: number, required: boolean) => {
    const v = s[k];
    if (required && !v.trim()) p[k] = "비워 둘 수 없어요.";
    else if (v.length > max) p[k] = `${max}자까지 쓸 수 있어요.`;
    else if (LONG_DASH.test(v)) p[k] = "긴 대시(—, –) 대신 하이픈(-)을 써 주세요.";
  };
  text("name", MAX.name, true);
  text("dateLabel", MAX.dateLabel, false);
  text("location", MAX.location, false);
  if (!isTime(s.boothFrom)) p.boothFrom = "여는 시각을 골라 주세요.";
  if (!isTime(s.boothUntil)) p.boothUntil = "닫는 시각을 골라 주세요.";
  else if (isTime(s.boothFrom) && toMs(s.boothUntil) <= toMs(s.boothFrom)) p.boothUntil = "여는 시각보다 뒤여야 해요.";
  if (s.popup === "custom") {
    if (!isTime(s.popupUntil)) p.popupUntil = "내리는 시각을 골라 주세요.";
    else if (s.popupFrom && isTime(s.popupFrom) && toMs(s.popupUntil) <= toMs(s.popupFrom)) p.popupUntil = "띄우는 시각보다 뒤여야 해요.";
    if (s.popupFrom !== null && !isTime(s.popupFrom)) p.popupFrom = "띄우는 시각을 골라 주세요.";
  }
  if (s.popupUrl && !/^https:\/\/[^\s]+$/.test(s.popupUrl)) p.popupUrl = "https:// 로 시작하는 주소를 넣어 주세요.";
  else if (s.popupUrl.length > MAX.popupUrl) p.popupUrl = "주소가 너무 길어요.";
  return p;
}

/** 저장소에서 읽은 값을 믿지 않고 모양을 맞춘다. 모르는 칸은 버리고, 빠진 칸은 기본값으로 */
export function normalize(raw: unknown, fallback: EventSettings): EventSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (k: keyof EventSettings, max: number) => (typeof r[k] === "string" ? (r[k] as string).slice(0, max) : (fallback[k] as string));
  const time = (k: "boothFrom" | "boothUntil") => (isTime(r[k]) ? (r[k] as KstTime) : fallback[k]);
  const maybeTime = (k: "popupFrom" | "popupUntil") => (r[k] === null ? null : isTime(r[k]) ? (r[k] as KstTime) : fallback[k]);
  return {
    name: str("name", MAX.name),
    dateLabel: str("dateLabel", MAX.dateLabel),
    location: str("location", MAX.location),
    boothFrom: time("boothFrom"),
    boothUntil: time("boothUntil"),
    boothClosed: typeof r.boothClosed === "boolean" ? r.boothClosed : fallback.boothClosed,
    popup: r.popup === "off" || r.popup === "untilEnd" || r.popup === "custom" ? r.popup : fallback.popup,
    popupFrom: maybeTime("popupFrom"),
    popupUntil: maybeTime("popupUntil"),
    popupUrl: str("popupUrl", MAX.popupUrl),
    story: r.story === "off" || r.story === "booth" ? r.story : fallback.story,
  };
}

// ── 언제 무엇이 보이나 ──

/** 행사가 끝나는 순간. 행사 시간을 모르면 부스 닫는 시각 */
export function eventEnd(e: EventDay, s: EventSettings): KstTime {
  return e.endsAt ? `${e.day}T${e.endsAt}` : s.boothUntil;
}

/** 홈 팝업이 떠 있는 구간. 시작이 null 이면 저장한 때부터 */
export function popupWindow(e: EventDay, s: EventSettings): { from: KstTime | null; until: KstTime } | null {
  if (s.popup === "off") return null;
  if (s.popup === "untilEnd") return { from: null, until: eventEnd(e, s) };
  return s.popupUntil ? { from: s.popupFrom, until: s.popupUntil } : null;
}

export type BoothState = "before" | "open" | "after" | "closed";
export type StoryState = "teaser" | "open" | "done";

export function boothState(s: EventSettings, nowMs: number): BoothState {
  if (s.boothClosed) return "closed";
  if (nowMs < toMs(s.boothFrom)) return "before";
  return nowMs <= toMs(s.boothUntil) ? "open" : "after";
}

export function storyState(s: EventSettings, nowMs: number): StoryState {
  if (nowMs < toMs(s.boothFrom)) return "teaser";
  return nowMs <= toMs(s.boothUntil) ? "open" : "done";
}

export function popupOn(e: EventDay, s: EventSettings, nowMs: number): boolean {
  const w = popupWindow(e, s);
  if (!w) return false;
  return (w.from === null || nowMs >= toMs(w.from)) && nowMs < toMs(w.until);
}

export const minigameOn = (m: HomeMinigame, nowMs: number) => m !== null && nowMs >= toMs(m.from) && nowMs < toMs(m.until);

// ── 지금 행사 고르기 ──

export type Configured = { event: EventDay; settings: EventSettings };

/**
 * 부스와 이야기 페이지가 따를 행사.
 * 운영 시간 안인 행사 → 아직 안 끝난 행사 중 가장 먼저 여는 것 → 가장 최근에 끝난 것(감사 화면)
 */
export function pickBoothEvent(list: Configured[], nowMs: number): Configured | null {
  if (list.length === 0) return null;
  const open = list.find((c) => toMs(c.settings.boothFrom) <= nowMs && nowMs <= toMs(c.settings.boothUntil));
  if (open) return open;
  const upcoming = list.filter((c) => toMs(c.settings.boothUntil) > nowMs).sort((a, b) => toMs(a.settings.boothFrom) - toMs(b.settings.boothFrom));
  if (upcoming.length) return upcoming[0];
  return [...list].sort((a, b) => toMs(b.settings.boothUntil) - toMs(a.settings.boothUntil))[0];
}

/** 홈 팝업을 띄울 행사. 지금 떠 있어야 할 것 중 행사 날이 가장 가까운 것 */
export function pickPopupEvent(list: Configured[], nowMs: number): Configured | null {
  return list.filter((c) => popupOn(c.event, c.settings, nowMs)).sort((a, b) => a.event.day.localeCompare(b.event.day))[0] ?? null;
}

/** 이야기 페이지를 쓰는 행사만 놓고 부스와 같은 규칙으로 */
export const pickStoryEvent = (list: Configured[], nowMs: number) => pickBoothEvent(list.filter((c) => c.settings.story === "booth"), nowMs);

// ── 하루 안에서 바뀌는 때 (어드민 달력) ──

export type Moment = { at: KstTime; what: string[] };

/** 그날(한국 날짜) 안에서 사용자 화면이 바뀌는 시각들. 시각 순 */
export function momentsOn(day: string, e: EventDay, s: EventSettings, m: HomeMinigame): Moment[] {
  const marks: [KstTime | null, string][] = [
    [s.boothFrom, "부스 열림"],
    [s.boothUntil, "부스 닫힘, 감사 인사로"],
    [s.story === "booth" ? s.boothFrom : null, "행사 페이지 본문 공개"],
    [s.story === "booth" ? s.boothUntil : null, "행사 페이지 사건 종결로"],
    [e.startsAt ? `${e.day}T${e.startsAt}` : null, "행사 시작"],
    [e.endsAt ? `${e.day}T${e.endsAt}` : null, "행사 끝"],
  ];
  const w = popupWindow(e, s);
  if (w?.from) marks.push([w.from, "홈 팝업 띄움"]);
  if (w) marks.push([w.until, "홈 팝업 내림"]);
  if (m) marks.push([m.from, "홈 미니게임 보임"], [m.until, "홈 미니게임 숨김"]);
  const by = new Map<KstTime, string[]>();
  for (const [at, what] of marks) {
    if (!at || at.slice(0, 10) !== day) continue;
    by.set(at, [...(by.get(at) ?? []), what]);
  }
  return [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([at, what]) => ({ at, what }));
}

// ── 준비 점검 ──

export type Check = { id: string; level: "warn" | "todo" | "ok"; title: string; detail: string; tab: "info" | "home" };

/** 저장된 값으로 할 수 있는 점검. 빠진 것, 의심스러운 것을 먼저 */
export function readiness(e: EventDay, s: EventSettings): Check[] {
  const out: Check[] = [];
  const day = dayLabel(e.day).replace(/ \(.\)$/, "");
  if (s.dateLabel && !s.dateLabel.includes(day)) {
    out.push({ id: "date", level: "warn", title: "날짜 문구가 일정 날짜와 달라요", detail: `일정은 ${dayLabel(e.day)}인데 문구는 "${s.dateLabel}"이에요. 지난 행사 문구가 남은 건 아닌지 봐 주세요.`, tab: "info" });
  }
  if (!s.location.trim()) {
    out.push({ id: "location", level: "todo", title: "장소가 비어 있어요", detail: "비워 두면 부스 준비 중 화면과 홈 팝업에서 장소 줄이 빠져요.", tab: "info" });
  }
  if (e.startsAt && toMs(s.boothFrom) > toMs(`${e.day}T${e.startsAt}`)) {
    out.push({ id: "boothLate", level: "warn", title: "부스가 행사 시작보다 늦게 열려요", detail: `행사는 ${hourLabel(e.startsAt)}에 시작하는데 부스는 ${shortTime(s.boothFrom)}에 열려요.`, tab: "info" });
  }
  if (e.endsAt && toMs(s.boothUntil) < toMs(`${e.day}T${e.endsAt}`)) {
    out.push({ id: "boothEarly", level: "warn", title: "부스가 행사 끝나기 전에 닫혀요", detail: `행사는 ${hourLabel(e.endsAt)}에 끝나는데 부스는 ${shortTime(s.boothUntil)}에 닫혀요.`, tab: "info" });
  }
  if (s.boothClosed) {
    out.push({ id: "closed", level: "warn", title: "부스를 닫아 두었어요", detail: "운영 시간이 와도 열리지 않아요. 다시 열려면 개요에서 \"부스 다시 열기\"를 눌러요.", tab: "info" });
  }
  const w = popupWindow(e, s);
  if (w && toMs(w.until) > toMs(eventEnd(e, s)) + 24 * 3600_000) {
    out.push({ id: "popupLong", level: "warn", title: "홈 팝업이 행사 다음 날 뒤까지 떠요", detail: `${shortTime(w.until)}에 내려가요. 행사가 끝난 뒤에도 "만나요"가 보여요.`, tab: "home" });
  }
  if (w && !s.popupUrl) {
    out.push({ id: "popupUrl", level: "todo", title: "홈 팝업에 행사 보기 주소가 없어요", detail: "주소가 없으면 팝업에 닫기 버튼만 있어요. 행사 공식 페이지가 있으면 넣어 주세요.", tab: "home" });
  }
  if (out.every((c) => c.tab !== "info")) out.push({ id: "infoOk", level: "ok", title: "보이는 정보와 운영 시간", detail: `${s.name} · ${shortTime(s.boothFrom)} ~ ${shortTime(s.boothUntil)}`, tab: "info" });
  if (out.every((c) => c.tab !== "home")) out.push({ id: "homeOk", level: "ok", title: "홈 팝업", detail: w ? `${shortTime(w.until)}까지 떠요` : "띄우지 않아요", tab: "home" });
  const rank = { warn: 0, todo: 1, ok: 2 } as const;
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

// ── 바뀐 것 (저장 전 확인창) ──

/** 칸이 사용자의 어느 화면 어디를 바꾸는지. 확인창과 칸 옆 표시가 같이 쓴다 */
export const WHERE: Record<keyof EventSettings, { label: string; places: string[] }> = {
  name: { label: "행사 이름", places: ["부스 준비 중 화면", "부스 감사 화면", "홈 팝업 제목", "행사 페이지"] },
  dateLabel: { label: "날짜 문구", places: ["부스 준비 중 화면", "홈 팝업"] },
  location: { label: "장소", places: ["부스 준비 중 화면", "홈 팝업"] },
  boothFrom: { label: "부스 여는 시각", places: ["포토부스", "행사 페이지 공개"] },
  boothUntil: { label: "부스 닫는 시각", places: ["포토부스", "행사 페이지 공개"] },
  boothClosed: { label: "부스 닫기", places: ["포토부스"] },
  popup: { label: "홈 팝업 띄우기", places: ["사이트 홈"] },
  popupFrom: { label: "홈 팝업 띄우는 시각", places: ["사이트 홈"] },
  popupUntil: { label: "홈 팝업 내리는 시각", places: ["사이트 홈"] },
  popupUrl: { label: "행사 보기 버튼 주소", places: ["홈 팝업 버튼"] },
  story: { label: "행사 페이지", places: ["/event"] },
};

const POPUP_LABEL: Record<PopupMode, string> = { off: "안 띄우기", untilEnd: "행사 끝날 때까지", custom: "직접 고른 기간" };
const STORY_LABEL: Record<StoryMode, string> = { off: "안 씀", booth: "부스 시간에 공개" };

function show(k: keyof EventSettings, s: EventSettings): string {
  const v = s[k];
  if (k === "popup") return POPUP_LABEL[s.popup];
  if (k === "story") return STORY_LABEL[s.story];
  if (k === "boothClosed") return s.boothClosed ? "닫음" : "운영 시간대로";
  if (k === "boothFrom" || k === "boothUntil" || k === "popupFrom" || k === "popupUntil") return v ? shortTime(v as string) : "저장한 때부터";
  return (v as string) || "(비움)";
}

export function diff(before: EventSettings, after: EventSettings) {
  return (Object.keys(WHERE) as (keyof EventSettings)[])
    .filter((k) => before[k] !== after[k])
    .map((k) => ({ key: k, label: `${WHERE[k].label} · ${WHERE[k].places.join(", ")}`, before: show(k, before), after: show(k, after) }));
}
