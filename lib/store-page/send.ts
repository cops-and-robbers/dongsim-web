/**
 * 초안을 스토어로 보낼 때 무엇이 바뀌는지 계산한다 (docs/admin-ui.md "스토어 페이지"). 순수 함수만 둔다.
 * 화면과 서버가 같은 함수로 계산하고, 서버는 누르는 순간 스토어를 다시 읽어 화면이 본 것(signature)과 같을 때만 보낸다.
 */
import { baseOf, checkField, FIELDS, LANGS, WHEN_LABEL, type Draft, type FieldId, type Lang, type Platform, type Side, type Values } from "./fields.ts";
import { checkFile, IMAGE_SLOTS, itemId, sameItems, slotById, type ImageDraft, type ImageItem, type ImageSlotId, type LiveImages, type NewImage } from "./images.ts";

export type Change = { lang: Lang; field: FieldId; label: string; before: string; after: string; when: string };

/** 확인 칸에 그대로 입력해야 하는 말 */
export const CONFIRM_WORD = "보내기";

export function changesOf(platform: Platform, langs: Record<Lang, Side>, drafts: Draft[]): Change[] {
  const out: Change[] = [];
  for (const l of LANGS) {
    for (const f of FIELDS[platform]) {
      const draft = drafts.find((d) => d.platform === platform && d.lang === l.id && d.field === f.id);
      if (!draft) continue;
      const before = baseOf(langs[l.id], f.id);
      if (draft.value !== before) out.push({ lang: l.id, field: f.id, label: f.label, before, after: draft.value, when: WHEN_LABEL[f.when] });
    }
  }
  return out;
}

/** 보내기 전에 막아야 하는 것(글자 수 초과, 빈 이름, 잘못된 영상 주소). 경고는 막지 않는다 */
export function blockers(platform: Platform, langs: Record<Lang, Side>, changes: Change[]): string[] {
  const out: string[] = [];
  for (const c of changes) {
    const field = FIELDS[platform].find((f) => f.id === c.field)!;
    const ctx: Values = Object.fromEntries(FIELDS[platform].map((f) => [f.id, changes.find((x) => x.lang === c.lang && x.field === f.id)?.after ?? baseOf(langs[c.lang], f.id)]));
    const lang = LANGS.find((l) => l.id === c.lang)!.label;
    for (const i of checkField(platform, field, c.after, ctx)) if (i.level === "block") out.push(`${lang} ${c.label}: ${i.text}`);
  }
  return out;
}

export type ImageChange = { lang: Lang; slot: ImageSlotId; label: string; before: ImageItem[]; after: ImageItem[] };

export function imageChangesOf(platform: Platform, images: LiveImages, drafts: ImageDraft[]): ImageChange[] {
  const out: ImageChange[] = [];
  for (const l of LANGS) {
    for (const s of IMAGE_SLOTS[platform]) {
      const draft = drafts.find((d) => d.platform === platform && d.lang === l.id && d.slot === s.id);
      if (!draft) continue;
      const before = images[l.id][s.id] ?? [];
      if (!sameItems(draft.items, before)) out.push({ lang: l.id, slot: s.id, label: s.label, before, after: draft.items });
    }
  }
  return out;
}

const REQUIRED_SLOTS: ImageSlotId[] = ["iphone", "icon", "feature"];
const PLAY_SHOTS: ImageSlotId[] = ["phone", "tablet7", "tablet10"];

/** 이미지를 보내기 전에 막아야 하는 것. 그 사이 스토어가 바뀐 칸, 비면 안 되는 칸, 규격에 어긋난 파일 */
export function imageBlockers(platform: Platform, images: LiveImages, changes: ImageChange[]): string[] {
  const out: string[] = [];
  const name = (l: Lang) => LANGS.find((x) => x.id === l)!.label;
  for (const c of changes) {
    const where = `${name(c.lang)} ${c.label}`;
    if (c.after.some((i) => i.kind === "live" && !c.before.some((b) => itemId(b) === i.id))) out.push(`${where}: 스토어의 이미지가 바뀌었어요. 되돌린 뒤 다시 골라 주세요.`);
    if (c.after.length === 0 && REQUIRED_SLOTS.includes(c.slot)) out.push(`${where}: 비워 둘 수 없어요.`);
    const slot = slotById(platform, c.slot)!;
    for (const i of c.after) if (i.kind === "new") for (const p of checkFile(slot, { width: i.width, height: i.height, bytes: i.bytes, type: i.type, hasAlpha: false, seconds: i.seconds })) out.push(`${where}: ${p}`);
  }
  if (platform === "android") {
    for (const l of LANGS) {
      if (!changes.some((c) => c.lang === l.id && PLAY_SHOTS.includes(c.slot))) continue;
      const count = PLAY_SHOTS.reduce((n, s) => n + (changes.find((c) => c.lang === l.id && c.slot === s)?.after ?? images[l.id][s] ?? []).length, 0);
      if (count < 2) out.push(`${l.label}: 스크린샷은 기기를 합쳐 2장 이상이어야 해요.`);
    }
  }
  return out;
}

/** 한 칸을 스토어에서 어떻게 바꿀지. inOrder 면 뺄 것을 빼고 새것을 뒤에 붙이는 것만으로 원하는 순서가 된다 */
export function imagePlan(c: ImageChange): { remove: string[]; add: NewImage[]; inOrder: boolean } {
  const wanted = new Set(c.after.map(itemId));
  const kept = c.before.filter((b) => wanted.has(itemId(b)));
  const add = c.after.filter((i): i is NewImage => i.kind === "new");
  return { remove: c.before.filter((b) => !wanted.has(itemId(b))).map(itemId), add, inOrder: sameItems([...kept, ...add], c.after) };
}

/** 화면이 본 변경의 지문. 그 사이 스토어나 초안이 바뀌면 달라진다 */
export function signature(changes: Change[], images: ImageChange[] = []): string {
  const text = JSON.stringify([...changes.map((c) => [c.lang, c.field, c.before, c.after]), ...images.map((c) => [c.lang, c.slot, c.before.map(itemId), c.after.map(itemId)])]);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${changes.length + images.length}-${(h >>> 0).toString(16)}`;
}

/** 번호 입력까지 받아야 하는 변경. iOS 프로모션 문구는 바로 사용자에게 보이고, Play 는 커밋하면 심사에 들어간다 */
export const needsConfirm = (platform: Platform, changes: Change[]) => platform === "android" || changes.some((c) => c.field === "promotionalText");

/** App Store 칸이 어느 API 묶음에 속하는지 */
export const IOS_INFO_FIELDS: FieldId[] = ["name", "subtitle"];
export const IOS_VERSION_FIELDS: FieldId[] = ["description", "keywords", "whatsNew"];
