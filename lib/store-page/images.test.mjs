import assert from "node:assert/strict";
import { test } from "node:test";
import { ascImageUrl, checkFile, draftKey, extOf, invalidItems, KEY_RE, pngHasAlpha, sameItems, slotById } from "./images.ts";

const png = (width, height, extra = {}) => ({ width, height, bytes: 1000, type: "image/png", hasAlpha: false, ...extra });
const ok = (p, id, f) => assert.deepEqual(checkFile(slotById(p, id), f), []);
const bad = (p, id, f, re) => assert.match(checkFile(slotById(p, id), f).join("|"), re);

test("iPhone 스크린샷은 공식 크기만 받는다. 가로도 된다", () => {
  ok("ios", "iphone", png(1320, 2868));
  ok("ios", "iphone", png(2868, 1320));
  ok("ios", "iphone", png(1179, 2556));
  bad("ios", "iphone", png(1000, 2000), /1000 x 2000/);
});

test("투명 배경은 스크린샷에 쓸 수 없고, Play 아이콘은 된다", () => {
  bad("ios", "iphone", png(1320, 2868, { hasAlpha: true }), /투명/);
  bad("android", "feature", png(1024, 500, { hasAlpha: true }), /투명/);
  ok("android", "icon", png(512, 512, { hasAlpha: true }));
});

test("Play 아이콘과 피처 그래픽", () => {
  bad("android", "icon", png(1024, 1024), /512 x 512/);
  bad("android", "icon", png(512, 512, { type: "image/jpeg" }), /PNG/);
  bad("android", "icon", png(512, 512, { bytes: 2 * 1024 * 1024 }), /1MB/);
  ok("android", "feature", png(1024, 500, { type: "image/jpeg" }));
});

test("Play 폰 스크린샷은 범위와 비율을 본다", () => {
  ok("android", "phone", png(1080, 1920));
  bad("android", "phone", png(300, 500), /320px/);
  bad("android", "phone", png(1000, 2100), /2배/);
});

test("Play 태블릿은 16:9 또는 9:16", () => {
  ok("android", "tablet10", png(1920, 1080));
  ok("android", "tablet7", png(1080, 1920));
  bad("android", "tablet7", png(1200, 1600), /16:9/);
});

test("App Store 미리보기 영상", () => {
  const v = (extra) => ({ width: 886, height: 1920, bytes: 1000, type: "video/mp4", hasAlpha: false, seconds: 20, ...extra });
  ok("ios", "preview", v());
  bad("ios", "preview", v({ seconds: 40 }), /15초에서 30초/);
  bad("ios", "preview", v({ seconds: 10 }), /15초에서 30초/);
  bad("ios", "preview", v({ width: 1080 }), /886 x 1920/);
  bad("ios", "preview", v({ bytes: 600 * 1024 * 1024 }), /500MB/);
  bad("ios", "preview", v({ type: "image/png" }), /MP4/);
});

test("PNG 알파 채널을 머리에서 본다", () => {
  const head = (t) => {
    const b = new Uint8Array(26);
    b.set([0x89, 0x50, 0x4e, 0x47]);
    b[25] = t;
    return b;
  };
  assert.equal(pngHasAlpha(head(6)), true);
  assert.equal(pngHasAlpha(head(4)), true);
  assert.equal(pngHasAlpha(head(2)), false);
  assert.equal(pngHasAlpha(new Uint8Array(10)), false);
});

test("순서까지 같아야 같은 목록이다", () => {
  const a = { kind: "live", id: "a", url: "" };
  const b = { kind: "live", id: "b", url: "" };
  assert.equal(sameItems([a, b], [a, b]), true);
  assert.equal(sameItems([a, b], [b, a]), false);
  assert.equal(sameItems([a], [a, b]), false);
});

test("서버는 칸 수와 파일 주소를 다시 본다", () => {
  const base = "https://cdn.example";
  const slot = slotById("android", "icon");
  const item = { kind: "new", key: "store/icon/1-abcdef12.png", url: `${base}/store/icon/1-abcdef12.png`, width: 512, height: 512, bytes: 10, type: "image/png", name: "a.png" };
  assert.equal(invalidItems(slot, [item], base), null);
  assert.match(invalidItems(slot, [item, item], base), /1개까지/);
  assert.match(invalidItems(slot, [{ ...item, url: "https://evil.example/x.png" }], base), /알아볼 수 없어요/);
  assert.match(invalidItems(slot, [{ ...item, key: "store/phone/1-abcdef12.png", url: `${base}/store/phone/1-abcdef12.png` }], base), /알아볼 수 없어요/);
  assert.match(invalidItems(slot, [{ ...item, width: 100 }], base), /512 x 512/);
});

test("주소와 키 도우미", () => {
  assert.equal(ascImageUrl("https://x/{w}x{h}bb.{f}", 300, 600), "https://x/300x600bb.png");
  assert.equal(draftKey("ios", "ko", "iphone"), "ios:ko:iphone");
  assert.equal(extOf("video/quicktime"), "mov");
  assert.equal(extOf("image/gif"), null);
  assert.equal(KEY_RE.test("strips/1-abcdef12.jpg"), false);
});
