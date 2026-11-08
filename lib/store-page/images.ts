/**
 * 스토어에 올리는 이미지와 영상의 칸, 규격 검사 (docs/admin-ui.md "스토어 페이지"). 순수 함수만 둔다.
 * 규격은 애플, 구글 공식 문서를 2026-11-08 에 열어 확인한 값이다(specs.ts 와 같은 출처).
 */
import { LINKS, type Lang, type Platform } from "./fields.ts";

export type ImageSlotId = "iphone" | "ipad" | "preview" | "icon" | "feature" | "phone" | "tablet7" | "tablet10";

export type ImageSlot = {
  id: ImageSlotId;
  label: string;
  need: string;
  max: number;
  video?: boolean;
  types: string[];
  /** 정확히 이 크기만 받는다 */
  sizes?: [number, number][];
  /** 한 변의 범위와 긴 변 / 짧은 변 비율 조건 */
  range?: { min: number; max: number; maxRatio?: number; ratios?: number[] };
  maxBytes?: number;
  noAlpha: boolean;
  seconds?: [number, number];
  link: string;
};

const rotate = (s: [number, number][]): [number, number][] => s.flatMap(([w, h]) => [[w, h], [h, w]] as [number, number][]);
const SHOT_TYPES = ["image/png", "image/jpeg"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/x-m4v"];
export const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

export const IMAGE_SLOTS: Record<Platform, ImageSlot[]> = {
  ios: [
    { id: "iphone", label: "iPhone 스크린샷", need: "필수", max: 10, types: SHOT_TYPES, sizes: rotate([[1320, 2868], [1290, 2796], [1260, 2736]]), noAlpha: true, link: LINKS.appleShots },
    { id: "ipad", label: "iPad 13인치 스크린샷", need: "iPad 지원 시 필수", max: 10, types: SHOT_TYPES, sizes: rotate([[2064, 2752], [2048, 2732]]), noAlpha: true, link: LINKS.appleShots },
    { id: "preview", label: "앱 미리보기 영상", need: "선택", max: 3, video: true, types: VIDEO_TYPES, sizes: [[886, 1920], [1920, 886]], maxBytes: MAX_VIDEO_BYTES, noAlpha: false, seconds: [15, 30], link: LINKS.applePreview },
  ],
  android: [
    { id: "icon", label: "앱 아이콘", need: "필수", max: 1, types: ["image/png"], sizes: [[512, 512]], maxBytes: 1024 * 1024, noAlpha: false, link: LINKS.playIcon },
    { id: "feature", label: "피처 그래픽", need: "필수", max: 1, types: SHOT_TYPES, sizes: [[1024, 500]], noAlpha: true, link: LINKS.playAssets },
    { id: "phone", label: "폰 스크린샷", need: "기기 합쳐 2장 이상", max: 8, types: SHOT_TYPES, range: { min: 320, max: 3840, maxRatio: 2 }, noAlpha: true, link: LINKS.playAssets },
    { id: "tablet7", label: "7인치 태블릿 스크린샷", need: "선택", max: 8, types: SHOT_TYPES, range: { min: 1080, max: 7680, ratios: [16 / 9] }, noAlpha: true, link: LINKS.playAssets },
    { id: "tablet10", label: "10인치 태블릿 스크린샷", need: "선택", max: 8, types: SHOT_TYPES, range: { min: 1080, max: 7680, ratios: [16 / 9] }, noAlpha: true, link: LINKS.playAssets },
  ],
};

export const slotById = (p: Platform, id: string) => IMAGE_SLOTS[p].find((s) => s.id === id);

/** status: 스토어가 아직 파일을 처리 중이거나 거절했을 때 */
export type LiveImage = { kind: "live"; id: string; url: string; status?: "processing" | "failed" };
export type NewImage = { kind: "new"; key: string; url: string; width: number; height: number; bytes: number; type: string; name: string; seconds?: number };
export type ImageItem = LiveImage | NewImage;
export type LiveImages = Record<Lang, Partial<Record<ImageSlotId, LiveImage[]>>>;
export type ImageDraft = { platform: Platform; lang: Lang; slot: ImageSlotId; items: ImageItem[]; updatedBy: string; updatedAt: string };

export const itemId = (i: ImageItem) => (i.kind === "live" ? i.id : i.key);
export const sameItems = (a: ImageItem[], b: ImageItem[]) => a.length === b.length && a.every((x, i) => itemId(x) === itemId(b[i]));

/** 고친 목록이 스토어와 어떻게 다른지. 옮긴 것은 제자리에 남은 가장 긴 줄 밖의 것이라, 하나를 끌면 그 하나만 잡힌다 */
export function diffItems(live: ImageItem[], items: ImageItem[]): { moved: Set<string>; removed: ImageItem[] } {
  const order = new Map(live.map((x, i) => [itemId(x), i]));
  const kept = items.map(itemId).filter((id) => order.has(id));
  const seq = kept.map((id) => order.get(id)!);
  const length = seq.map(() => 1);
  const prev = seq.map(() => -1);
  seq.forEach((v, i) => {
    for (let j = 0; j < i; j++) {
      if (seq[j] < v && length[j] + 1 > length[i]) {
        length[i] = length[j] + 1;
        prev[i] = j;
      }
    }
  });
  const stay = new Set<number>();
  for (let i = length.indexOf(Math.max(0, ...length)); i >= 0; i = prev[i]) stay.add(i);
  return { moved: new Set(kept.filter((_, i) => !stay.has(i))), removed: live.filter((x) => !items.some((i) => itemId(i) === itemId(x))) };
}

export const draftKey = (p: Platform, l: Lang, s: ImageSlotId) => `${p}:${l}:${s}`;

/** App Store 이미지 주소 틀에 크기를 넣는다 */
export const ascImageUrl = (template: string, width: number, height: number) => template.replace("{w}", String(width)).replace("{h}", String(height)).replace("{f}", "png");

export type FileInfo = { width: number; height: number; bytes: number; type: string; hasAlpha: boolean; seconds?: number };

const mb = (n: number) => `${Math.round(n / (1024 * 1024))}MB`;

/** 올리기 전 규격 검사. 어긋난 이유를 말로 돌려준다. 비어 있으면 통과 */
export function checkFile(slot: ImageSlot, f: FileInfo): string[] {
  const out: string[] = [];
  if (!slot.types.includes(f.type)) out.push(slot.video ? "MP4, MOV, M4V 파일만 올릴 수 있어요." : slot.types.length === 1 ? "PNG 파일만 올릴 수 있어요." : "PNG 또는 JPEG 파일만 올릴 수 있어요.");
  if (slot.sizes && !slot.sizes.some(([w, h]) => w === f.width && h === f.height)) {
    const list = slot.sizes.filter(([w, h]) => w <= h).map(([w, h]) => `${w} x ${h}`);
    out.push(`지금 ${f.width} x ${f.height}이에요. ${(list.length ? list : slot.sizes.map(([w, h]) => `${w} x ${h}`)).join(", ")} 중 하나로 만들어 주세요.`);
  }
  if (slot.range) {
    const { min, max, maxRatio, ratios } = slot.range;
    const long = Math.max(f.width, f.height);
    const short = Math.min(f.width, f.height);
    if (short < min || long > max) out.push(`한 변이 ${min}px 에서 ${max}px 사이여야 해요. 지금 ${f.width} x ${f.height}이에요.`);
    if (maxRatio && long / short > maxRatio) out.push(`긴 변이 짧은 변의 ${maxRatio}배를 넘을 수 없어요.`);
    if (ratios && !ratios.some((r) => Math.abs(long / short - r) < 0.01)) out.push("16:9 또는 9:16 비율이어야 해요.");
  }
  if (slot.noAlpha && f.hasAlpha) out.push("투명 배경이 있으면 올릴 수 없어요. 배경을 채워서 저장해 주세요.");
  const limit = slot.maxBytes ?? MAX_IMAGE_BYTES;
  if (f.bytes > limit) out.push(`${mb(limit)} 아래로 줄여 주세요.`);
  if (slot.seconds && f.seconds !== undefined && (f.seconds < slot.seconds[0] || f.seconds > slot.seconds[1] + 0.5)) out.push(`영상 길이는 ${slot.seconds[0]}초에서 ${slot.seconds[1]}초예요. 지금 ${Math.round(f.seconds)}초예요.`);
  return out;
}

/** PNG 머리에서 알파 채널이 있는지 본다(색 형식 4, 6) */
export function pngHasAlpha(head: Uint8Array): boolean {
  const sig = [0x89, 0x50, 0x4e, 0x47];
  if (head.length < 26 || !sig.every((v, i) => head[i] === v)) return false;
  return head[25] === 4 || head[25] === 6;
}

export const KEY_RE = /^store\/(iphone|ipad|preview|icon|feature|phone|tablet7|tablet10)\/\d+-[0-9a-f]{8}\.(png|jpg|mp4|mov|m4v)$/;

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "video/mp4": "mp4", "video/quicktime": "mov", "video/x-m4v": "m4v" };
export const extOf = (type: string) => EXT[type] ?? null;

/** 서버가 받은 목록이 칸 규칙에 맞는지. 맞으면 null, 아니면 이유 */
export function invalidItems(slot: ImageSlot, items: ImageItem[], publicBase: string): string | null {
  if (items.length > slot.max) return `${slot.max}개까지 올릴 수 있어요.`;
  for (const i of items) {
    if (i.kind === "live") continue;
    if (!KEY_RE.test(i.key) || !i.key.startsWith(`store/${slot.id}/`) || i.url !== `${publicBase}/${i.key}`) return "올린 파일을 알아볼 수 없어요.";
    const problems = checkFile(slot, { width: i.width, height: i.height, bytes: i.bytes, type: i.type, hasAlpha: false, seconds: i.seconds });
    if (problems.length) return problems[0];
  }
  return null;
}
