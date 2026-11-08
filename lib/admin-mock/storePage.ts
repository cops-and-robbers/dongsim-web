// 로컬에서 스토어 페이지를 보는 가짜 값. 실제 스토어와 Supabase 에 닿지 않는다.
import type { Art, Draft, FieldId, Lang, Platform, Side, StorePage } from "@/lib/store-page/fields";
import { extOf, type ImageDraft, type ImageItem, type ImageSlotId, type LiveImage, type LiveImages } from "@/lib/store-page/images";

const langs = (ko: Side, en: Side, ja: Side): Record<Lang, Side> => ({ ko, en, ja });

const iosKo: Side = {
  live: {
    name: "경찰과도둑",
    subtitle: "친구들과 밖에서 노는 GPS 술래잡기",
    promotionalText: "",
    description: "어릴 때 뛰놀던 경도, 이제 앱과 함께 다시 뛰어요.\n\n경찰 팀과 도둑 팀으로 나뉘어 실제로 뛰어요. 구역과 감옥, 시간은 앱이 챙겨요.",
    keywords: "경도,추격전,야외놀이,달리기,숨바꼭질,얼음땡,감옥,탈옥",
    whatsNew: "목록을 당겨서 새로고침할 때 사이렌 효과가 나타나요.",
  },
  pending: {
    name: "경찰과도둑",
    subtitle: "친구들과 밖에서 노는 GPS 술래잡기, 경도",
    promotionalText: "",
    description: "어릴 때 뛰놀던 경도, 이제 앱과 함께 다시 뛰어요.\n\n경찰 팀과 도둑 팀으로 나뉘어 실제로 뛰어요. 구역과 감옥, 시간은 앱이 챙겨요. 친구들과 동네에서 바로 시작해 보세요.",
    keywords: "숨바꼭질,추격,추격전,얼음땡,꼬리잡기,야외게임,단체게임,팀게임,오프라인게임,위치공유,실시간,모임",
    whatsNew: "",
  },
};
const iosEn: Side = {
  live: { name: "Cops and Robbers:Hide and Seek", subtitle: "Real-Life GPS Tag Game", promotionalText: "", description: "The chase you grew up with, now on your phone.", keywords: "multiplayer,team,radar,escape,arrest,running", whatsNew: "Pulling down to refresh now shows a siren." },
  pending: { name: "Cops and Robbers: Real Chase", subtitle: "Outdoor GPS Tag with Friends", promotionalText: "", description: "The chase you grew up with, now on your phone.\n\nCops and Robbers is a real-world outdoor chase game.", keywords: "manhunt,chase,irl,outdoor,friends,group,party,team", whatsNew: "" },
};
const iosJa: Side = {
  live: { name: "ケイドロ", subtitle: "外で遊ぶGPS鬼ごっこ", promotionalText: "", description: "子どもの頃に夢中になったケイドロを、今度はスマホと一緒に。", keywords: "ケイドロ,どろけい,けいどろ,追いかけっこ", whatsNew: "" },
  pending: { name: "ケイドロ", subtitle: "友達と外で遊ぶGPS鬼ごっこ", promotionalText: "", description: "子どもの頃に夢中になったケイドロを、今度はスマホと一緒に。", keywords: "ドロケイ,けいどろ,どろけい,かくれんぼ,おにごっこ", whatsNew: "" },
};

const android = (title: string, shortDescription: string, fullDescription: string, shown?: string): Side => {
  const saved = { title, shortDescription, fullDescription, video: "https://youtu.be/4nLEws5Sk8A?si=n5QFkdBA-FRttmXL" };
  return shown ? { live: { ...saved, title: shown }, pending: saved } : { live: saved, pending: null };
};

const art: Art = { icon: "/brand/app-icon.png", screenshots: [], rating: 5, ratingCount: 7, age: "12+", developer: "동심지키미", category: "스포츠", downloads: "100회 이상" };

