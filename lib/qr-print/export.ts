// 인쇄용 파일 만들기. 화면 미리보기와 같은 drawSheet 를 크게 그려서 받는다.

import { drawSheet, type DrawInput } from "./draw";
import { PAGE } from "./layout";
import { jpegToPdf } from "./pdf";

/** 600dpi. 원본(300dpi)보다 두 배로 그려 글자와 QR 가장자리를 또렷하게 한다 */
const PRINT_SCALE = 2;

/** 테두리 파랑. 재단 여백은 이 색으로 바깥까지 이어 칠한다 */
const FRAME = "#4294D0";

/**
 * bleedMm: 재단 여백. 인쇄소는 종이를 자를 때 1-2mm 밀릴 수 있어, 바깥 테두리 색을 그만큼 더 칠해 둔 파일을 받는다.
 * 테두리가 단색이라 바깥으로 늘려도 모양이 바뀌지 않는다. 0 이면 완성 크기 그대로
 */
async function render(input: DrawInput, scale: number, bleedMm = 0): Promise<HTMLCanvasElement> {
  const pad = Math.round((bleedMm / 25.4) * PAGE.dpi * scale);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(PAGE.width * scale) + pad * 2;
  canvas.height = Math.round(PAGE.height * scale) + pad * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이 브라우저에서는 그림을 만들 수 없어요.");
  ctx.fillStyle = FRAME;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // drawSheet 는 setTransform 으로 배율을 정한다. 쪽은 따로 그려 여백 안쪽에 붙인다
  const page = document.createElement("canvas");
  page.width = Math.round(PAGE.width * scale);
  page.height = Math.round(PAGE.height * scale);
  const pctx = page.getContext("2d");
  if (!pctx) throw new Error("이 브라우저에서는 그림을 만들 수 없어요.");
  await drawSheet(pctx, scale, input);
  ctx.drawImage(page, pad, pad);
  return canvas;
}

const blobOf = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("파일을 만들지 못했어요."))), type, quality));

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** 파일 이름에 못 쓰는 글자를 뺀다 */
export const fileBase = (title: string) =>
  `qr-${
    title
      .replace(/[‘’'"\\/:*?<>|]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 40) || "print"
  }`;

/** A6(105 x 148.5mm) 한 쪽 PDF. 재단 여백을 넣으면 쪽이 사방으로 그만큼 커진다 */
export async function downloadPdf(input: DrawInput, name: string, bleedMm = 0): Promise<void> {
  const canvas = await render(input, PRINT_SCALE, bleedMm);
  const jpeg = new Uint8Array(await (await blobOf(canvas, "image/jpeg", 0.97)).arrayBuffer());
  const pdf = jpegToPdf({ jpeg, width: canvas.width, height: canvas.height }, { width: PAGE.mmWidth + bleedMm * 2, height: PAGE.mmHeight + bleedMm * 2 }, name);
  save(new Blob([pdf as BlobPart], { type: "application/pdf" }), `${name}.pdf`);
}

/** 같은 크기 PNG. 메신저로 시안을 보낼 때 */
export async function downloadPng(input: DrawInput, name: string, bleedMm = 0): Promise<void> {
  const canvas = await render(input, PRINT_SCALE, bleedMm);
  save(await blobOf(canvas, "image/png"), `${name}.png`);
}
