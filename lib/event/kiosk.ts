/**
 * 포토부스 방식, 흐름, 문구 (#221). 행사 설정(lib/event/settings.ts)의 kiosk 칸.
 *
 * 행사마다 장비와 성격이 다르다. 포토프린터가 있는 곳, QR 로만 받는 곳, 줄이 길어 빨리 돌려야 하는 축제.
 * 화면 배치는 코드가 정하고, 어드민은 정해 둔 선택지 중에 고르고 문구를 채운다(화면이 깨지지 않게).
 * 문구는 기본값과 다른 줄만 저장한다. 기본 문구가 바뀌면 고치지 않은 행사도 같이 따라간다.
 */

import { BUILTIN_CHARACTERS, BUILTIN_FRAME, KEY_RE, builtinCharacter, characterSrc, frameSrc, normalizeFrameRef, type FrameRef, type Side } from "./assets.ts";

export type Receive = "print" | "qr";
export type CharacterRef = { key: string; label: string };
export type Paper = "postcard-pair" | "strip-2x6";
export type Method = "print" | "qr" | "quick";

export type KioskConfig = {
  /** 마지막으로 고른 부스 방식. 시작값을 채울 뿐 다른 칸과 묶이지 않는다 */
  method: Method;
  receive: Receive;
  paper: Paper;
  /** 테두리 없는 인화 확대(약 4%)를 미리 줄여 두는 비율. 90 ~ 100 */
  overscan: number;
  /** 받기 화면이 뜨면 버튼 없이 바로 인쇄. 키오스크 크롬을 --kiosk-printing 으로 띄웠을 때만 다이얼로그 없이 나간다 */
  autoPrint: boolean;
  /** 찍는 장수. 고르기를 끄면 프레임 칸 수만큼만 찍는다 */
  shots: number;
  countdown: number;
  tapToShoot: boolean;
  select: boolean;
  /** 받기 화면에서 처음 화면으로 돌아가는 시간(초) */
  restartSec: number;
  /** 시험 인쇄를 확인한 때(한국 시각). 준비 점검이 쓴다 */
  testPrinted: string | null;
  /** 기본값과 다른 문구만 */
  copy: Partial<Record<CopyKey, string>>;
  /** 쓸 프레임과 순서(#224). 비면 기본 연두. 2개 이상이면 손님이 고르는 칸이 생긴다. 칸 수와 비율이 모두 같아야 한다 */
  frames: FrameRef[];
  /** 부스 캐릭터 짝(#224, 그림 보관함). null 이면 기본(냥파 교수, 도둥이). 이름을 같이 적어 확인창에 보인다 */
  characters: Record<Side, CharacterRef | null>;
};

export const SHOT_CHOICES = [4, 5, 6, 7, 8] as const;
export const COUNTDOWN_CHOICES = [3, 5, 10] as const;
export const RESTART_CHOICES = [30, 45, 60, 120] as const;
export const OVERSCAN_RANGE = { min: 90, max: 100 } as const;

/** 기본 프레임의 사진 칸 수 */
export const FRAME_SLOTS = BUILTIN_FRAME.slots.length;

/** 행사가 쓰는 프레임. 고른 게 없으면 기본 연두 */
export const framesOf = (k: Pick<KioskConfig, "frames">): FrameRef[] => (k.frames.length ? k.frames : [BUILTIN_FRAME]);
/** 사진 칸 수. 같이 쓰는 프레임은 칸 수가 같다 */
export const slotsOf = (k: Pick<KioskConfig, "frames">) => framesOf(k)[0].slots.length;
/** 부스 캐릭터 짝의 그림 주소 */
export const charactersOf = (k: Pick<KioskConfig, "characters">): Record<Side, string> => ({
  cop: k.characters.cop ? characterSrc(k.characters.cop.key) : BUILTIN_CHARACTERS.cop.src,
  thief: k.characters.thief ? characterSrc(k.characters.thief.key) : BUILTIN_CHARACTERS.thief.src,
});
export { frameSrc };

/** 마지막으로 코드에 있던 값. 지금 부스와 똑같이 돈다 */
export const DEFAULT_KIOSK: KioskConfig = {
  method: "print",
  receive: "print",
  paper: "postcard-pair",
  overscan: 96,
  autoPrint: false,
  shots: 6,
  countdown: 3,
  tapToShoot: true,
  select: true,
  restartSec: 60,
  testPrinted: null,
  copy: {},
  frames: [],
  characters: { cop: null, thief: null },
};

