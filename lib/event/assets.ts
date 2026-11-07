/**
 * 포토부스 그림 보관함 (#224). 프레임과 캐릭터를 한곳에 올려 두고 행사마다 골라 쓴다.
 *
 * 파일은 팀 R2 photobooth 버킷의 assets/ 에 둔다(손님 사진 strips/ 만 7일 뒤 지워지는 규칙이라 안전하다).
 * 사이트 주소(/photobooth/asset/...)로 거쳐 내려준다. 부스는 프레임을 canvas 에 그려 합성하는데, 다른 주소의 그림이면
 * 버킷 CORS 에 그 주소가 있어야 하고 어드민 주소는 없다. 같은 주소면 그런 걱정이 없다.
 *
 * 프레임은 올릴 때 브라우저가 투명한 사진 칸을 재서 함께 저장한다. 예전에는 개발자가 scripts/render-frame.mjs 로 쟀다.
 * 이 파일은 순수 함수만 둔다(화면, 서버, 테스트가 같이 쓴다).
 */

export type AssetKind = "frame" | "character";
export type Side = "cop" | "thief";
export type Slot = { x: number; y: number; w: number; h: number };

/** 행사가 쓰는 프레임. 보관함 줄을 그대로 옮겨 적어 두어 부스가 저장소를 다시 읽지 않아도 된다 */
export type FrameRef = { key: string; label: string; width: number; height: number; slots: Slot[]; swatch: string };

export type Asset = {
  id: number;
  kind: AssetKind;
  key: string;
  label: string;
  /** 프레임: 크기, 칸, 대표색. 캐릭터: 어느 쪽인지 */
  meta: { width: number; height: number; slots?: Slot[]; swatch?: string; side?: Side };
  createdBy: string;
  createdAt: string;
  archived: boolean;
};

/** 지금 부스 인쇄(엽서 반쪽, 2x6 스트립)가 1:3 세로 그림을 전제한다. 크기를 하나로 고정한다 */
export const FRAME_SIZE = { width: 1800, height: 5400 } as const;
export const MAX_BYTES = { frame: 4 * 1024 * 1024, character: 1024 * 1024 } as const;
export const FRAME_TYPES = ["image/png"] as const;
export const CHARACTER_TYPES = ["image/png", "image/webp"] as const;

export const KEY_RE = /^assets\/(frame|character)\/[a-z0-9-]+\.(png|webp)$/;
export const assetUrl = (key: string) => `/photobooth/${key.replace(/^assets\//, "asset/")}`;

/** 기본으로 들어 있는 그림. 보관함에 늘 보이고 지울 수 없다 */
export const BUILTIN_FRAME: FrameRef = {
  key: "builtin/green",
  label: "연두(기본)",
  width: 1800,
  height: 5400,
  slots: [
    { x: 106, y: 147, w: 1588, h: 1117 },
    { x: 106, y: 1388, w: 1588, h: 1117 },
    { x: 106, y: 2629, w: 1588, h: 1117 },
    { x: 106, y: 3871, w: 1588, h: 1117 },
  ],
  swatch: "#E1ECCF",
};
export const BUILTIN_CHARACTERS: Record<Side, { label: string; src: string }> = {
  cop: { label: "냥파 교수(기본)", src: "/photobooth/cop-professor.svg" },
  thief: { label: "도둥이(기본)", src: "/photobooth/thief-runaway.svg" },
};
export const frameSrc = (f: FrameRef) => (f.key === BUILTIN_FRAME.key ? "/photobooth/frame-green.png" : assetUrl(f.key));

// ── 프레임 재기 ──

export type Pixels = { width: number; height: number; data: Uint8ClampedArray | Uint8Array };

const TRANSPARENT = 10;

/**
 * 투명한 사진 칸을 찾는다. 투명한 점끼리 이어진 덩어리마다 바깥 테두리 상자를 칸으로 본다.
 * 칸 위에 걸친 장식(스티커, 로고)은 덩어리 안쪽을 가릴 뿐 바깥 테두리는 그대로라 칸이 작게 잡히지 않는다.
 * 사진은 프레임 아래에 깔리니 장식 밑까지 사진이 들어가도 괜찮다. 4px 격자로 재서 오차는 4px 안이다
 */
export function findSlots(p: Pixels, step = 4): Slot[] {
  const { width: W, height: H, data } = p;
  const gw = Math.ceil(W / step);
  const gh = Math.ceil(H / step);
  const clear = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    const y = Math.min(H - 1, gy * step + (step >> 1));
    for (let gx = 0; gx < gw; gx++) {
      const x = Math.min(W - 1, gx * step + (step >> 1));
      clear[gy * gw + gx] = data[(y * W + x) * 4 + 3] < TRANSPARENT ? 1 : 0;
    }
  }
  const seen = new Uint8Array(gw * gh);
  const queue = new Int32Array(gw * gh);
  const slots: Slot[] = [];
  for (let start = 0; start < gw * gh; start++) {
    if (!clear[start] || seen[start]) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    seen[start] = 1;
    let minX = gw;
    let maxX = -1;
    let minY = gh;
    let maxY = -1;
    let count = 0;
    while (head < tail) {
      const c = queue[head++];
      const cx = c % gw;
      const cy = (c - cx) / gw;
      count++;
      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;
      const next = [cx > 0 ? c - 1 : -1, cx < gw - 1 ? c + 1 : -1, cy > 0 ? c - gw : -1, cy < gh - 1 ? c + gw : -1];
      for (const n of next) {
        if (n >= 0 && clear[n] && !seen[n]) {
          seen[n] = 1;
          queue[tail++] = n;
        }
      }
    }
    // 그림 가장자리에 닿은 투명 영역은 칸이 아니라 바깥 여백, 작은 덩어리는 장식 틈
    const touchesEdge = minX === 0 || minY === 0 || maxX === gw - 1 || maxY === gh - 1;
    if (touchesEdge || count * step * step < W * H * 0.02) continue;
    slots.push({ x: minX * step, y: minY * step, w: (maxX - minX + 1) * step, h: (maxY - minY + 1) * step });
  }
  return slots.sort((a, b) => a.y - b.y);
}