const shots = (prefix: string, n: number): LiveImage[] => Array.from({ length: n }, (_, i) => ({ kind: "live", id: `${prefix}${i}`, url: "/brand/app-icon.png" }));
const iosImages = (ipad: number): LiveImages[Lang] => ({ iphone: shots("iphone", 8), ipad: shots("ipad", ipad), preview: [] });
const playImages = (): LiveImages[Lang] => ({ icon: shots("icon", 1), feature: shots("feature", 1), phone: shots("phone", 8), tablet7: shots("tablet7", 8), tablet10: shots("tablet10", 8) });

const base: Omit<StorePage, "readAt" | "drafts" | "imageDrafts"> = {
  ios: { ok: true, langs: langs(iosKo, iosEn, iosJa), art, images: { ko: iosImages(7), en: iosImages(0), ja: iosImages(0) }, liveVersion: "3.2.7", nextVersion: "3.2.8" },
  android: {
    ok: true,
    art,
    images: { ko: playImages(), en: playImages(), ja: playImages() },
    langs: langs(
      android("경찰과도둑", "친구들과 밖에서 노는 GPS 술래잡기, 경도. 숨바꼭질·추격전을 진짜로 즐겨요", "경찰과도둑, 친구들과 밖에서 노는 GPS 술래잡기예요.\n\n어릴 때 하던 경도, 숨바꼭질, 추격전을 이제 진짜로 해 보세요."),
      android("Cops and Robbers:Hide and Seek", "Real-Life GPS Tag Game: play manhunt and hide and seek outdoors with friends", "Play manhunt and hide and seek outdoors with friends.", "Cops and Robbers"),
      android("ケイドロ", "外で遊ぶGPS鬼ごっこ。ケイドロ・ドロケイ・かくれんぼを友達とリアルに楽しもう", "子どもの頃に遊んだケイドロを、スマホでもう一度。"),
    ),
  },
  writable: true,
};

let drafts: Draft[] = [{ platform: "ios", lang: "ko", field: "promotionalText", value: "이번 주말 노원 축제에서 경찰과 도둑을 직접 해 보세요.", updatedBy: "마케터", updatedAt: "2026-11-08T05:00:00.000Z" }];

export function mockStorePage(): StorePage {
  return { ...base, readAt: new Date().toISOString(), drafts, imageDrafts };
}

export function mockSaveDraft(body: { platform: Platform; lang: Lang; field: FieldId; value: string | null }): { draft: Draft | null } {
  const same = (d: Draft) => d.platform === body.platform && d.lang === body.lang && d.field === body.field;
  drafts = drafts.filter((d) => !same(d));
  if (body.value === null) return { draft: null };
  const draft: Draft = { platform: body.platform, lang: body.lang, field: body.field, value: body.value, updatedBy: "로컬 관리자", updatedAt: new Date().toISOString() };
  drafts.push(draft);
  return { draft };
}

let imageDrafts: ImageDraft[] = [];

export function mockSaveImageDraft(body: { platform: Platform; lang: Lang; slot: ImageSlotId; items: ImageItem[] | null }): { draft: ImageDraft | null } {
  const same = (d: ImageDraft) => d.platform === body.platform && d.lang === body.lang && d.slot === body.slot;
  imageDrafts = imageDrafts.filter((d) => !same(d));
  if (!body.items) return { draft: null };
  const draft: ImageDraft = { platform: body.platform, lang: body.lang, slot: body.slot, items: body.items, updatedBy: "로컬 관리자", updatedAt: new Date().toISOString() };
  imageDrafts.push(draft);
  return { draft };
}

export function mockPresign(body: { slot: string; type: string }): { uploadUrl: string; url: string; key: string } {
  return { uploadUrl: "", url: "", key: `store/${body.slot}/${Date.now()}-abcdef12.${extOf(body.type) ?? "png"}` };
}

/** 로컬에서 누른 보내기. 스토어에 닿지 않고 성공한 것처럼 답하고 그 스토어의 초안을 지운다 */
export function mockSend(body: { platform: Platform; dryRun?: boolean }): { message: string } {
  if (body.dryRun) return { message: "보낼 수 있어요(로컬 가짜)." };
  drafts = drafts.filter((d) => d.platform !== body.platform);
  return { message: "로컬 가짜: 보낸 것처럼 답했어요. 실제 스토어는 바뀌지 않아요." };
}
