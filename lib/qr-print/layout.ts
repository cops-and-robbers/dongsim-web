// QR 인쇄물 템플릿 규칙 (docs/qr-print.md).
// 디자이너 원본 PNG 4장(1241 x 1754px, 300dpi, A6)을 재서 정한 값이다. 좌표는 모두 그 원본 px.
// 틀, 무늬, QR 뒤를 비운 칸, 캐릭터, 로고는 바탕 그림(public/qr-print/bg-*.png)에 이미 그려져 있고,
// 여기서는 그 위에 얹는 글자, 아이콘, QR 의 자리만 정한다.

export const PAGE = { width: 1241, height: 1754, dpi: 300, mmWidth: 105, mmHeight: 148.5 } as const;

/** 가운데 축(흰 카드 가운데) */
export const CENTER_X = 620;

export const COLORS = {
  title: "#4294D0",
  caption: "#000000",
  highlight: "#2786C8",
} as const;

export const BACKGROUNDS = {
  single: "/qr-print/bg-single.png",
  double: "/qr-print/bg-double.png",
} as const;

/**
 * 글자 크기는 글꼴 크기가 아니라 "한글이 실제로 칠해지는 높이"로 정한다.
 * 원본 글꼴과 대신 쓰는 글꼴의 비율이 달라도 같은 높이로 맞추려고. 그릴 때 이 높이가 되는 글꼴 크기를 잰다
 */
export type TextRule = {
  /** 한글 잉크 높이 px */
  ink: number;
  /** 다음 줄 잉크 윗선까지 px */
  pitch: number;
  /** 줄 폭이 이보다 넓으면 글자를 줄인다 */
  maxWidth: number;
  /** 자간(글자 크기 대비). 원본 줄 폭을 같은 글꼴 폭과 비교해 잰 값 */
  tracking: number;
};

export const SINGLE = {
  title: { ink: 72, pitch: 102, maxWidth: 940, tracking: 0.028 } satisfies TextRule,
  /** 제목 두 줄의 첫 줄 잉크 윗선. 한 줄이면 두 줄 묶음의 가운데에 둔다 */
  titleTop: 269,
  /** QR 점 영역(둘레 여백 없이). 뒤의 흰 칸은 바탕에 그려져 있다(사방 25px, 한 변의 4.6%) */
  qr: { cx: CENTER_X, cy: 823, size: 540 },
  caption: { ink: 35, pitch: 47, maxWidth: 960, tracking: 0.028 } satisfies TextRule,
  captionTop: 1152,
} as const;

export const DOUBLE = {
  /** 두 칸의 가운데 높이 */
  rows: [517, 1156] as const,
  /** 왼쪽 묶음(아이콘 + 제목) 가운데 x */
  leftX: 364,
  /** 아이콘이 들어가는 칸. 비율을 지켜 이 안에 맞춘다 */
  icon: { width: 117, height: 112 },
  /** 아이콘 아래와 제목 한글 윗선 사이. 원본 유튜브 칸 47, 인스타 칸 53 의 가운데 */
  iconGap: 48,
  title: { ink: 70, pitch: 98, maxWidth: 450, tracking: 0 } satisfies TextRule,
  qr: { cx: 881, size: 340 },
  /** QR 아랫선에서 안내 첫 줄 잉크 윗선까지 */
  captionGap: 44,
  caption: { ink: 22, pitch: 30, maxWidth: 400, tracking: 0.028 } satisfies TextRule,
} as const;

/** 안내 문구 둘째 줄은 앞부분을 파랗게 강조한다. "이벤트용 게임방" + "으로 이동합니다." */
export type Caption = { first: string; highlight: string; rest: string };

export type IconChoice =
  | { kind: "builtin"; id: BuiltinIconId }
  | { kind: "upload"; dataUrl: string; name: string }
  | { kind: "none" };

export type LinkChoice = { kind: "event"; code: string } | { kind: "url"; url: string };

export type SingleSheet = {
  layout: "single";
  title: [string, string];
  caption: Caption;
  link: LinkChoice;
};

