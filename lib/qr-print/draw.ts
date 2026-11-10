// QR 인쇄물을 캔버스에 그린다. 화면 미리보기와 PDF 가 같은 함수를 쓴다(크기만 다르다).
// 좌표는 원본 300dpi px(layout.ts)로 적고, scale 로 키우거나 줄인다.

import QRCode from "qrcode";
import {
  BACKGROUNDS,
  CENTER_X,
  COLORS,
  DOUBLE,
  PAGE,
  SINGLE,
  doubleCaptionTop,
  doubleLeftBlock,
  fitIcon,
  iconBox,
  iconSrc,
  linesOf,
  linkUrl,
  singleTitleTop,
  type Caption,
  type Sheet,
  type TextRule,
} from "./layout";

const PRETENDARD = '"Pretendard Variable"';
const PRETENDARD_CSS = "/fonts/pretendard/1.3.9/pretendardvariable-dynamic-subset.css";
/**
 * 디자이너가 쓴 제목 글꼴(카페24 아네모네 v2.0). SIL OFL 1.1, 웹과 인쇄물 모두 허용(public/fonts/cafe24-ohsquare/OFL.txt).
 * 카페24 공식 묶음의 웹폰트 파일을 고치지 않고 그대로 둔다
 */
export const TITLE_FONT_URL = "/fonts/cafe24-ohsquare/Cafe24Ohsquare-v2.0.woff2";
const TITLE_FAMILY = '"Cafe24 Ohsquare"';

export type Fonts = { title: string; caption: string; titleFallback: boolean };

let fontsPromise: Promise<Fonts> | null = null;

/** Pretendard 는 사이트가 늦게 붙이는 스타일시트에 있다. 아직 없으면 붙이고 다 읽을 때까지 기다린다 */
async function ensurePretendardCss(): Promise<void> {
  if (document.querySelector(`link[href="${PRETENDARD_CSS}"]`)) return;
  await new Promise<void>((resolve) => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = PRETENDARD_CSS;
    l.onload = () => resolve();
    l.onerror = () => resolve();
    document.head.appendChild(l);
  });
}

/** 제목 글꼴 파일이 없거나 못 읽으면 Pretendard Black 으로 대신 그린다 */
export function loadFonts(): Promise<Fonts> {
  fontsPromise ??= (async () => {
    await ensurePretendardCss();
    let titleFallback = true;
    try {
      const face = new FontFace("Cafe24 Ohsquare", `url(${TITLE_FONT_URL})`);
      document.fonts.add(await face.load());
      titleFallback = false;
    } catch {
      // 파일이 아직 없다
    }
    return {
      title: titleFallback ? `900 {size}px ${PRETENDARD}` : `400 {size}px ${TITLE_FAMILY}`,
      caption: `700 {size}px ${PRETENDARD}`,
      titleFallback,
    };
  })();
  return fontsPromise;
}

/** 쓸 글자의 Pretendard 조각(dynamic subset)을 미리 받는다. 안 받으면 처음 그릴 때 대체 글꼴로 나온다 */
export async function preloadText(fonts: Fonts, texts: string[]): Promise<void> {
  const all = texts.join("") + "가경QR";
  await Promise.all([
    document.fonts.load(fonts.title.replace("{size}", "40"), all),
    document.fonts.load(fonts.caption.replace("{size}", "40"), all),
  ]).catch(() => undefined);
}

const images = new Map<string, Promise<HTMLImageElement | null>>();

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  let p = images.get(src);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
    images.set(src, p);
  }
  return p;
}

/** 아이콘 그림의 원래 비율. SVG 는 naturalWidth 가 0 일 수 있어 viewBox 비율이 들어간 width/height 를 쓴다 */
const sizeOf = (img: HTMLImageElement) => ({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });

type Ctx = CanvasRenderingContext2D;

/** 한글 잉크 높이가 rule.ink 가 되는 글꼴 크기와, 잉크 윗선에서 기준선까지 거리 */
function fontFor(ctx: Ctx, template: string, ink: number): { font: string; ascent: number; size: number } {
  const probe = 100;
  ctx.font = template.replace("{size}", String(probe));
  const m = ctx.measureText("경찰과도둑");
  const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent || probe * 0.9;
  const size = (probe * ink) / h;
  return { font: template.replace("{size}", size.toFixed(2)), ascent: (m.actualBoundingBoxAscent * size) / probe, size };
}

type Run = { text: string; color: string };

/** 그린 결과에서 사람이 알아야 할 것: 너무 작아진 줄, 너무 촘촘한 QR */
export type DrawReport = {
  /** 폭이 넘쳐 줄인 줄. k 는 원래 크기 대비 비율 */
  shrunk: { where: string; text: string; k: number }[];
  /** QR 한 칸 크기(mm). 작을수록 멀리서 안 읽힌다 */
  qr: { where: string; modules: number; moduleMm: number }[];
};

