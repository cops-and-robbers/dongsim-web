// 포토부스 합성 코어 — 선택된 사진들을 프레임 슬롯에 cover-crop으로 깔고,
// 그 위에 프레임 PNG(투명 창 + 스티커)를 덮어 최종 스트립을 만든다. 좌표는 frames.ts.

import { DEFAULT_FRAME, type FrameDef, type FrameSlot } from "./frames";

/** 합성에 넣을 수 있는 이미지 소스(로드된 <img>, 캔버스, ImageBitmap). */
export type PhotoSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

function sourceSize(img: PhotoSource): { w: number; h: number } {
  if (img instanceof HTMLImageElement) {
    return { w: img.naturalWidth, h: img.naturalHeight };
  }
  return { w: img.width, h: img.height };
}

/** 슬롯을 꽉 채우도록 가운데 기준 cover-crop. mirror=true면 좌우 반전(셀카 보정). */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: PhotoSource,
  slot: FrameSlot,
  mirror: boolean
): void {
  const { w: iw, h: ih } = sourceSize(img);
  const scale = Math.max(slot.w / iw, slot.h / ih);
  const sw = slot.w / scale; // 원본에서 잘라낼 영역(가운데 정렬)
  const sh = slot.h / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;

  ctx.save();
  if (mirror) {
    ctx.translate(slot.x + slot.w, slot.y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, slot.w, slot.h);
  } else {
    ctx.drawImage(img, sx, sy, sw, sh, slot.x, slot.y, slot.w, slot.h);
  }
  ctx.restore();
}

// 프레임 이미지는 src별로 한 번만 로드해 캐시(프레임이 여러 개여도 안전).
const frameCache = new Map<string, Promise<HTMLImageElement>>();
function loadFrameImage(src: string): Promise<HTMLImageElement> {
  let p = frameCache.get(src);
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`프레임 이미지를 불러오지 못했습니다: ${src}`));
      img.src = src;
    });
    frameCache.set(src, p);
  }
  return p;
}

export type ComposeOptions = {
  /** 촬영 프리뷰가 셀카처럼 반전돼 있으면 true(출력도 반전 적용). 기본 false. */
  mirror?: boolean;
  /** 출력 MIME. 기본 image/jpeg(프레임이 전 영역 불투명이라 알파 불필요·용량 작음). */
  type?: string;
  /** JPEG 품질 0~1. 기본 0.92. */
  quality?: number;
};

/**
 * 선택된 사진들을 프레임에 합성해 Blob으로 반환.
 * @param photos 슬롯 순서(위→아래)대로 정렬. 길이는 frame.slots.length와 같아야 한다.
 * @param frame  사용할 프레임(기본: 유일 프레임).
 */
export async function composeStrip(
  photos: PhotoSource[],
  frame: FrameDef = DEFAULT_FRAME,
  opts: ComposeOptions = {}
): Promise<Blob> {
  if (photos.length !== frame.slots.length) {
    throw new Error(
      `사진은 ${frame.slots.length}장이어야 합니다(현재 ${photos.length}장).`
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D 컨텍스트를 만들 수 없습니다.");

  // 1) 사진을 먼저 슬롯에 깔고
  const mirror = opts.mirror ?? false;
  frame.slots.forEach((slot, i) => drawCover(ctx, photos[i], slot, mirror));
  // 2) 그 위에 프레임(테두리·타이틀·스티커)을 덮는다 — 투명창으로 사진이 비친다.
  const frameImg = await loadFrameImage(frame.src);
  ctx.drawImage(frameImg, 0, 0, frame.width, frame.height);

  const type = opts.type ?? "image/jpeg";
  const quality = opts.quality ?? 0.92;
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("이미지 인코딩에 실패했습니다."))),
      type,
      quality
    );
  });
}