export type DoubleRow = {
  icon: IconChoice;
  title: [string, string];
  caption: Caption;
  link: LinkChoice;
};

export type DoubleSheet = { layout: "double"; rows: [DoubleRow, DoubleRow] };

export type Sheet = SingleSheet | DoubleSheet;

// 아이콘. 브랜드 마크는 Simple Icons(CC0) 원본 모양, 기본 아이콘은 Lucide(ISC) 원본 모양을 앱 아이콘처럼 둥근 네모에 올렸다.
// 인스타그램, 유튜브는 디자이너 원본 아이콘에 맞춰 그렸다. 브랜드 마크는 그 서비스로 가는 QR 에만 쓴다
export const ICON_GROUPS = [
  { id: "sns", label: "SNS" },
  { id: "store", label: "스토어, 앱" },
  { id: "basic", label: "기본" },
  { id: "character", label: "캐릭터" },
] as const;

const icon = (id: string, label: string, group: (typeof ICON_GROUPS)[number]["id"], src = `/qr-print/icons/${id}.svg`) => ({ id, label, group, src }) as const;

export const BUILTIN_ICONS = [
  icon("instagram", "인스타그램", "sns"),
  icon("youtube", "유튜브", "sns"),
  icon("tiktok", "틱톡", "sns"),
  icon("x", "X", "sns"),
  icon("threads", "스레드", "sns"),
  icon("facebook", "페이스북", "sns"),
  icon("kakao", "카카오톡", "sns"),
  icon("naver", "네이버", "sns"),
  icon("discord", "디스코드", "sns"),
  icon("linktree", "링크트리", "sns"),
  icon("appstore", "App Store", "store"),
  icon("googleplay", "Google Play", "store"),
  icon("app", "경찰과도둑 앱", "store", "/brand/app-icon.png"),
  icon("googleforms", "구글 폼", "basic"),
  icon("clipboard", "신청서", "basic"),
  icon("globe", "웹사이트", "basic"),
  icon("ticket", "행사", "basic"),
  icon("gift", "경품", "basic"),
  icon("calendar", "일정", "basic"),
  icon("map-pin", "장소", "basic"),
  icon("police", "냥파", "character", "/characters/police.svg"),
  icon("robber", "도둥이", "character", "/characters/robber.svg"),
  icon("police-chase", "냥파 추격", "character", "/characters/police-chase.svg"),
  icon("robber-flee", "도둥이 도망", "character", "/characters/robber-flee.svg"),
] as const;

export type BuiltinIconId = (typeof BUILTIN_ICONS)[number]["id"];

export const iconSrc = (icon: IconChoice): string | null =>
  icon.kind === "builtin" ? (BUILTIN_ICONS.find((i) => i.id === icon.id)?.src ?? null) : icon.kind === "upload" ? icon.dataUrl : null;

/** 캐릭터 그림은 둘레 여백이 넓어 같은 칸에 넣으면 작아 보인다. 칸을 이만큼 키운다 */
export const CHARACTER_SCALE = 1.5;

export const iconBox = (icon: IconChoice) => {
  const character = icon.kind === "builtin" && BUILTIN_ICONS.find((i) => i.id === icon.id)?.group === "character";
  const k = character ? CHARACTER_SCALE : 1;
  return { width: DOUBLE.icon.width * k, height: DOUBLE.icon.height * k };
};

/** 아이콘을 비율대로 칸 안에 맞춘 크기 */
export function fitIcon(w: number, h: number, box: { width: number; height: number } = DOUBLE.icon): { width: number; height: number } {
  if (w <= 0 || h <= 0) return { width: 0, height: 0 };
  const s = Math.min(box.width / w, box.height / h);
  return { width: w * s, height: h * s };
}

/** 빈 줄을 빼고 남은 줄 */
export const linesOf = (pair: readonly string[]): string[] => pair.map((l) => l.trim()).filter(Boolean);

/**
 * 글자 묶음의 잉크 높이: 첫 줄 윗선부터 마지막 줄 아랫선까지.
 * k 는 넘쳐서 줄인 비율. 글자와 줄 간격을 같은 비율로 줄인다(디자이너 원본의 인스타 제목이 이렇게 줄어 있다)
 */
