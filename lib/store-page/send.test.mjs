import assert from "node:assert/strict";
import { test } from "node:test";
import { blockers, changesOf, imageBlockers, imageChangesOf, imagePlan, needsConfirm, signature } from "./send.ts";

const empty = { live: {}, pending: null };
const langs = (ko) => ({ ko, en: empty, ja: empty });
const d = (platform, lang, field, value) => ({ platform, lang, field, value, updatedBy: "a", updatedAt: "t" });
const ios = langs({ live: { name: "옛 이름", subtitle: "부제" }, pending: { name: "새 이름", subtitle: "부제", promotionalText: "" } });

test("초안과 스토어 값이 다른 칸만 바뀐다. 기준은 다음에 나갈 값이다", () => {
  const out = changesOf("ios", ios, [d("ios", "ko", "name", "더 새 이름"), d("ios", "ko", "subtitle", "부제"), d("android", "ko", "title", "다른 스토어")]);
  assert.equal(out.length, 1);
  assert.deepEqual([out[0].field, out[0].before, out[0].after], ["name", "새 이름", "더 새 이름"]);
});

test("글자 수 초과와 빈 이름은 막고, 경고는 막지 않는다", () => {
  const over = changesOf("ios", ios, [d("ios", "ko", "name", "가".repeat(31))]);
  assert.match(blockers("ios", ios, over).join(), /한국어 이름: 30자까지/);
  const warn = changesOf("ios", ios, [d("ios", "ko", "name", "경도 무료")]);
  assert.deepEqual(blockers("ios", ios, warn), []);
  const emptied = changesOf("ios", ios, [d("ios", "ko", "name", "")]);
  assert.match(blockers("ios", ios, emptied).join(), /비워 둘 수 없어요/);
});

test("잘못된 영상 주소는 막는다", () => {
  const play = langs({ live: { video: "https://youtu.be/4nLEws5Sk8A" }, pending: null });
  assert.match(blockers("android", play, changesOf("android", play, [d("android", "ko", "video", "https://example.com")])).join(), /YouTube/);
});

test("지문은 전, 후 값이 바뀌면 달라진다", () => {
  const a = changesOf("ios", ios, [d("ios", "ko", "name", "하나")]);
  const b = changesOf("ios", ios, [d("ios", "ko", "name", "둘")]);
  assert.notEqual(signature(a), signature(b));
  assert.equal(signature(a), signature(changesOf("ios", ios, [d("ios", "ko", "name", "하나")])));
  const moved = langs({ live: {}, pending: { name: "다른 사람이 바꾼 값" } });
  assert.notEqual(signature(a), signature(changesOf("ios", moved, [d("ios", "ko", "name", "하나")])));
});

test("사용자에게 바로 보이거나 심사에 들어가면 입력까지 받는다", () => {
  assert.equal(needsConfirm("ios", [{ field: "name" }]), false);
  assert.equal(needsConfirm("ios", [{ field: "promotionalText" }]), true);
  assert.equal(needsConfirm("android", [{ field: "title" }]), true);
});

const live = (id) => ({ kind: "live", id, url: `u/${id}` });
const shot = (key, width = 1320, height = 2868) => ({ kind: "new", key, url: `r2/${key}`, width, height, bytes: 100, type: "image/png", name: "a.png" });
const imgs = (slots) => ({ ko: slots, en: {}, ja: {} });
const ch = (before, after, slot = "iphone") => ({ lang: "ko", slot, label: "칸", before, after });
const draft = (slot, items, platform = "ios") => ({ platform, lang: "ko", slot, items, updatedBy: "a", updatedAt: "t" });

test("이미지는 스토어와 다른 칸만 바뀐다", () => {
  const images = imgs({ iphone: [live("a"), live("b")], ipad: [live("c")] });
  const out = imageChangesOf("ios", images, [draft("iphone", [live("b"), live("a")]), draft("ipad", [live("c")]), draft("phone", [], "android")]);
  assert.deepEqual(out.map((c) => c.slot), ["iphone"]);
});

test("뒤에 붙이기만 하면 순서를 따로 정하지 않는다", () => {
  const add = shot("store/iphone/1-aaaaaaaa.png");
  assert.deepEqual(imagePlan(ch([live("a"), live("b")], [live("a"), add])), { remove: ["b"], add: [add], inOrder: true });
  assert.equal(imagePlan(ch([live("a"), live("b")], [add, live("a"), live("b")])).inOrder, false);
  assert.equal(imagePlan(ch([live("a"), live("b")], [live("b"), live("a")])).inOrder, false);
});

test("그 사이 스토어에서 사라진 이미지와 빈 필수 칸, 규격이 어긋난 파일은 막는다", () => {
  const images = imgs({ iphone: [live("a")] });
  assert.match(imageBlockers("ios", images, [ch([live("a")], [live("gone")])]).join(), /스토어의 이미지가 바뀌었어요/);
  assert.match(imageBlockers("ios", images, [ch([live("a")], [])]).join(), /비워 둘 수 없어요/);
  assert.match(imageBlockers("ios", images, [ch([live("a")], [shot("store/iphone/1-aaaaaaaa.png", 1206, 2622)])]).join(), /1320 x 2868/);
  assert.deepEqual(imageBlockers("ios", images, [ch([live("a")], [shot("store/iphone/1-aaaaaaaa.png")])]), []);
});

test("Play 스크린샷은 기기를 합쳐 2장 이상이어야 한다", () => {
  const images = imgs({ phone: [live("a"), live("b")], tablet7: [] });
  assert.match(imageBlockers("android", images, [ch([live("a"), live("b")], [live("a")], "phone")]).join(), /2장 이상/);
  const withTablet = imgs({ phone: [live("a"), live("b")], tablet7: [live("t")] });
  assert.deepEqual(imageBlockers("android", withTablet, [ch([live("a"), live("b")], [live("a")], "phone")]), []);
});

test("지문은 이미지 순서가 바뀌면 달라진다", () => {
  const a = ch([live("a"), live("b")], [live("b"), live("a")]);
  const b = ch([live("a"), live("b")], [live("a")]);
  assert.notEqual(signature([], [a]), signature([], [b]));
  assert.equal(signature([], [a]), signature([], [ch([live("a"), live("b")], [live("b"), live("a")])]));
});