/** 이보다 작게 줄어든 줄은 화면에서 알려 준다 */
export const SHRINK_WARN = 0.8;
/** QR 한 칸이 이보다 작으면 알려 준다. 폰 카메라로 30cm 안쪽에서 읽히는 선(ISO/IEC 18004 권장 X 치수 0.5mm 근처) */
export const MODULE_WARN_MM = 0.6;

/** 자간을 넣은 폭. 캔버스 letterSpacing 은 마지막 글자 뒤에도 붙으니 하나 뺀다 */
function widthOf(ctx: Ctx, runs: Run[], spacing: number): number {
  return runs.reduce((s, r) => s + ctx.measureText(r.text).width, 0) - (runs.some((r) => r.text) ? spacing : 0);
}

function setFont(ctx: Ctx, template: string, size: number, rule: TextRule): number {
  ctx.font = template.replace("{size}", size.toFixed(2));
  const spacing = size * rule.tracking;
  ctx.letterSpacing = `${spacing.toFixed(2)}px`;
  return spacing;
}

/**
 * 여러 색 조각으로 된 한 줄을 cx 가운데에 맞춰 그린다. 폭이 넘치면 그 줄 글자를 줄이고 비율을 돌려준다.
 * fixedK 를 주면 그 비율로 그리고 잉크 윗선을 inkTop 에 맞춘다(제목 묶음을 한꺼번에 줄일 때)
 */
function drawLine(ctx: Ctx, runs: Run[], cx: number, inkTop: number, template: string, rule: TextRule, fixedK?: number): number {
  const base = fontFor(ctx, template, rule.ink);
  let spacing = setFont(ctx, template, base.size, rule);
  let w = widthOf(ctx, runs, spacing);
  // 넘치면 줄인다. 혼자 줄인 줄은 잉크가 낮아지니 원래 줄 자리의 세로 가운데에 둔다
  const k = fixedK ?? (w > rule.maxWidth ? rule.maxWidth / w : 1);
  if (k < 1) {
    spacing = setFont(ctx, template, base.size * k, rule);
    w = widthOf(ctx, runs, spacing);
  }
  const baseline = inkTop + (fixedK === undefined ? (rule.ink * (1 - k)) / 2 : 0) + base.ascent * k;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  let x = cx - w / 2;
  for (const r of runs) {
    ctx.fillStyle = r.color;
    ctx.fillText(r.text, x, baseline);
    x += ctx.measureText(r.text).width;
  }
  ctx.letterSpacing = "0px";
  return k;
}

/**
 * 제목 줄 나누기. 둘째 줄이 비어 있고 첫 줄이 넘치면 가운데에 가장 가까운 띄어쓰기에서 나눈다.
 * 사람이 두 줄로 나눠 쓴 건 그대로 둔다(디자이너도 뜻 단위로 끊었다)
 */
export function wrapTitle(ctx: Ctx, lines: string[], template: string, rule: TextRule): string[] {
  if (lines.length !== 1) return lines;
  const spacing = setFont(ctx, template, fontFor(ctx, template, rule.ink).size, rule);
  const one = lines[0];
  const fits = widthOf(ctx, [{ text: one, color: "" }], spacing) <= rule.maxWidth;
  ctx.letterSpacing = "0px";
  if (fits) return lines;
  const spaces = [...one.matchAll(/ /g)].map((m) => m.index!);
  if (spaces.length === 0) return lines;
  const mid = one.length / 2;
  const at = spaces.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a));
  return [one.slice(0, at).trim(), one.slice(at + 1).trim()].filter(Boolean);
}

/** 제목 묶음을 줄일 비율. 가장 넘치는 줄에 맞춰 모든 줄을 같은 크기로 줄인다(디자이너 원본의 인스타 제목이 이렇다) */
export function titleScale(ctx: Ctx, lines: string[], template: string, rule: TextRule): number {
  const spacing = setFont(ctx, template, fontFor(ctx, template, rule.ink).size, rule);
  const widest = Math.max(0, ...lines.map((l) => widthOf(ctx, [{ text: l, color: "" }], spacing)));
  ctx.letterSpacing = "0px";
  return widest > rule.maxWidth ? rule.maxWidth / widest : 1;
}

function drawTitle(ctx: Ctx, lines: string[], k: number, cx: number, top: number, fonts: Fonts, rule: TextRule, where: string, report: DrawReport) {
  lines.forEach((l, i) => drawLine(ctx, [{ text: l, color: COLORS.title }], cx, top + i * rule.pitch * k, fonts.title, rule, k));
  if (k < SHRINK_WARN) report.shrunk.push({ where: `${where}제목`, text: lines.join(" "), k });
}