/** 대표색: 가장자리 띠의 불투명한 점 평균. 인쇄할 때 테두리 없는 확대로 생기는 가장자리를 이 색으로 채운다 */
export function edgeColor(p: Pixels, band = 24): string {
  const { width: W, height: H, data } = p;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const add = (x: number, y: number) => {
    const i = (y * W + x) * 4;
    if (data[i + 3] < 200) return;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  };
  for (let y = 0; y < H; y += 4) {
    for (let x = 0; x < band; x += 4) {
      add(x, y);
      add(W - 1 - x, y);
    }
  }
  if (!n) return "#FFFFFF";
  const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
}

export type FrameCheck = { id: string; ok: boolean; level: "error" | "warn"; text: string };

/** 올리기 전 검사. error 가 하나라도 있으면 올리지 못한다 */
export function checkFrame(p: Pick<Pixels, "width" | "height">, slots: Slot[], bytes: number, type: string): FrameCheck[] {
  const out: FrameCheck[] = [];
  out.push({ id: "type", ok: (FRAME_TYPES as readonly string[]).includes(type), level: "error", text: "PNG 파일(투명한 칸이 있어야 해서)" });
  out.push({
    id: "size",
    ok: p.width === FRAME_SIZE.width && p.height === FRAME_SIZE.height,
    level: "error",
    text: `크기 ${FRAME_SIZE.width} x ${FRAME_SIZE.height}px${p.width === FRAME_SIZE.width && p.height === FRAME_SIZE.height ? "" : ` (지금 ${p.width} x ${p.height}px)`}`,
  });
  out.push({ id: "bytes", ok: bytes <= MAX_BYTES.frame, level: "error", text: `파일 크기 ${Math.round(bytes / 1024)}KB (4MB 까지)` });
  out.push({ id: "slots", ok: slots.length >= 1 && slots.length <= 6, level: "error", text: slots.length ? `투명한 사진 칸 ${slots.length}개, 위에서 아래로` : "투명한 사진 칸을 찾지 못했어요" });
  if (slots.length > 1) {
    const r0 = slots[0].w / slots[0].h;
    const same = slots.every((s) => Math.abs(s.w / s.h - r0) / r0 < 0.02 && Math.abs(s.w - slots[0].w) / slots[0].w < 0.02);
    out.push({ id: "ratio", ok: same, level: "error", text: same ? `칸 크기가 모두 같아요 (${slots[0].w} x ${slots[0].h}px, ${r0.toFixed(2)} : 1)` : "칸 크기가 서로 달라요. 카메라가 한 비율로 찍어서 칸은 모두 같아야 해요" });
  }
  // 칸이 너무 작으면 장식이 칸을 가려 덜 잡혔을 수 있다
  const area = slots.reduce((a, s) => a + s.w * s.h, 0) / (p.width * p.height);
  if (slots.length) out.push({ id: "area", ok: area > 0.35, level: "warn", text: area > 0.35 ? "사진이 차지하는 넓이가 넉넉해요" : "사진 칸이 작게 잡혔어요. 장식이 칸을 많이 가리면 그만큼 사진이 덜 보여요" });
  return out;
}

/** 한 행사에서 같이 쓰는 프레임은 칸 수와 칸 비율이 같아야 한다(찍은 뒤에 프레임을 고르니 찍을 때 비율이 하나여야 한다) */
export function compatible(a: Pick<FrameRef, "slots">, b: Pick<FrameRef, "slots">): boolean {
  if (a.slots.length !== b.slots.length || !a.slots.length) return false;
  const ra = a.slots[0].w / a.slots[0].h;
  const rb = b.slots[0].w / b.slots[0].h;
  return Math.abs(ra - rb) / ra < 0.02;
}

export function toFrameRef(a: Asset): FrameRef | null {
  if (a.kind !== "frame" || !a.meta.slots?.length) return null;
  return { key: a.key, label: a.label, width: a.meta.width, height: a.meta.height, slots: a.meta.slots, swatch: a.meta.swatch ?? "#FFFFFF" };
}

/** 저장소에서 읽은 프레임 칸을 믿지 않고 모양을 맞춘다 */
export function normalizeFrameRef(raw: unknown): FrameRef | null {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);
  const key = typeof r.key === "string" && (KEY_RE.test(r.key) || r.key === BUILTIN_FRAME.key) ? r.key : null;
  const width = num(r.width);
  const height = num(r.height);
  const slots = Array.isArray(r.slots)
    ? r.slots
        .map((s) => {
          const o = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
          const v = [num(o.x), num(o.y), num(o.w), num(o.h)];
          return v.every((x) => x !== null) ? { x: v[0]!, y: v[1]!, w: v[2]!, h: v[3]! } : null;
        })
        .filter((s): s is Slot => s !== null)
    : [];
  if (!key || !width || !height || !slots.length || slots.length > 6) return null;
  const swatch = typeof r.swatch === "string" && /^#[0-9A-Fa-f]{6}$/.test(r.swatch) ? r.swatch : "#FFFFFF";
  return { key, label: typeof r.label === "string" ? r.label.slice(0, 20) : "프레임", width, height, slots, swatch };
}