/** 부스 방식을 고르면 채우는 시작값 */
export const METHODS: Record<Method, { name: string; desc: string; values: Partial<KioskConfig> }> = {
  print: { name: "인쇄 부스", desc: "포토프린터가 있는 곳", values: { receive: "print", shots: 6, select: true, countdown: 3, restartSec: 60 } },
  qr: { name: "QR 부스", desc: "프린터 없이 폰으로 받는 곳", values: { receive: "qr", shots: 6, select: true, countdown: 3, restartSec: 45, autoPrint: false } },
  quick: { name: "빠른 부스", desc: "줄이 긴 축제", values: { receive: "qr", shots: FRAME_SLOTS, select: false, countdown: 3, restartSec: 30, autoPrint: false } },
};

/** 방식이 정하는 흐름을 한 줄로. "6장 찍기 → 4장 고르기 → 인쇄하고 QR" */
export function flowLine(k: Pick<KioskConfig, "shots" | "select" | "receive"> & Partial<Pick<KioskConfig, "frames">>): string {
  const slots = slotsOf({ frames: k.frames ?? [] });
  const shots = k.select ? k.shots : slots;
  return [`${shots}장 찍기`, k.select ? `${slots}장 고르기` : null, k.receive === "print" ? "인쇄하고 QR" : "QR로 받기"].filter(Boolean).join(" → ");
}

// ── 문구 ──

export type Screen = "intro" | "capture" | "select" | "preview" | "qr" | "closed" | "over" | "result";

export const SCREEN_LABEL: Record<Screen, string> = {
  intro: "시작",
  capture: "찍기",
  select: "고르기",
  preview: "미리보기",
  qr: "받기",
  closed: "준비 중",
  over: "끝난 뒤",
  result: "손님 폰 (사진 받기)",
};

type CopyDef = { screen: Screen; label: string; text: string; max: number; lines?: number };

/**
 * 부스 화면 문구 자리. 한도는 그 자리에서 한 줄(lines 가 있으면 그 줄 수)에 들어가는 길이를 부스 화면(1280 폭)에서 쟀다.
 * {행사 이름}, {컷 수} 는 그 행사 값으로 바뀐다
 */
export const COPY = {
  "intro.title": { screen: "intro", label: "제목", text: "경찰과 도둑학개론", max: 14 },
  "intro.body": { screen: "intro", label: "설명", text: "냥파 교수님과 도둥이가 함께하는 {컷 수}컷,\n지금 찍어서 QR로 바로 받아가세요.", max: 48, lines: 2 },
  "intro.start": { screen: "intro", label: "시작 버튼", text: "촬영 시작", max: 8 },
  "capture.hint": { screen: "capture", label: "아래 안내", text: "화면을 누르면 바로 찍혀요", max: 20 },
  "select.title": { screen: "select", label: "제목", text: "마음에 드는 {컷 수}컷을 골라요", max: 18 },
  "select.retake": { screen: "select", label: "다시 찍기 버튼", text: "다시 찍기", max: 8 },
  "select.done": { screen: "select", label: "다 고른 버튼", text: "이걸로 할래요", max: 10 },
  "preview.title": { screen: "preview", label: "제목", text: "이렇게 나왔어요", max: 12 },
  "preview.body": { screen: "preview", label: "안내", text: "괜찮으면 QR로 받아가세요", max: 24 },
  "preview.issue": { screen: "preview", label: "받기 버튼", text: "QR 만들기", max: 10 },
  "qr.title": { screen: "qr", label: "제목", text: "예쁜 사진이 나왔어요", max: 14 },
  "qr.body": { screen: "qr", label: "안내", text: "QR을 스캔해서 가져가세요", max: 24 },
  "qr.keep": { screen: "qr", label: "받는 기간 안내", text: "오늘 하루만 받을 수 있어요", max: 24 },
  "qr.restart": { screen: "qr", label: "처음으로 버튼", text: "처음으로", max: 8 },
  "qr.print": { screen: "qr", label: "인쇄 버튼", text: "인쇄하기", max: 8 },
  "closed.title": { screen: "closed", label: "제목", text: "지금은 준비 중이에요", max: 16 },
  "closed.body": { screen: "closed", label: "안내", text: "{행사 이름}에서 만나요", max: 32 },
  "over.title": { screen: "over", label: "제목", text: "와주셔서 감사합니다", max: 16 },
  "over.body": { screen: "over", label: "안내", text: "{행사 이름} 포토부스는 여기서 마무리됐어요.", max: 44 },
  "over.sub": { screen: "over", label: "한 줄 더", text: "함께 남긴 네컷, 오래 간직할게요. 다음 행사에서 또 만나요!", max: 40 },
  "result.title": { screen: "result", label: "제목", text: "사진이 나왔어요", max: 14 },
  "result.save": { screen: "result", label: "저장 버튼", text: "사진 저장하기", max: 12 },
  "result.share": { screen: "result", label: "공유 버튼", text: "친구에게 공유하기", max: 12 },
  "result.cta": { screen: "result", label: "앱 안내 링크", text: "경찰과 도둑, 친구들이랑 직접 해보기", max: 24 },
} as const satisfies Record<string, CopyDef>;

