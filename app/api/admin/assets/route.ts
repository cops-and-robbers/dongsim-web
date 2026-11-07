import { NextResponse } from "next/server";
import { actorName } from "@/lib/admin/server/remoteConfig";
import { guard, isEventsWritable, noStore, storeError, type AssetsList } from "@/lib/event/adminApi";
import { CHARACTER_TYPES, FRAME_SIZE, FRAME_TYPES, MAX_BYTES, checkFrame, type Asset, type Slot } from "@/lib/event/assets";
import { createAsset, listAssets, pngSize, usage, webpSize } from "@/lib/event/assetsServer";

/**
 * 어드민 그림 보관함 (#224).
 *
 * GET                                   { assets, usage, writable }
 * POST multipart { file, kind, label, side?, slots?, swatch? }
 *   프레임: PNG 1800x5400, 4MB 이하. 칸은 화면이 재서 보내고, 여기서 크기와 칸 모양을 다시 검사한다
 *   캐릭터: PNG 또는 WebP, 1MB 이하, 경찰 쪽 또는 도둑 쪽
 */
export async function GET(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  try {
    const [assets, used] = await Promise.all([listAssets(), usage()]);
    const body: AssetsList = { assets, usage: used, writable: isEventsWritable() };
    return NextResponse.json(body, noStore);
  } catch (e) {
    return storeError(e);
  }
}

const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function POST(req: Request): Promise<NextResponse> {
  const checked = await guard(req);
  if (checked instanceof NextResponse) return checked;
  if (!isEventsWritable()) return NextResponse.json({ error: "운영 어드민에서만 올릴 수 있어요." }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind");
  const label = String(form?.get("label") ?? "").trim();
  if (!(file instanceof File)) return bad("파일을 골라 주세요.");
  if (kind !== "frame" && kind !== "character") return bad("종류가 올바르지 않아요.");
  if (!label || label.length > 20) return bad("이름은 1자에서 20자예요.");
  const body = await file.arrayBuffer();

  let meta: Asset["meta"];
  if (kind === "frame") {
    if (!(FRAME_TYPES as readonly string[]).includes(file.type)) return bad("프레임은 PNG 만 올릴 수 있어요.");
    if (body.byteLength > MAX_BYTES.frame) return bad("4MB 아래로 줄여 주세요.");
    const size = pngSize(body);
    if (!size || size.width !== FRAME_SIZE.width || size.height !== FRAME_SIZE.height) return bad(`크기는 ${FRAME_SIZE.width} x ${FRAME_SIZE.height}px 이어야 해요.`);
    let slots: Slot[];
    try {
      slots = (JSON.parse(String(form?.get("slots") ?? "[]")) as Slot[]).map((s) => ({ x: Math.round(s.x), y: Math.round(s.y), w: Math.round(s.w), h: Math.round(s.h) }));
    } catch {
      return bad("사진 칸 값이 올바르지 않아요.");
    }
    const inside = slots.every((s) => [s.x, s.y, s.w, s.h].every(Number.isFinite) && s.x >= 0 && s.y >= 0 && s.x + s.w <= size.width && s.y + s.h <= size.height);
    const failed = checkFrame(size, inside ? slots : [], body.byteLength, file.type).find((c) => c.level === "error" && !c.ok);
    if (failed) return bad(failed.text);
    const swatch = String(form?.get("swatch") ?? "");
    meta = { width: size.width, height: size.height, slots, swatch: /^#[0-9A-Fa-f]{6}$/.test(swatch) ? swatch.toUpperCase() : "#FFFFFF" };
  } else {
    if (!(CHARACTER_TYPES as readonly string[]).includes(file.type)) return bad("캐릭터는 투명 배경 PNG 나 WebP 만 올릴 수 있어요.");
    if (body.byteLength > MAX_BYTES.character) return bad("1MB 아래로 줄여 주세요.");
    const size = file.type === "image/png" ? pngSize(body) : webpSize(body);
    if (!size || size.width < 200 || size.height < 200 || size.width > 3000 || size.height > 3000) return bad("크기는 가로세로 200px 에서 3000px 사이예요.");
    const side = form?.get("side");
    if (side !== "cop" && side !== "thief") return bad("경찰 쪽인지 도둑 쪽인지 골라 주세요.");
    meta = { width: size.width, height: size.height, side };
  }

  try {
    const asset = await createAsset({ kind, label, meta, body, type: file.type, by: await actorName(checked.token) });
    return NextResponse.json({ asset }, noStore);
  } catch (e) {
    return storeError(e);
  }
}