export const blockHeight = (lines: number, rule: TextRule, k = 1): number => (lines <= 0 ? 0 : ((lines - 1) * rule.pitch + rule.ink) * k);

/** 한 개짜리 제목 첫 줄 윗선. 한 줄이면 두 줄 자리의 가운데에 둔다 */
export function singleTitleTop(lines: number, k = 1): number {
  const full = blockHeight(2, SINGLE.title);
  return SINGLE.titleTop + (full - blockHeight(lines, SINGLE.title, k)) / 2;
}

/**
 * 두 개짜리 왼쪽 묶음(아이콘 + 제목)의 세로 자리. 묶음 가운데가 그 칸 QR 가운데와 같다.
 * 원본 두 칸 모두 이 규칙으로 놓여 있다(인스타 묶음 360-680 가운데 520, QR 가운데 517)
 */
export function doubleLeftBlock(rowCy: number, iconHeight: number, titleLines: number, k = 1) {
  const title = blockHeight(titleLines, DOUBLE.title, k);
  const gap = iconHeight > 0 && title > 0 ? DOUBLE.iconGap : 0;
  const total = iconHeight + gap + title;
  const top = rowCy - total / 2;
  return { iconTop: top, titleTop: top + iconHeight + gap };
}

export const doubleCaptionTop = (rowCy: number) => rowCy + DOUBLE.qr.size / 2 + DOUBLE.captionGap;

/** 링크가 가리키는 실제 주소. 행사 링크는 짧은 주소 /q/<코드> 로 */
export function linkUrl(link: LinkChoice, siteUrl: string): string {
  if (link.kind === "event") return link.code ? `${siteUrl}/q/${link.code}` : "";
  return normalizeUrl(link.url);
}

/** 사람이 친 주소를 QR 에 담을 주소로. 앞뒤 공백을 빼고, 프로토콜이 없으면 https 를 붙인다 */
export function normalizeUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  return /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
}

/** 열 수 있는 주소인지. http(s) 만 받는다 */
export function isOpenableUrl(raw: string): boolean {
  const v = normalizeUrl(raw);
  if (!v) return false;
  try {
    const u = new URL(v);
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".");
  } catch {
    return false;
  }
}

// ── 처음 고르는 틀. 디자이너 원본 4장의 문구 그대로 ──

const caption = (highlight: string, rest = "로 이동합니다."): Caption => ({ first: "QR코드 인식 시", highlight, rest });

export type PresetId = "app" | "home" | "event" | "sns";

export function preset(id: PresetId, urls: { site: string; instagram: string; youtube: string }): Sheet {
  switch (id) {
    case "app":
      return { layout: "single", title: ["‘경찰과도둑’ 앱", "다운로드 QR"], caption: caption("앱 다운로드 페이지"), link: { kind: "url", url: `${urls.site}/download` } };
    case "home":
      return { layout: "single", title: ["‘경찰과도둑’", "홈페이지 QR"], caption: caption("‘경찰과도둑’ 홈페이지"), link: { kind: "url", url: urls.site } };
    case "event":
      return { layout: "single", title: ["서울게임타운", "수사 이벤트 참가 QR"], caption: caption("이벤트용 게임방", "으로 이동합니다."), link: { kind: "event", code: "" } };
    case "sns":
      return {
        layout: "double",
        rows: [
          { icon: { kind: "builtin", id: "instagram" }, title: ["‘경찰과도둑’", "인스타그램 QR"], caption: caption("‘경찰과도둑’ 인스타그램"), link: { kind: "url", url: urls.instagram } },
          { icon: { kind: "builtin", id: "youtube" }, title: ["‘경찰과도둑’", "유튜브 QR"], caption: caption("‘경찰과도둑’ 유튜브"), link: { kind: "url", url: urls.youtube } },
        ],
      };
  }
}

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: "app", label: "앱 다운로드" },
  { id: "home", label: "홈페이지" },
  { id: "event", label: "행사 참가" },
  { id: "sns", label: "SNS 두 개" },
];