export type CopyKey = keyof typeof COPY;
export const COPY_KEYS = Object.keys(COPY) as CopyKey[];
export const isCopyKey = (k: string): k is CopyKey => k in COPY;

export const VARIABLES = ["{행사 이름}", "{컷 수}"] as const;

/** 화면에 나갈 문구. 저장한 문구가 없으면 기본 문구, 바꿔 넣기를 채운다 */
export function copyText(copy: KioskConfig["copy"], key: CopyKey, vars: { name: string; cuts?: number }): string {
  const raw = copy[key] ?? COPY[key].text;
  return raw.replaceAll("{행사 이름}", vars.name).replaceAll("{컷 수}", String(vars.cuts ?? FRAME_SLOTS));
}

// ── 검사 ──

const pick = <T extends number>(v: unknown, choices: readonly T[], fallback: T): T => (choices.includes(v as T) ? (v as T) : fallback);
const LONG_DASH = /[–—]/;
const UNKNOWN_VAR = /\{[^}]*\}/g;

/** 저장소에서 읽은 값을 믿지 않고 모양을 맞춘다 */
export function normalizeKiosk(raw: unknown, fallback: KioskConfig = DEFAULT_KIOSK): KioskConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const copyIn = (r.copy && typeof r.copy === "object" ? r.copy : {}) as Record<string, unknown>;
  const copy: KioskConfig["copy"] = {};
  for (const [k, v] of Object.entries(copyIn)) {
    if (isCopyKey(k) && typeof v === "string" && v !== COPY[k].text) copy[k] = v.slice(0, COPY[k].max + 20);
  }
  const overscan = typeof r.overscan === "number" ? Math.round(r.overscan) : fallback.overscan;
  return {
    method: r.method === "print" || r.method === "qr" || r.method === "quick" ? r.method : fallback.method,
    receive: r.receive === "print" || r.receive === "qr" ? r.receive : fallback.receive,
    paper: r.paper === "postcard-pair" || r.paper === "strip-2x6" ? r.paper : fallback.paper,
    overscan: Math.min(OVERSCAN_RANGE.max, Math.max(OVERSCAN_RANGE.min, overscan)),
    autoPrint: typeof r.autoPrint === "boolean" ? r.autoPrint : fallback.autoPrint,
    shots: pick(r.shots, SHOT_CHOICES, fallback.shots as (typeof SHOT_CHOICES)[number]),
    countdown: pick(r.countdown, COUNTDOWN_CHOICES, fallback.countdown as (typeof COUNTDOWN_CHOICES)[number]),
    tapToShoot: typeof r.tapToShoot === "boolean" ? r.tapToShoot : fallback.tapToShoot,
    select: typeof r.select === "boolean" ? r.select : fallback.select,
    restartSec: pick(r.restartSec, RESTART_CHOICES, fallback.restartSec as (typeof RESTART_CHOICES)[number]),
    testPrinted: typeof r.testPrinted === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(r.testPrinted) ? r.testPrinted : null,
    copy,
    frames: Array.isArray(r.frames) ? r.frames.map(normalizeFrameRef).filter((f): f is FrameRef => f !== null).slice(0, 6) : fallback.frames,
    characters: normalizeCharacters(r.characters, fallback.characters),
  };
}

function normalizeCharacters(raw: unknown, fallback: KioskConfig["characters"]): KioskConfig["characters"] {
  if (!raw || typeof raw !== "object") return fallback;
  const r = raw as Record<string, unknown>;
  const one = (v: unknown): CharacterRef | null => {
    const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
    // 올린 그림(assets/character/...)이거나 코드에 든 그림(builtin/...)만
    const ok = typeof o.key === "string" && ((KEY_RE.test(o.key) && o.key.startsWith("assets/character/")) || builtinCharacter(o.key));
    const key = ok ? (o.key as string) : null;
    return key ? { key, label: typeof o.label === "string" ? o.label.slice(0, 20) : "캐릭터" } : null;
  };
  return { cop: one(r.cop), thief: one(r.thief) };
}

/** 저장하면 안 되는 문구. 문구 자리마다 쉬운 말 하나 */
export function validateCopy(copy: KioskConfig["copy"]): Partial<Record<CopyKey, string>> {
  const p: Partial<Record<CopyKey, string>> = {};
  for (const k of COPY_KEYS) {
    const v = copy[k];
    if (v === undefined) continue;
    const def = COPY[k];
    const lines = v.split("\n");
    if (!v.trim()) p[k] = "비워 둘 수 없어요. 기본 문구로 되돌려 주세요.";
    else if (lines.length > (("lines" in def && def.lines) || 1)) p[k] = `${("lines" in def && def.lines) || 1}줄까지 쓸 수 있어요.`;
    else if (lines.some((l) => l.length > def.max)) p[k] = `한 줄에 ${def.max}자까지예요. 넘으면 부스 화면에서 줄이 넘어가요.`;
    else if (LONG_DASH.test(v)) p[k] = "긴 대시(—, –) 대신 하이픈(-)을 써 주세요.";
    else {
      const unknown = (v.match(UNKNOWN_VAR) ?? []).filter((x) => !(VARIABLES as readonly string[]).includes(x));
      if (unknown.length) p[k] = `${unknown[0]}는 바꿔 넣을 수 없어요. ${VARIABLES.join(", ")}만 돼요.`;
    }
  }
  return p;
}

