// 로컬에서 그림 보관함을 만져 보는 가짜 저장소(#224). dev 에서는 MSW 가 이 값으로 답해 실제 R2 와 Supabase 에 닿지 않는다.
// 예시 그림 키는 dev-sample 로 시작하고, /photobooth/asset 경로가 로컬에서만 기본 그림으로 돌려준다.
import { BUILTIN_FRAME, type Asset } from "@/lib/event/assets";
import type { AssetsList } from "@/lib/event/adminApi";

let assets: Asset[] = [
  {
    id: 2,
    kind: "frame",
    key: "assets/frame/dev-sample-winter.png",
    label: "겨울(예시)",
    meta: { width: 1800, height: 5400, slots: BUILTIN_FRAME.slots, swatch: "#DCE8F5" },
    archived: false,
    createdBy: "테스트 관리자",
    createdAt: "2026-11-07T10:00:00Z",
  },
  {
    id: 3,
    kind: "icon",
    key: "assets/icon/dev-sample-kakao.svg",
    label: "카카오 채널(예시)",
    meta: { width: 512, height: 512 },
    archived: false,
    createdBy: "테스트 관리자",
    createdAt: "2026-11-08T10:00:00Z",
  },
  {
    id: 1,
    kind: "character",
    key: "assets/character/dev-sample-cop.png",
    label: "찾는 경찰(예시)",
    meta: { width: 400, height: 400, side: "cop" },
    archived: false,
    createdBy: "테스트 관리자",
    createdAt: "2026-11-06T10:00:00Z",
  },
];

export const mockAssets = (): AssetsList => ({ assets, usage: {}, writable: true });

export function mockUploadAsset(form: FormData): { status: number; body: unknown } {
  const raw = form.get("kind");
  const kind = raw === "character" || raw === "icon" ? raw : "frame";
  const id = Math.max(0, ...assets.map((a) => a.id)) + 1;
  const asset: Asset = {
    id,
    kind,
    key: `assets/${kind}/dev-sample-${id}.${kind === "icon" ? "svg" : "png"}`,
    label: String(form.get("label") ?? "새 그림"),
    meta:
      kind === "frame"
        ? { width: 1800, height: 5400, slots: JSON.parse(String(form.get("slots") ?? "[]")), swatch: String(form.get("swatch") ?? "#FFFFFF") }
        : kind === "icon"
          ? { width: 512, height: 512 }
          : { width: 400, height: 400, side: form.get("side") === "thief" ? "thief" : "cop" },
    archived: false,
    createdBy: "테스트 관리자",
    createdAt: new Date().toISOString(),
  };
  assets = [asset, ...assets];
  return { status: 200, body: { asset } };
}

export function mockPatchAsset(id: number, patch: { label?: string; archived?: boolean }): { status: number; body: unknown } {
  const i = assets.findIndex((a) => a.id === id);
  if (i < 0) return { status: 404, body: { error: "그림을 찾지 못했어요." } };
  assets[i] = { ...assets[i], ...patch };
  return { status: 200, body: { asset: assets[i] } };
}