function drawCaption(ctx: Ctx, c: Caption, cx: number, top: number, fonts: Fonts, rule: TextRule, where: string, report: DrawReport) {
  const lines: { runs: Run[]; name: string }[] = [];
  if (c.first.trim()) lines.push({ runs: [{ text: c.first.trim(), color: COLORS.caption }], name: "첫 줄" });
  const second = [
    { text: c.highlight, color: COLORS.highlight },
    { text: c.rest, color: COLORS.caption },
  ].filter((r) => r.text.length > 0);
  if (second.some((r) => r.text.trim())) lines.push({ runs: second, name: "둘째 줄" });
  // 한 줄만 있으면 두 줄 자리의 가운데에 둔다. QR 에서 너무 멀어지지 않게
  const start = lines.length === 1 ? top + rule.pitch / 2 : top;
  lines.forEach(({ runs, name }, i) => {
    const k = drawLine(ctx, runs, cx, start + i * rule.pitch, fonts.caption, rule);
    if (k < SHRINK_WARN) report.shrunk.push({ where: `${where}안내 ${name}`, text: runs.map((r) => r.text).join(""), k });
  });
}

/** QR 점을 사각형으로 그린다. 점 영역이 정확히 size 가 되게(둘레 여백은 바탕의 흰 칸이 맡는다) */
function drawQr(ctx: Ctx, text: string, cx: number, cy: number, size: number, where: string, report: DrawReport) {
  const x0 = cx - size / 2;
  const y0 = cy - size / 2;
  if (!text) {
    ctx.save();
    ctx.strokeStyle = "#C9D6E2";
    ctx.setLineDash([14, 10]);
    ctx.lineWidth = 4;
    ctx.strokeRect(x0 + 2, y0 + 2, size - 4, size - 4);
    ctx.restore();
    return;
  }
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const cell = size / n;
  report.qr.push({ where, modules: n, moduleMm: (cell / PAGE.dpi) * 25.4 });
  ctx.fillStyle = "#000000";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!qr.modules.get(r, c)) continue;
      // 이웃 칸과 틈이 생기지 않게 조금 겹쳐 칠한다
      ctx.fillRect(x0 + c * cell, y0 + r * cell, cell + 0.02, cell + 0.02);
    }
  }
}

export type DrawInput = { sheet: Sheet; siteUrl: string; fonts: Fonts };

/** 캔버스 크기는 PAGE x scale 로 맞춰 두고 부른다 */
export async function drawSheet(ctx: Ctx, scale: number, { sheet, siteUrl, fonts }: DrawInput): Promise<DrawReport> {
  const report: DrawReport = { shrunk: [], qr: [] };
  const bg = await loadImage(sheet.layout === "single" ? BACKGROUNDS.single : BACKGROUNDS.double);
  const icons = sheet.layout === "double" ? await Promise.all(sheet.rows.map((r) => (iconSrc(r.icon) ? loadImage(iconSrc(r.icon)!) : null))) : [];

  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PAGE.width, PAGE.height);
  if (bg) ctx.drawImage(bg, 0, 0, PAGE.width, PAGE.height);

  if (sheet.layout === "single") {
    const title = wrapTitle(ctx, linesOf(sheet.title), fonts.title, SINGLE.title);
    const k = titleScale(ctx, title, fonts.title, SINGLE.title);
    drawTitle(ctx, title, k, CENTER_X, singleTitleTop(title.length, k), fonts, SINGLE.title, "", report);
    drawQr(ctx, linkUrl(sheet.link, siteUrl), SINGLE.qr.cx, SINGLE.qr.cy, SINGLE.qr.size, "QR", report);
    drawCaption(ctx, sheet.caption, CENTER_X, SINGLE.captionTop, fonts, SINGLE.caption, "", report);
  } else {
    sheet.rows.forEach((row, i) => {
      const where = i === 0 ? "위 칸 " : "아래 칸 ";
      const cy = DOUBLE.rows[i];
      const img = icons[i];
      const fit = img ? fitIcon(sizeOf(img).w, sizeOf(img).h, iconBox(row.icon)) : { width: 0, height: 0 };
      const title = wrapTitle(ctx, linesOf(row.title), fonts.title, DOUBLE.title);
      const k = titleScale(ctx, title, fonts.title, DOUBLE.title);
      const block = doubleLeftBlock(cy, fit.height, title.length, k);
      if (img) ctx.drawImage(img, DOUBLE.leftX - fit.width / 2, block.iconTop, fit.width, fit.height);
      drawTitle(ctx, title, k, DOUBLE.leftX, block.titleTop, fonts, DOUBLE.title, where, report);
      drawQr(ctx, linkUrl(row.link, siteUrl), DOUBLE.qr.cx, cy, DOUBLE.qr.size, `${where}QR`, report);
      drawCaption(ctx, row.caption, DOUBLE.qr.cx, doubleCaptionTop(cy), fonts, DOUBLE.caption, where, report);
    });
  }
  ctx.restore();
  return report;
}

/** 이 인쇄물에 들어가는 글자 전부(글꼴 조각을 미리 받으려고) */
export function textsOf(sheet: Sheet): string[] {
  const cap = (c: Caption) => [c.first, c.highlight, c.rest];
  return sheet.layout === "single" ? [...sheet.title, ...cap(sheet.caption)] : sheet.rows.flatMap((r) => [...r.title, ...cap(r.caption)]);
}
