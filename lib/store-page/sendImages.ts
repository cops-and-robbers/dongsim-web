/**
 * 초안 이미지와 영상을 스토어로 보낸다 (docs/admin-ui.md "스토어 페이지"). 서버 전용이다.
 * - App Store: 에셋 라이브러리에 올리고 다음 버전의 언어에 자리(placement)를 만든다. 예전 스크린샷 API 는 폐기 예정이다
 * - Google Play: 호출한 쪽의 편집(edit) 안에서 지우고 올린다. 순서를 바꾸는 API 가 없어서 순서가 바뀌면 원본을 받아 다시 올린다
 * 파일은 R2 에서 서버가 받아 스토어로 넘긴다.
 */
import { APPSTORE_APP_ID } from "../metrics/config.ts";
import { ASC_API } from "../metrics/appstore/auth.ts";
import { asc, PLAY_API, StoreError } from "../release/stores.ts";
import { LANGS } from "./fields.ts";
import { PLAY_IMAGE_TYPES } from "./read.ts";
import { itemId, slotById, type ImageItem, type ImageSlotId, type NewImage } from "./images.ts";
import { imagePlan, type ImageChange } from "./send.ts";

type Doc = { data: { id: string; attributes?: Record<string, unknown> } };

/** App Store Connect 에 쓴다. 지우기는 본문 없이 돌아온다 */
export async function ascWrite(method: "POST" | "PATCH" | "DELETE", path: string, body: unknown, token: string): Promise<Doc> {
  const res = await fetch(`${ASC_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (res.ok) return (await res.json().catch(() => ({}))) as Doc;
  const out = (await res.json().catch(() => ({}))) as { errors?: { detail?: string; title?: string }[] };
  const reason = out.errors?.[0]?.detail ?? out.errors?.[0]?.title ?? "";
  throw new StoreError(`App Store 가 받지 않았어요. ${reason}`.trim(), { detail: `ASC ${res.status} ${method} ${path} ${reason}`, status: res.status });
}

/** 여러 일을 limit 개씩 나눠 돌린다. 하나라도 실패하면 실패한다. 결과는 넣은 순서대로다 */
async function mapLimit<T, R>(list: T[], limit: number, run: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let next = 0;
  const worker = async () => {
    while (next < list.length) {
      const i = next++;
      out[i] = await run(list[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, worker));
  return out;
}

const langOf = (c: ImageChange) => LANGS.find((l) => l.id === c.lang)!;
const nameOf = (c: ImageChange) => `${langOf(c).label} ${c.label}`;
const isNew = (i: ImageItem): i is NewImage => i.kind === "new";

/** 초안 파일이 저장소에 그대로 있는지 본다. 스토어는 건드리지 않는다 */
export async function checkFiles(images: ImageChange[]): Promise<void> {
  const files = images.flatMap((c) => c.after.filter(isNew).map((item) => ({ c, item })));
  await mapLimit(files, 6, async ({ c, item }) => {
    const res = await fetch(item.url, { method: "HEAD", signal: AbortSignal.timeout(10_000), cache: "no-store" });
    if (!res.ok || Number(res.headers.get("content-length")) !== item.bytes) throw new StoreError(`${nameOf(c)}: 올린 파일을 찾지 못했어요. 다시 올려 주세요.`);
  });
}

// App Store 칸이 어느 자리에 들어가는지. 지금 올라가 있는 스크린샷의 실제 값이다(2026-11-08)
const IOS_PLACE: Partial<Record<ImageSlotId, { type: "APP_SCREENSHOT" | "APP_PREVIEW"; group: string }>> = {
  iphone: { type: "APP_SCREENSHOT", group: "IPHONE_DYNAMIC_ISLAND_LARGE_PROFILE" },
  ipad: { type: "APP_SCREENSHOT", group: "IPAD_13_PROFILE" },
  preview: { type: "APP_PREVIEW", group: "IPHONE_DYNAMIC_ISLAND_LARGE_PROFILE" },
};

const PART_TIMEOUT = 120_000;
/** 영상을 시작하려면 이만큼은 남아 있어야 한다 */
const VIDEO_BUDGET = 120_000;
const WAIT_READY = 45_000;

type UploadOp = { method: string; url: string; offset: number; length: number; requestHeaders: { name: string; value: string }[] };

/** 저장소의 파일을 애플이 알려 준 조각대로 나눠 올리고 커밋한다 */
async function uploadToLibrary(item: NewImage, video: boolean, library: string, token: string): Promise<string> {
  const type = video ? "appAssetLibraryVideos" : "appAssetLibraryImages";
  const reserved = await ascWrite(
    "POST",
    `/${type}`,
    { data: { type, attributes: { fileName: item.key.split("/").pop(), fileSize: item.bytes, category: "APP_SCREENSHOTS_AND_PREVIEWS" }, relationships: { assetLibrary: { data: { type: "appAssetLibraries", id: library } } } } },
    token,
  );
  const id = reserved.data.id;
  const ops = (reserved.data.attributes?.uploadOperations ?? []) as UploadOp[];
  await mapLimit(ops, 3, async (op) => {
    const part = await fetch(item.url, { headers: { Range: `bytes=${op.offset}-${op.offset + op.length - 1}` }, signal: AbortSignal.timeout(PART_TIMEOUT), cache: "no-store" });
    const bytes = Buffer.from(await part.arrayBuffer());
    if (!part.ok || bytes.length !== op.length) throw new StoreError("올린 파일을 읽지 못했어요. 다시 올려 주세요.", { detail: `R2 ${part.status} ${bytes.length}/${op.length} ${item.key}` });
    const sent = await fetch(op.url, { method: op.method, headers: Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value])), body: bytes, signal: AbortSignal.timeout(PART_TIMEOUT) });
    if (!sent.ok) throw new StoreError("App Store 로 파일을 올리지 못했어요. 잠시 뒤 다시 보내 주세요.", { detail: `ASC 조각 ${sent.status}` });
  });
  await ascWrite("PATCH", `/${type}/${id}`, { data: { type, id, attributes: { uploaded: true } } }, token);
  return id;
}

/** 애플이 파일을 다 볼 때까지 잠시 기다린다. 오래 걸리면 그냥 넘어간다(처리 중에도 자리는 만들 수 있다). 거절하면 실패한다 */
async function waitReady(ids: string[], video: boolean, token: string): Promise<void> {
  const type = video ? "appAssetLibraryVideos" : "appAssetLibraryImages";
  const until = Date.now() + (video ? 15_000 : WAIT_READY);
  let left = ids;
  while (left.length && Date.now() < until) {
    await new Promise((ok) => setTimeout(ok, 2_000));
    const states = await Promise.all(left.map(async (id) => ({ id, attrs: ((await asc(`/${type}/${id}?fields[${type}]=state,stateDetails`, token)).data as unknown as Doc["data"]).attributes })));
    const bad = states.find((s) => s.attrs?.state === "FAILED");
    if (bad) throw new StoreError("애플이 파일을 받지 않았어요. 규격을 확인해 주세요.", { detail: `ASC 처리 실패 ${JSON.stringify(bad.attrs?.stateDetails)}` });
    left = states.filter((s) => s.attrs?.state === "UPLOAD_COMPLETE" || s.attrs?.state === "AWAITING_UPLOAD").map((s) => s.id);
  }
}

async function sendIosSlot(c: ImageChange, localization: string, library: string, token: string): Promise<void> {
  const place = IOS_PLACE[c.slot];
  if (!place) throw new StoreError(`${c.label} 칸은 보낼 수 없어요.`);
  const video = !!slotById("ios", c.slot)?.video;
  const plan = imagePlan(c);
  // 다 올리고 애플이 받아 준 뒤에야 스토어의 자리를 건드린다. 파일 문제로 칸이 비는 일이 없게
  const assets = await mapLimit(plan.add, 3, (item) => uploadToLibrary(item, video, library, token));
  await waitReady(assets, video, token);
  await mapLimit(plan.remove, 4, (id) => ascWrite("DELETE", `/appAssetLibraryPlacements/${id}`, null, token));
  const assetType = video ? "appAssetLibraryVideos" : "appAssetLibraryImages";
  const created = new Map<string, string>();
  for (const [i, item] of plan.add.entries()) {
    const out = await ascWrite(
      "POST",
      "/appAssetLibraryPlacements",
      {
        data: {
          type: "appAssetLibraryPlacements",
          attributes: { placementType: place.type, placementGroup: place.group },
          relationships: { [video ? "video" : "image"]: { data: { type: assetType, id: assets[i] } }, appStoreVersionLocalization: { data: { type: "appStoreVersionLocalizations", id: localization } } },
        },
      },
      token,
    );
    created.set(item.key, out.data.id);
  }
  if (plan.inOrder) return;
  const ordered = c.after.map((i) => ({ type: "appAssetLibraryPlacements", id: created.get(itemId(i)) ?? itemId(i) }));
  await ascWrite(
    "POST",
    "/appAssetLibraryPlacementOrderingRequests",
    { data: { type: "appAssetLibraryPlacementOrderingRequests", attributes: { placementGroup: place.group }, relationships: { orderedPlacements: { data: ordered }, appStoreVersionLocalization: { data: { type: "appStoreVersionLocalizations", id: localization } } } } },
    token,
  );
}

export type ImageSendResult = { applied: ImageChange[]; failed?: string };

/** 칸마다 차례로 보낸다. 시간이 모자라거나 중간에 실패하면 멈추고 어디까지 됐는지 돌려준다. 보낸 칸은 초안이 지워지니 다시 누르면 남은 칸만 보낸다 */
export async function sendIosImages(images: ImageChange[], locales: Map<string, string>, token: string, deadline: number): Promise<ImageSendResult> {
  const video = (c: ImageChange) => !!slotById("ios", c.slot)?.video;
  const queue = [...images].sort((a, b) => Number(video(a)) - Number(video(b)));
  const library = ((await asc(`/apps/${APPSTORE_APP_ID}/assetLibrary`, token)).data as unknown as Doc["data"]).id;
  const applied: ImageChange[] = [];
  for (const c of queue) {
    if (Date.now() > deadline - (video(c) ? VIDEO_BUDGET : 0)) return { applied, failed: "시간이 모자라 남은 칸은 보내지 못했어요. 한 번 더 보내 주세요." };
    const localization = locales.get(langOf(c).ios);
    if (!localization) return { applied, failed: `${nameOf(c)}: 다음 버전을 찾지 못했어요. App Store Connect 에서 확인해 주세요.` };
    try {
      await sendIosSlot(c, localization, library, token);
      applied.push(c);
    } catch (e) {
      console.error("[store-page] 이미지 보내기", e instanceof StoreError ? (e.detail ?? e.message) : e);
      return { applied, failed: `${nameOf(c)}: ${e instanceof StoreError ? e.message : "보내지 못했어요."}` };
    }
  }
  return { applied };
}

const PLAY_UPLOAD = PLAY_API.replace("/androidpublisher/v3", "/upload/androidpublisher/v3");
/** 화면용 주소를 원본 주소로. =s0 은 구글에 저장된 파일과 해시까지 같다(2026-11-08) */
const originalOf = (url: string) => url.replace(/=w\d+$/, "=s0");

async function playUpload(path: string, item: ImageItem, token: string): Promise<void> {
  const source = await fetch(item.kind === "new" ? item.url : originalOf(item.url), { signal: AbortSignal.timeout(PART_TIMEOUT), cache: "no-store" });
  if (!source.ok) throw new StoreError("이미지를 읽지 못했어요. 다시 올려 주세요.", { detail: `이미지 읽기 ${source.status}` });
  const res = await fetch(`${PLAY_UPLOAD}${path}?uploadType=media`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": item.kind === "new" ? item.type : (source.headers.get("content-type") ?? "image/png") }, body: Buffer.from(await source.arrayBuffer()), signal: AbortSignal.timeout(PART_TIMEOUT) });
  if (res.ok) return;
  const message = ((await res.json().catch(() => ({}))) as { error?: { message?: string } }).error?.message ?? "";
  throw new StoreError(`Google Play 가 이미지를 받지 않았어요. ${message}`.trim(), { detail: `Play 업로드 ${res.status} ${message}`, status: res.status });
}

async function playDelete(path: string, token: string): Promise<void> {
  const res = await fetch(`${PLAY_API}${path}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000), cache: "no-store" });
  if (!res.ok) throw new StoreError("Google Play 의 이미지를 빼지 못했어요.", { detail: `Play 지우기 ${res.status}`, status: res.status });
}

/** 열어 둔 편집 안에서 칸을 바꾼다. 커밋은 호출한 쪽이 문구와 함께 한다 */
export async function applyPlayImages(images: ImageChange[], editId: string, token: string): Promise<void> {
  await mapLimit(images, 3, async (c) => {
    const type = PLAY_IMAGE_TYPES.find(([slot]) => slot === c.slot)?.[1];
    if (!type) throw new StoreError(`${c.label} 칸은 보낼 수 없어요.`);
    const base = `/edits/${editId}/listings/${langOf(c).android}/${type}`;
    const plan = imagePlan(c);
    if (plan.inOrder) {
      for (const id of plan.remove) await playDelete(`${base}/${id}`, token);
      // 올린 순서대로 뒤에 붙으니 하나씩 올린다
      for (const item of plan.add) await playUpload(base, item, token);
      return;
    }
    await playDelete(base, token);
    for (const item of c.after) await playUpload(base, item, token);
  });
}
