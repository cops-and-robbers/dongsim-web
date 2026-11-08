// 그림 보관함 테스트. 실행: pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { BUILTIN_FRAME, assetUrl, checkFrame, compatible, edgeColor, findSlots, normalizeFrameRef } from "./assets.ts";

/** 불투명한 바탕에 투명한 칸을 뚫은 가짜 프레임 */
function fake(width, height, holes) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set([200, 220, 180, 255], i * 4);
  for (const h of holes) for (let y = h.y; y < h.y + h.h; y++) for (let x = h.x; x < h.x + h.w; x++) data[(y * width + x) * 4 + 3] = 0;
  return { width, height, data };
}

test("지금 연두 프레임에서 칸 4개를 손으로 잰 좌표와 몇 px 안으로 찾는다(장식이 칸을 덮어도)", async () => {
  const { data, info } = await sharp(fileURLToPath(new URL("../../public/photobooth/frame-green.png", import.meta.url))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const slots = findSlots({ width: info.width, height: info.height, data });
  assert.equal(slots.length, 4);
  slots.forEach((s, i) => {
    const want = BUILTIN_FRAME.slots[i];
    assert.ok(Math.abs(s.y - want.y) <= 12 && Math.abs(s.h - want.h) <= 16, `칸 ${i + 1} 세로 ${s.y}/${s.h}`);
    assert.ok(Math.abs(s.x - want.x) <= 12 && Math.abs(s.w - want.w) <= 16, `칸 ${i + 1} 가로 ${s.x}/${s.w}`);
  });
  assert.equal(edgeColor({ width: info.width, height: info.height, data }), "#E1ECCF");
});

test("칸을 찾고, 가장자리에 닿은 투명 영역과 작은 틈은 칸이 아니다", () => {
  const p = fake(300, 900, [
    { x: 20, y: 30, w: 260, h: 180 },
    { x: 20, y: 260, w: 260, h: 180 },
    { x: 0, y: 600, w: 30, h: 40 }, // 가장자리
    { x: 140, y: 800, w: 6, h: 6 }, // 작은 틈
  ]);
  const slots = findSlots(p, 2);
  assert.equal(slots.length, 2);
  assert.deepEqual(slots[0], { x: 20, y: 30, w: 260, h: 180 });
});

test("검사: 크기, 칸 비율이 다르면 올릴 수 없다", () => {
  const ok = checkFrame({ width: 1800, height: 5400 }, BUILTIN_FRAME.slots, 400_000, "image/png");
  assert.ok(ok.filter((c) => c.level === "error").every((c) => c.ok));
  const bad = checkFrame({ width: 1200, height: 3600 }, [{ x: 0, y: 0, w: 100, h: 70 }, { x: 0, y: 100, w: 100, h: 100 }], 400_000, "image/jpeg");
  assert.deepEqual(bad.filter((c) => !c.ok && c.level === "error").map((c) => c.id), ["type", "size", "ratio"]);
});

test("한 행사에서 같이 쓰는 프레임은 칸 수와 비율이 같아야 한다", () => {
  assert.ok(compatible(BUILTIN_FRAME, { slots: BUILTIN_FRAME.slots.map((s) => ({ ...s, x: s.x + 5 })) }));
  assert.equal(compatible(BUILTIN_FRAME, { slots: BUILTIN_FRAME.slots.slice(0, 3) }), false);
  assert.equal(compatible(BUILTIN_FRAME, { slots: BUILTIN_FRAME.slots.map((s) => ({ ...s, h: s.w })) }), false);
});

test("저장소 값을 믿지 않는다: 모르는 주소, 칸 없는 프레임은 버린다", () => {
  assert.equal(normalizeFrameRef({ key: "https://evil.example/x.png", width: 1, height: 1, slots: [{ x: 0, y: 0, w: 1, h: 1 }] }), null);
  assert.equal(normalizeFrameRef({ key: "assets/frame/a-1.png", width: 1800, height: 5400, slots: [] }), null);
  const f = normalizeFrameRef({ key: "assets/frame/a-1.png", label: "겨울", width: 1800, height: 5400, slots: [{ x: 1, y: 2, w: 3, h: 4 }], swatch: "nope" });
  assert.equal(f.swatch, "#FFFFFF");
  assert.equal(assetUrl(f.key), "/photobooth/asset/frame/a-1.png");
});

test("그림 키: 프레임은 PNG 만, 캐릭터는 PNG, WebP, SVG", async () => {
  const { KEY_RE } = await import("./assets.ts");
  assert.ok(KEY_RE.test("assets/character/a-1.svg"));
  assert.ok(KEY_RE.test("assets/frame/a-1.png"));
  assert.equal(KEY_RE.test("assets/frame/a-1.svg"), false);
  assert.equal(KEY_RE.test("assets/character/../x.svg"), false);
});