// ── 바뀐 것 ──

const RECEIVE_LABEL: Record<Receive, string> = { print: "인쇄하고 QR도", qr: "QR로만" };
const PAPER_LABEL: Record<Paper, string> = { "postcard-pair": "엽서에 2장", "strip-2x6": "2x6 스트립" };

/** 부스 설정 칸이 바꾸는 곳. 확인창과 칸 옆 표시가 같이 쓴다 */
export const KIOSK_WHERE: Record<Exclude<keyof KioskConfig, "copy" | "testPrinted" | "frames" | "characters">, { label: string; places: string[]; show: (k: KioskConfig) => string }> = {
  method: { label: "부스 방식", places: ["포토부스"], show: (k) => METHODS[k.method].name },
  receive: { label: "받는 방법", places: ["받기 화면", "인쇄"], show: (k) => RECEIVE_LABEL[k.receive] },
  paper: { label: "인쇄 용지", places: ["인쇄"], show: (k) => PAPER_LABEL[k.paper] },
  overscan: { label: "가장자리 보정", places: ["인쇄"], show: (k) => `${k.overscan}%` },
  autoPrint: { label: "저절로 인쇄", places: ["받기 화면", "인쇄"], show: (k) => (k.autoPrint ? "켬" : "끔") },
  shots: { label: "찍는 장수", places: ["찍기 화면"], show: (k) => `${k.shots}장` },
  countdown: { label: "한 장마다 기다리는 시간", places: ["찍기 화면"], show: (k) => `${k.countdown}초` },
  tapToShoot: { label: "화면 눌러 바로 찍기", places: ["찍기 화면"], show: (k) => (k.tapToShoot ? "켬" : "끔") },
  select: { label: "고르기 단계", places: ["고르기 화면"], show: (k) => (k.select ? "켬" : "끔(찍은 사진 그대로)") },
  restartSec: { label: "처음 화면으로 돌아가는 시간", places: ["받기 화면"], show: (k) => `${k.restartSec}초` },
};

export function diffKiosk(before: KioskConfig, after: KioskConfig) {
  const out: { key: string; label: string; before: string; after: string }[] = [];
  for (const k of Object.keys(KIOSK_WHERE) as (keyof typeof KIOSK_WHERE)[]) {
    if (before[k] !== after[k]) {
      const w = KIOSK_WHERE[k];
      out.push({ key: `kiosk.${k}`, label: `${w.label} · ${w.places.join(", ")}`, before: w.show(before), after: w.show(after) });
    }
  }
  const names = (k: KioskConfig) => framesOf(k).map((f) => f.label).join(", ");
  if (framesOf(before).map((f) => f.key).join() !== framesOf(after).map((f) => f.key).join()) {
    out.push({ key: "kiosk.frames", label: "쓸 프레임 · 고르기 화면, 인쇄, 손님 사진", before: names(before), after: names(after) });
  }
  for (const side of ["cop", "thief"] as const) {
    if (before.characters[side]?.key !== after.characters[side]?.key) {
      const label = (v: CharacterRef | null) => v?.label ?? BUILTIN_CHARACTERS[side].label;
      out.push({ key: `kiosk.characters.${side}`, label: `${side === "cop" ? "경찰" : "도둑"} 쪽 캐릭터 · 부스 화면, 손님 폰`, before: label(before.characters[side]), after: label(after.characters[side]) });
    }
  }
  if (before.testPrinted !== after.testPrinted) {
    out.push({ key: "kiosk.testPrinted", label: "시험 인쇄 확인 · 준비 점검", before: before.testPrinted ?? "안 함", after: after.testPrinted ?? "안 함" });
  }
  for (const k of COPY_KEYS) {
    const b = before.copy[k] ?? COPY[k].text;
    const a = after.copy[k] ?? COPY[k].text;
    const where = COPY[k].screen === "result" ? "손님 폰 사진 받기 페이지" : `포토부스 ${SCREEN_LABEL[COPY[k].screen]} 화면`;
    const oneLine = (t: string) => t.split("\n").join(" / ");
    if (a !== b) out.push({ key: `copy.${k}`, label: `${COPY[k].label} · ${where}`, before: oneLine(b), after: oneLine(a) });
  }
  return out;
}
